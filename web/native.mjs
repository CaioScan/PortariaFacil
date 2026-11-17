import { randomUUID, randomInt } from 'node:crypto';
import { HttpError, text, email, phone, boolean } from './domain.mjs';

export const residentKey = row => Buffer.from(JSON.stringify([row.bloco, row.andar, row.apartamento])).toString('base64url');
export function decodeResidentKey(key) {
  try {
    if (key.length > 180 || !/^[A-Za-z0-9_-]+$/.test(key)) throw new Error();
    const parts = JSON.parse(Buffer.from(key, 'base64url').toString());
    if (!Array.isArray(parts) || parts.length !== 3 || parts.some(part => typeof part !== 'string' || part.length > 20)) throw new Error();
    return parts;
  } catch { throw new HttpError(400, 'Identificação do morador inválida.'); }
}

export async function prepareNativeDatabase({ pool, schema, dataSchema }) {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS ${dataSchema};
    CREATE TABLE IF NOT EXISTS ${dataSchema}.moradores (
      bloco varchar(20) NOT NULL, andar varchar(20) NOT NULL, apartamento varchar(20) NOT NULL,
      nome varchar(150) NOT NULL, whatsapp varchar(20) UNIQUE NOT NULL, endereco varchar(255), complemento varchar(100),
      ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(bloco,andar,apartamento)
    );
    CREATE TABLE IF NOT EXISTS ${dataSchema}.responsaveis (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nome varchar(150) NOT NULL,whatsapp varchar(20) UNIQUE NOT NULL,
      chat_id varchar(50),cargo varchar(50) DEFAULT 'PORTEIRO',ativo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ${dataSchema}.encomendas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),morador_bloco varchar(20),morador_andar varchar(20),morador_apartamento varchar(20),
      protocolo uuid UNIQUE NOT NULL,codigo_retirada varchar(10) NOT NULL,status varchar(30) NOT NULL DEFAULT 'AGUARDANDO_RETIRADA',
      destinatario_nome varchar(150),destinatario_apartamento varchar(20),destinatario_bloco varchar(20),destinatario_andar varchar(20),
      destinatario_endereco varchar(255),dados_remetente varchar(255),media_url text,imagem_legivel boolean NOT NULL DEFAULT false,
      data_recebimento timestamptz NOT NULL DEFAULT now(),data_retirada timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY(morador_bloco,morador_andar,morador_apartamento) REFERENCES ${dataSchema}.moradores(bloco,andar,apartamento) ON UPDATE CASCADE ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS ${schema}.native_binding (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),condominium_id uuid NOT NULL REFERENCES ${schema}.condominiums(id));
    CREATE TABLE IF NOT EXISTS ${schema}.unit_registry (
      id uuid PRIMARY KEY,condominium_id uuid NOT NULL REFERENCES ${schema}.condominiums(id),block varchar(20) NOT NULL DEFAULT '',
      floor varchar(20) NOT NULL DEFAULT '',apartment varchar(20) NOT NULL,UNIQUE(condominium_id,block,floor,apartment)
    );
    CREATE TABLE IF NOT EXISTS ${schema}.resident_contacts (source_key text PRIMARY KEY,email text NOT NULL DEFAULT '',whatsapp_consent boolean NOT NULL DEFAULT false);
    CREATE TABLE IF NOT EXISTS ${schema}.delivery_details (delivery_id uuid PRIMARY KEY,description text NOT NULL,tracking_code text NOT NULL DEFAULT '',created_by uuid NOT NULL REFERENCES ${schema}.operators(id),received_by text,delivered_by uuid REFERENCES ${schema}.operators(id));
    CREATE TABLE IF NOT EXISTS ${schema}.manager_links (operator_id uuid PRIMARY KEY REFERENCES ${schema}.operators(id) ON DELETE CASCADE,responsible_id uuid UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS ${schema}.resident_imports (id uuid PRIMARY KEY,operator_id uuid NOT NULL REFERENCES ${schema}.operators(id) ON DELETE CASCADE,condominium_id uuid NOT NULL REFERENCES ${schema}.condominiums(id),payload jsonb NOT NULL,expires_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS ${schema}.data_migrations (name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS ${dataSchema}.chamados (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),morador_bloco varchar(20),morador_andar varchar(20),morador_apartamento varchar(20),
      protocolo uuid UNIQUE NOT NULL,status varchar(30) NOT NULL DEFAULT 'ABERTO',relato_morador text,resumo text,
      responsavel_whatsapp varchar(20),responsavel_chat_id varchar(50),dados_faltantes text,mensagem_resposta text,
      data_abertura timestamptz NOT NULL DEFAULT now(),data_fechamento timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY(morador_bloco,morador_andar,morador_apartamento) REFERENCES ${dataSchema}.moradores(bloco,andar,apartamento) ON UPDATE CASCADE ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS ${schema}.call_details (call_id uuid PRIMARY KEY,location text NOT NULL DEFAULT '',resolution text NOT NULL DEFAULT '',created_by uuid REFERENCES ${schema}.operators(id),updated_by uuid REFERENCES ${schema}.operators(id));
    CREATE TABLE IF NOT EXISTS ${schema}.call_history (id uuid PRIMARY KEY,call_id uuid NOT NULL,operator_id uuid NOT NULL REFERENCES ${schema}.operators(id),status text NOT NULL,note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
  `);
}

export function createNativeRepository(database) {
  const { pool, schema, dataSchema: source } = database;
  const bound = async (client, condo) => (await client.query(`SELECT 1 FROM ${schema}.native_binding WHERE condominium_id=$1`, [condo])).rowCount > 0;
  const requireBinding = async (client, condo) => { if (!await bound(client,condo)) throw new HttpError(404,'Base de moradores não vinculada a este condomínio.'); };
  const existing = result => { if (!result.rowCount) throw new HttpError(404,'Cadastro não encontrado.'); return result.rows[0]; };
  async function units(condo, client = pool) {
    if (!await bound(client,condo)) return [];
    await client.query(`INSERT INTO ${schema}.unit_registry(id,condominium_id,block,floor,apartment)
      SELECT gen_random_uuid(),$1,bloco,andar,apartamento FROM ${source}.moradores ON CONFLICT(condominium_id,block,floor,apartment) DO NOTHING`, [condo]);
    return (await client.query(`SELECT *,concat_ws(' · ',nullif(block,''),CASE WHEN floor='' THEN NULL ELSE floor||'º andar' END,apartment) AS label FROM ${schema}.unit_registry WHERE condominium_id=$1 ORDER BY block,floor,apartment`,[condo])).rows;
  }
  async function residents(condo) {
    if (!await bound(pool,condo)) return [];
    await units(condo);
    const rows = (await pool.query(`SELECT m.*,u.id AS unit_id,concat_ws(' · ',nullif(m.bloco,''),CASE WHEN m.andar='' THEN NULL ELSE m.andar||'º andar' END,m.apartamento) AS unit_label
      FROM ${source}.moradores m JOIN ${schema}.unit_registry u ON u.block=m.bloco AND u.floor=m.andar AND u.apartment=m.apartamento WHERE u.condominium_id=$1 ORDER BY m.ativo DESC,m.nome`,[condo])).rows;
    const preferences = new Map((await pool.query(`SELECT * FROM ${schema}.resident_contacts`)).rows.map(row=>[row.source_key,row]));
    return rows.map(row => ({ ...row,id:residentKey(row),name:row.nome,phone:row.whatsapp,block:row.bloco,floor:row.andar,apartment:row.apartamento,
      address:row.endereco || '',complement:row.complemento || '',active:row.ativo,email:preferences.get(residentKey(row))?.email || '',whatsapp_consent:preferences.get(residentKey(row))?.whatsapp_consent || false }));
  }
  async function saveResident(condo,data,id,client = pool) {
    await requireBinding(client,condo);
    const unit = existing(await client.query(`SELECT * FROM ${schema}.unit_registry WHERE id=$1 AND condominium_id=$2`,[data.unitId,condo]));
    const name = text(data.name,'Nome',{max:150});
    const contact = phone(data.phone);
    const address = text(data.address,'Endereço',{max:255,optional:true});
    const complement = text(data.complement,'Complemento',{max:100,optional:true});
    const active = boolean(data.active,'Status');
    const consent = boolean(data.whatsappConsent,'Autorização');
    const contactEmail = email(data.email,true);
    const keyBefore=id?decodeResidentKey(id):null;
    const duplicate=await client.query(`SELECT bloco,andar,apartamento FROM ${source}.moradores WHERE regexp_replace(whatsapp,'[^0-9]','','g')=$1`,[contact]);
    if(duplicate.rows.some(row=>!keyBefore||row.bloco!==keyBefore[0]||row.andar!==keyBefore[1]||row.apartamento!==keyBefore[2]))throw new HttpError(409,'Este WhatsApp já está cadastrado para outro morador.');
    let result;
    if (id) {
      const key = decodeResidentKey(id);
      result = await client.query(`UPDATE ${source}.moradores SET bloco=$1,andar=$2,apartamento=$3,nome=$4,whatsapp=$5,endereco=$6,complemento=$7,ativo=$8,updated_at=now() WHERE bloco=$9 AND andar=$10 AND apartamento=$11 RETURNING *`,[unit.block,unit.floor,unit.apartment,name,contact,address,complement,active,...key]);
    } else result = await client.query(`INSERT INTO ${source}.moradores(bloco,andar,apartamento,nome,whatsapp,endereco,complemento,ativo) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[unit.block,unit.floor,unit.apartment,name,contact,address,complement,active]);
    const row = existing(result);
    const newId = residentKey(row);
    if (id && newId !== id) await client.query(`DELETE FROM ${schema}.resident_contacts WHERE source_key=$1`,[id]);
    await client.query(`INSERT INTO ${schema}.resident_contacts(source_key,email,whatsapp_consent) VALUES($1,$2,$3) ON CONFLICT(source_key) DO UPDATE SET email=EXCLUDED.email,whatsapp_consent=EXCLUDED.whatsapp_consent`,[newId,contactEmail,consent]);
    return { ...row,id:newId,name:row.nome,whatsapp_consent:consent };
  }
  async function transaction(callback) {
    const client = await pool.connect();
    try { await client.query('BEGIN'); await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,[`${source}:moradores-web`]); const result=await callback(client); await client.query('COMMIT'); return result; }
    catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  async function handle({entity,id,action,method,data,session}) {
    const condo=session.condominium_id;
    if(entity==='calls') {
      if(!await bound(pool,condo)){if(method==='GET')return {value:[]};throw new HttpError(404,'Registro não encontrado.');}
      if(method==='GET'&&!id)return {value:(await pool.query(`SELECT c.*,m.nome AS resident_name,
        concat_ws(' · ',nullif(c.morador_bloco,''),CASE WHEN coalesce(c.morador_andar,'')='' THEN NULL ELSE c.morador_andar||'º andar' END,c.morador_apartamento) AS unit_label,
        r.nome AS responsible_name,r.id AS responsible_id,coalesce(d.location,'') AS location,coalesce(d.resolution,'') AS resolution
        FROM ${source}.chamados c LEFT JOIN ${source}.moradores m ON m.bloco=c.morador_bloco AND m.andar=c.morador_andar AND m.apartamento=c.morador_apartamento
        LEFT JOIN ${source}.responsaveis r ON r.whatsapp=c.responsavel_whatsapp LEFT JOIN ${schema}.call_details d ON d.call_id=c.id
        ORDER BY c.data_abertura DESC LIMIT 500`)).rows};
      if(method==='GET'&&id)return {value:(await pool.query(`SELECT h.status,h.note,h.created_at,o.name AS operator_name FROM ${schema}.call_history h JOIN ${schema}.operators o ON o.id=h.operator_id WHERE h.call_id=$1 ORDER BY h.created_at`,[id])).rows};
      if(['POST','PUT'].includes(method)&&(method==='POST'?!id:Boolean(id)))return transaction(async client=>{
        const description=text(data.description,'Descrição',{max:4000});
        const location=text(data.location,'Local',{max:200});
        let responsible=null;
        if(data.responsibleId)responsible=existing(await client.query(`SELECT * FROM ${source}.responsaveis WHERE id=$1 AND ativo`,[data.responsibleId]));
        const statuses=['ABERTO','EM_ANDAMENTO','RESOLVIDO','CANCELADO'];
        const status=id?data.status:'ABERTO';
        if(!statuses.includes(status))throw new HttpError(400,'Status de chamado inválido.');
        const resolution=text(data.resolution,'Solução ou justificativa',{max:4000,optional:!['RESOLVIDO','CANCELADO'].includes(status)});
        if(['EM_ANDAMENTO','RESOLVIDO'].includes(status)&&!responsible)throw new HttpError(400,'Selecione um responsável ativo para o atendimento.');
        let row;
        if(id){
          const previous=existing(await client.query(`SELECT * FROM ${source}.chamados WHERE id=$1 FOR UPDATE`,[id]));
          if(['RESOLVIDO','CANCELADO'].includes(previous.status)&&status==='ABERTO'&&!String(data.reopenReason||'').trim())throw new HttpError(400,'Informe o motivo da reabertura.');
          if(['RESOLVIDO','CANCELADO'].includes(previous.status)&&!['ABERTO',previous.status].includes(status))throw new HttpError(409,'Reabra o chamado antes de iniciar outro atendimento.');
          row=(await client.query(`UPDATE ${source}.chamados SET relato_morador=$1,status=$2::varchar,responsavel_whatsapp=$3,responsavel_chat_id=$4,
            data_fechamento=CASE WHEN $2::varchar IN ('RESOLVIDO','CANCELADO') THEN coalesce(data_fechamento,now()) ELSE NULL END,updated_at=now() WHERE id=$5 RETURNING *`,[description,status,responsible?.whatsapp||null,responsible?.chat_id||null,id])).rows[0];
        }else{
          const key=data.residentId?decodeResidentKey(data.residentId):[null,null,null];
          if(data.residentId)existing(await client.query(`SELECT 1 FROM ${source}.moradores WHERE bloco=$1 AND andar=$2 AND apartamento=$3 AND ativo`,key));
          row=(await client.query(`INSERT INTO ${source}.chamados(id,protocolo,morador_bloco,morador_andar,morador_apartamento,relato_morador,responsavel_whatsapp,responsavel_chat_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[randomUUID(),randomUUID(),...key,description,responsible?.whatsapp||null,responsible?.chat_id||null])).rows[0];
        }
        await client.query(`INSERT INTO ${schema}.call_details(call_id,location,resolution,created_by,updated_by) VALUES($1,$2,$3,$4,$4) ON CONFLICT(call_id) DO UPDATE SET location=$2,resolution=$3,updated_by=$4`,[row.id,location,resolution,session.id]);
        await client.query(`INSERT INTO ${schema}.call_history(id,call_id,operator_id,status,note) VALUES($1,$2,$3,$4,$5)`,[randomUUID(),row.id,session.id,status,data.reopenReason?text(data.reopenReason,'Motivo da reabertura',{max:1000}):resolution||'Registro atualizado']);
        return {status:id?200:201,value:row};
      });
    }
    if (entity==='units') {
      if(method==='GET'&&!id) return {value:await units(condo)};
      await requireBinding(pool,condo);
      if(method==='POST'&&!id) {
        const block=text(data.block,'Bloco',{max:20,optional:true});
        const floor=text(data.floor,'Andar',{max:20,optional:true});
        const apartment=text(data.apartment,'Apartamento',{max:20});
        return {status:201,value:(await pool.query(`INSERT INTO ${schema}.unit_registry(id,condominium_id,block,floor,apartment) VALUES($1,$2,$3,$4,$5) RETURNING *`,[randomUUID(),condo,block,floor,apartment])).rows[0]};
      }
      if(method==='DELETE'&&id) {
        return transaction(async client=>{
          const unit=existing(await client.query(`SELECT * FROM ${schema}.unit_registry WHERE id=$1 AND condominium_id=$2 FOR UPDATE`,[id,condo]));
          if((await client.query(`SELECT 1 FROM ${source}.moradores WHERE bloco=$1 AND andar=$2 AND apartamento=$3`,[unit.block,unit.floor,unit.apartment])).rowCount) throw new HttpError(409,'A unidade possui morador cadastrado.');
          await client.query(`DELETE FROM ${schema}.unit_registry WHERE id=$1`,[id]);
          return {value:{ok:true}};
        });
      }
    }
    if(entity==='residents') {
      if(method==='GET'&&!id)return {value:await residents(condo)};
      if(['POST','PUT'].includes(method)&&(method==='POST'?!id:Boolean(id)))return transaction(async client=>({status:id?200:201,value:await saveResident(condo,data,id,client)}));
      if(method==='DELETE'&&id)return transaction(async client=>{
        await requireBinding(client,condo);const key=decodeResidentKey(id);
        existing(await client.query(`SELECT 1 FROM ${source}.moradores WHERE bloco=$1 AND andar=$2 AND apartamento=$3 FOR UPDATE`,key));
        const history=(await client.query(`SELECT EXISTS(SELECT 1 FROM ${source}.encomendas WHERE morador_bloco=$1 AND morador_andar=$2 AND morador_apartamento=$3) AS found`,key)).rows[0].found;
        const callsTable=(await client.query('SELECT to_regclass($1) AS table_name',[`${source}.chamados`])).rows[0].table_name;
        const calls=callsTable&&(await client.query(`SELECT 1 FROM ${source}.chamados WHERE morador_bloco=$1 AND morador_andar=$2 AND morador_apartamento=$3 LIMIT 1`,key)).rowCount;
        if(history||calls)throw new HttpError(409,'Morador com histórico de encomendas ou chamados. Desative o cadastro para preservar os vínculos.');
        await client.query(`DELETE FROM ${source}.moradores WHERE bloco=$1 AND andar=$2 AND apartamento=$3`,key);
        await client.query(`DELETE FROM ${schema}.resident_contacts WHERE source_key=$1`,[id]);return {value:{ok:true}};
      });
    }
    if(entity==='deliveries') {
      if(!await bound(pool,condo)){if(method==='GET')return {value:[]};throw new HttpError(404,'Registro não encontrado.');}
      if(method==='GET'&&!id)return {value:(await pool.query(`SELECT e.*,e.protocolo AS reference,e.destinatario_nome AS resident_name,
        concat_ws(' · ',nullif(e.destinatario_bloco,''),CASE WHEN coalesce(e.destinatario_andar,'')='' THEN NULL ELSE e.destinatario_andar||'º andar' END,e.destinatario_apartamento) AS unit_label,
        e.dados_remetente AS carrier,coalesce(d.description,'Encomenda registrada pela integração') AS description,d.tracking_code,
        CASE WHEN e.status='RETIRADA' THEN 'delivered' ELSE 'pending' END AS status,e.status AS source_status,e.data_recebimento AS created_at,
        e.data_retirada AS delivered_at,d.received_by,coalesce(o.name,'Integração') AS operator_name
        FROM ${source}.encomendas e LEFT JOIN ${schema}.delivery_details d ON d.delivery_id=e.id LEFT JOIN ${schema}.operators o ON o.id=d.created_by ORDER BY e.data_recebimento DESC LIMIT 500`)).rows};
      if(method==='POST'&&!id)return transaction(async client=>{
        const key=decodeResidentKey(data.residentId||'');const resident=existing(await client.query(`SELECT * FROM ${source}.moradores WHERE bloco=$1 AND andar=$2 AND apartamento=$3 AND ativo FOR UPDATE`,key));
        const description=text(data.description,'Descrição',{max:500});const carrier=text(data.carrier,'Transportadora',{max:255,optional:true});const tracking=text(data.trackingCode,'Rastreio',{max:120,optional:true});
        const deliveryId=randomUUID();const protocol=randomUUID();
        const result=await client.query(`INSERT INTO ${source}.encomendas(id,morador_bloco,morador_andar,morador_apartamento,protocolo,codigo_retirada,destinatario_nome,destinatario_apartamento,destinatario_bloco,destinatario_andar,destinatario_endereco,dados_remetente) VALUES($1,$2,$3,$4,$5,$6,$7,$4,$2,$3,$8,$9) RETURNING *`,[deliveryId,...key,protocol,String(randomInt(100000,1000000)),resident.nome,resident.endereco,carrier]);
        await client.query(`INSERT INTO ${schema}.delivery_details(delivery_id,description,tracking_code,created_by) VALUES($1,$2,$3,$4)`,[deliveryId,description,tracking,session.id]);
        return {status:201,value:{...result.rows[0],status:'pending',resident_name:resident.nome,unit_label:[resident.bloco,resident.andar?resident.andar+'º andar':'',resident.apartamento].filter(Boolean).join(' · ')}};
      });
      if(method==='POST'&&id&&action==='finalize')return transaction(async client=>{
        const receivedBy=text(data.receivedBy,'Quem retirou',{max:120});
        const result=await client.query(`UPDATE ${source}.encomendas SET status='RETIRADA',data_retirada=now(),updated_at=now() WHERE id=$1 AND status='AGUARDANDO_RETIRADA' RETURNING *`,[id]);
        if(!result.rowCount)throw new HttpError(409,'Encomenda não encontrada ou já retirada. Atualize a lista.');
        await client.query(`INSERT INTO ${schema}.delivery_details(delivery_id,description,created_by,received_by,delivered_by) VALUES($1,'Encomenda da integração',$2,$3,$2) ON CONFLICT(delivery_id) DO UPDATE SET received_by=$3,delivered_by=$2`,[id,session.id,receivedBy]);
        return {value:{...result.rows[0],status:'delivered',delivered_at:result.rows[0].data_retirada,received_by:receivedBy}};
      });
    }
    throw new HttpError(405,'Ação não disponível.');
  }
  return {handle,units,residents,saveResident,transaction,bound};
}
