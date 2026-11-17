import { randomUUID } from 'node:crypto';
import { HttpError } from './domain.mjs';
import { uuidPattern } from './domain.mjs';
import { uploadLimit,parseSpreadsheet } from './import-parser.mjs';

export async function readUpload(request) {
  if(request.headers['content-type']!=='application/octet-stream')throw new HttpError(415,'Envie um arquivo CSV ou XLSX.');
  const chunks=[];let size=0;
  for await(const chunk of request){size+=chunk.length;if(size>uploadLimit)throw new HttpError(413,'Envie um arquivo de até 2 MB.');chunks.push(chunk);}
  if(!size)throw new HttpError(400,'Selecione um arquivo.');
  return Buffer.concat(chunks);
}

async function parseUpload(bytes,filename) {
  try{return await parseSpreadsheet(bytes,filename);}catch(error){throw new HttpError(400,error.message||'Não foi possível ler a planilha.');}
}

export function createImporter({database,native}) {
  const {pool,schema,dataSchema:source}=database;
  async function classify(rows,client) {
    const existing=(await client.query(`SELECT bloco,andar,apartamento,regexp_replace(whatsapp,'[^0-9]','','g') AS phone FROM ${source}.moradores`)).rows;
    const unitKeys=new Set(existing.map(row=>JSON.stringify([row.bloco,row.andar,row.apartamento])));
    const phones=new Set(existing.map(row=>row.phone));
    return rows.map(row=>{
      if(row.status==='error')return row;
      const key=JSON.stringify([row.block,row.floor,row.apartment]);
      if(unitKeys.has(key)||phones.has(row.phone))return {...row,status:'skip',message:'Unidade ou WhatsApp já cadastrado. Nada será sobrescrito.'};
      unitKeys.add(key);phones.add(row.phone);return {...row,status:'valid',message:'Pronto para importar'};
    });
  }
  async function preview(request,session) {
    if(!await native.bound(pool,session.condominium_id))throw new HttpError(403,'Base não vinculada a este condomínio.');
    let filename;
    try{filename=decodeURIComponent(request.headers['x-file-name']||'');}catch{throw new HttpError(400,'Nome de arquivo inválido.');}
    if(filename.length>240||!/^.+\.(csv|xlsx)$/i.test(filename))throw new HttpError(400,'Selecione CSV ou XLSX.');
    const rows=await classify(await parseUpload(await readUpload(request),filename),pool);
    await pool.query(`DELETE FROM ${schema}.resident_imports WHERE expires_at<now()`);
    const counts={valid:rows.filter(row=>row.status==='valid').length,skip:rows.filter(row=>row.status==='skip').length,error:rows.filter(row=>row.status==='error').length};
    let batchId=null;
    if(!counts.error&&counts.valid){batchId=randomUUID();await pool.query(`INSERT INTO ${schema}.resident_imports(id,operator_id,condominium_id,payload,expires_at) VALUES($1,$2,$3,$4,now()+interval '15 minutes')`,[batchId,session.id,session.condominium_id,JSON.stringify(rows.filter(row=>row.status==='valid'))]);}
    return {rows,counts,batchId};
  }
  async function confirm(data,session) {
    if(!uuidPattern.test(data.batchId||'')||data.createUnits!==true)throw new HttpError(400,'Confirme a criação das unidades e dos moradores.');
    return native.transaction(async client=>{
      if(!await native.bound(client,session.condominium_id))throw new HttpError(403,'Base não vinculada.');
      const batch=(await client.query(`DELETE FROM ${schema}.resident_imports WHERE id=$1 AND operator_id=$2 AND condominium_id=$3 AND expires_at>now() RETURNING payload`,[data.batchId,session.id,session.condominium_id])).rows[0];
      if(!batch)throw new HttpError(409,'Prévia expirada ou já importada. Selecione o arquivo novamente.');
      const rows=await classify(batch.payload,client);
      let imported=0;let createdUnits=0;let skipped=0;
      for(const row of rows){
        if(row.status!=='valid'){skipped++;continue;}
        const inserted=await client.query(`INSERT INTO ${schema}.unit_registry(id,condominium_id,block,floor,apartment) VALUES($1,$2,$3,$4,$5) ON CONFLICT(condominium_id,block,floor,apartment) DO NOTHING RETURNING id`,[randomUUID(),session.condominium_id,row.block,row.floor,row.apartment]);
        createdUnits+=inserted.rowCount;
        const unit=(await client.query(`SELECT id FROM ${schema}.unit_registry WHERE condominium_id=$1 AND block=$2 AND floor=$3 AND apartment=$4`,[session.condominium_id,row.block,row.floor,row.apartment])).rows[0];
        await native.saveResident(session.condominium_id,{...row,unitId:unit.id},null,client);imported++;
      }
      return {imported,skipped,createdUnits};
    });
  }
  return {preview,confirm};
}
