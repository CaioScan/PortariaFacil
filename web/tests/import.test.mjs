import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpreadsheet, csvRows } from '../import-parser.mjs';
import { residentKey, decodeResidentKey } from '../native.mjs';

test('CSV com aspas, delimitadores, acentos, autorização e telefone',async()=>{
  const input='\uFEFFnome;bloco;andar;apartamento;whatsapp;ativo;autoriza_whatsapp\r\n"Pessoa; Teste";A;2;201;"(11) 98888-7777";sim;não\r\n';
  const rows=await parseSpreadsheet(Buffer.from(input),'teste.csv');
  assert.equal(rows[0].name,'Pessoa; Teste');
  assert.equal(rows[0].phone,'11988887777');
  assert.equal(rows[0].whatsappConsent,false);
  assert.equal(rows[0].floor,'2');
  assert.equal(rows[0].line,2);
  assert.equal(rows[0].status,'valid');
});
test('CSV com vírgula e erros por linha sem preencher dados por suposição',async()=>{
  const rows=await parseSpreadsheet(Buffer.from('nome,apartamento,whatsapp\nTeste,001,11988887777\nOutro,002,123\n'),'teste.csv');
  assert.equal(rows[0].apartment,'001');
  assert.equal(rows[1].status,'error');
  await assert.rejects(()=>parseSpreadsheet(Buffer.from('campo\nvalor'),'teste.csv'));
  assert.throws(()=>csvRows('nome;telefone\n"sem fechar',';'));
});
test('chave composta preserva bloco, andar e apartamento sem interpretação SQL',()=>{
  const row={bloco:'A',andar:'2',apartamento:'001'};
  assert.deepEqual(decodeResidentKey(residentKey(row)),['A','2','001']);
  assert.throws(()=>decodeResidentKey("' OR 1=1"));
});
