import { readSheet } from 'read-excel-file/universal';
import { text, email, phone, HttpError } from './domain.mjs';

export const uploadLimit = 2 * 1024 * 1024;
const headers = new Map(Object.entries({ nome:'name',name:'name',bloco:'block',block:'block',andar:'floor',floor:'floor',apartamento:'apartment',unidade:'apartment',apartment:'apartment',whatsapp:'phone',telefone:'phone',phone:'phone',email:'email',endereco:'address',address:'address',complemento:'complement',ativo:'active',active:'active',autoriza_whatsapp:'whatsappConsent',whatsapp_consent:'whatsappConsent' }));
const cleanHeader = value => String(value??'').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[ -]/g,'_');

export function csvRows(content, delimiter) {
  const rows=[];let row=[];let value='';let quoted=false;let closed=false;
  for(let index=0;index<content.length;index++) {
    const char=content[index];
    if(quoted) {
      if(char==='"'&&content[index+1]==='"'){value+='"';index++;}
      else if(char==='"'){quoted=false;closed=true;}else value+=char;
    }else if(char==='"') {
      if(value||closed)throw new Error('Aspas inválidas no CSV.');
      quoted=true;
    }else if(char===delimiter){row.push(value);value='';closed=false;}
    else if(char==='\n'||char==='\r') {
      if(char==='\r'&&content[index+1]==='\n')index++;
      row.push(value);rows.push(row);row=[];value='';closed=false;
    }else {if(closed&&char.trim())throw new Error('CSV inválido após aspas.');value+=char;}
    if(rows.length>501)throw new Error('Envie até 500 moradores por arquivo.');
  }
  if(quoted)throw new Error('Aspas não fechadas no CSV.');
  if(value||row.length){row.push(value);rows.push(row);}
  return rows;
}

function flag(value, fallback) {
  if(value===undefined||value===null||value==='')return fallback;
  if(typeof value==='boolean')return value;
  const input=String(value).trim().toLowerCase();
  if(['sim','true','1','s','ativo'].includes(input))return true;
  if(['nao','não','false','0','n','inativo'].includes(input))return false;
  throw new Error('Use sim ou não nas colunas de autorização/status.');
}

export function normalizeRows(rows) {
  if(!rows?.length)throw new Error('A planilha está vazia.');
  if(rows.length>501)throw new Error('Envie até 500 moradores por arquivo.');
  const columns=rows[0].map(value=>headers.get(cleanHeader(value)));
  if(!['name','phone','apartment'].every(name=>columns.includes(name)))throw new Error('Cabeçalho obrigatório: nome, apartamento e whatsapp. Use o modelo.');
  const used=columns.filter(Boolean);
  if(new Set(used).size!==used.length)throw new Error('Há colunas repetidas no cabeçalho.');
  const result=[];
  for(let index=1;index<rows.length;index++) {
    if(rows[index].every(value=>value===null||String(value).trim()===''))continue;
    const data=Object.fromEntries(columns.flatMap((column,columnIndex)=>column?[[column,rows[index][columnIndex]]]:[]));
    try {
      const string=value=>value===undefined||value===null?'':String(value).trim();
      const normalized={name:text(string(data.name),'Nome',{max:150}),block:text(string(data.block),'Bloco',{max:20,optional:true}),floor:text(string(data.floor),'Andar',{max:20,optional:true}),apartment:text(string(data.apartment),'Apartamento',{max:20}),phone:phone(string(data.phone)),email:email(string(data.email),true),address:text(string(data.address),'Endereço',{max:255,optional:true}),complement:text(string(data.complement),'Complemento',{max:100,optional:true}),active:flag(data.active,true),whatsappConsent:flag(data.whatsappConsent,false)};
      result.push({line:index+1,...normalized,status:'valid',message:'Pronto para importar'});
    }catch(error){result.push({line:index+1,name:String(data.name??'').slice(0,150),status:'error',message:error.message});}
  }
  if(!result.length)throw new Error('A planilha não contém moradores.');
  return result;
}

export async function parseSpreadsheet(buffer, filename) {
  if(buffer.length>uploadLimit)throw new Error('Arquivo maior que 2 MB.');
  if(filename.toLowerCase().endsWith('.xlsx')) {
    if(buffer.readUInt16LE(0)!==0x4b50)throw new Error('Arquivo Excel inválido. Use .xlsx.');
    return normalizeRows(await readSheet(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),{sheet:1}));
  }
  if(!filename.toLowerCase().endsWith('.csv'))throw new Error('Selecione um arquivo CSV ou XLSX.');
  let content;
  try {content=new TextDecoder('utf-8',{fatal:true}).decode(buffer).replace(/^\uFEFF/,'');}
  catch {throw new Error('Salve o CSV como UTF-8 ou envie o Excel .xlsx.');}
  for(const delimiter of [';',',','\t']) {
    let rows;
    try {rows=csvRows(content,delimiter);}catch(error){if(delimiter===';')continue;throw error;}
    if(rows[0]?.length>1)return normalizeRows(rows);
  }
  throw new Error('Não foi possível ler as colunas. Baixe o modelo CSV.');
}
