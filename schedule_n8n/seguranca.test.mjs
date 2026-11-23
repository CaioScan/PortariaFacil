import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { parseResposta, buscarEncomenda, registrarResposta } from './seguranca-encomendas.mjs';
import { createDatabase } from '../web/db.mjs';

const workflow = JSON.parse(await readFile(new URL('./assistent_service_n8n.json', import.meta.url), 'utf8'));
const node = name => workflow.nodes.find(item => item.name === name);
const senderA = '5511988887777';
const senderB = '5511977776666';
const parse = (texto, overrides = {}) => {
  const nodes = {
    'Normalizar Webhook': { chat_id: senderA + '@c.us', chamado_relato: texto, ...overrides },
    'Filtra Morador': { whatsapp: '11988887777', ativo: true, nome: 'Morador sintético A', bloco: 'A', andar: '1', apartamento: '101' },
  };
  return new Function('$', node('Parse_Encomenda_Resposta').parameters.jsCode)(name => ({ item: { json: nodes[name] } })).json;
};

test('export usa exatamente as queries e parser de segurança versionados', () => {
  assert.equal(node('Buscar Encomenda Pendente').parameters.query, buscarEncomenda);
  assert.equal(node('Registrar Evento Resposta').parameters.query, registrarResposta);
  assert.equal(node('Parse_Encomenda_Resposta').parameters.jsCode.replace(/\r\n/g,'\n'), 'return (' + parseResposta.toString().replace(/\r\n/g,'\n') + ')($);');
  assert.equal(workflow.active, false);
});

test('parser usa remetente do webhook e cadastro, nunca identidade ou código sugeridos por IA', () => {
  assert.equal(parse('RETIREI 1234').seletor, '1234');
  assert.equal(parse('RETIREI código 123456').seletor, '123456');
  assert.equal(parse('RETIREI 1234').acao, 'confirmar_retirada');
  assert.equal(parse('LI').acao, 'confirmar_leitura');
  for (const text of ['não recebi', 'não retirei', 'retirei a encomenda de outro morador', 'oi']) {
    const result = parse(text);
    assert.equal(result.comando_valido, false);
    assert.notEqual(result.acao, 'confirmar_retirada');
  }
  assert.throws(() => parse('RETIREI', { chat_id: senderB + '@c.us' }), /Remetente/);
  assert.throws(() => parse('RETIREI', { chat_id: '123@lid', chamado_responsavel_whatsapp: '123@lid' }), /Remetente/);
});

test('credenciais são externas e portas do Compose só escutam em loopback', async () => {
  const compose = await readFile(new URL('./docker-compose.yml', import.meta.url), 'utf8');
  for (const key of ['POSTGRES_PASSWORD','REDIS_PASSWORD','WHATSAPP_API_KEY','WAHA_DASHBOARD_PASSWORD']) {
    assert.ok(compose.includes('${' + key + ':?'));
  }
  const ports = compose.match(/- "[^"\n]+:\d+"/g);
  assert.equal(ports.length, 4);
  assert.ok(ports.every(port => port.startsWith('- "127.0.0.1:')));
  assert.equal(node('Baixar Imagem1').parameters.genericAuthType, 'httpHeaderAuth');
  assert.equal(node('Baixar Imagem1').parameters.headerParameters, undefined);
});

test('PostgreSQL: não cruza moradores, rejeita ambiguidade e revalida a retirada', { skip: !process.env.DATABASE_URL }, async t => {
  const schema = 'pf_sched_test_' + randomBytes(8).toString('hex');
  const { pool } = createDatabase();
  const query = (sql, parameters) => pool.query(sql.replaceAll('public.', schema + '.'), parameters);
  t.after(async () => {
    if (!/^pf_sched_test_[a-f0-9]{16}$/.test(schema)) throw new Error('Schema inválido');
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool.end();
  });
  await pool.query(`CREATE SCHEMA ${schema};
    CREATE TABLE ${schema}.moradores(bloco text,andar text,apartamento text,whatsapp text,ativo boolean);
    CREATE TABLE ${schema}.encomendas(protocolo uuid,codigo_retirada text,status text,destinatario_nome text,
      morador_bloco text,morador_andar text,morador_apartamento text,data_retirada timestamptz,updated_at timestamptz);`);
  await pool.query(`INSERT INTO ${schema}.moradores VALUES('A','1','101','11988887777',true),('B','1','101','11977776666',true)`);
  const protocolB = randomUUID();
  const insert = (protocol, block, code) => pool.query(`INSERT INTO ${schema}.encomendas(protocolo,codigo_retirada,status,morador_bloco,morador_andar,morador_apartamento) VALUES($1,$2,'AGUARDANDO_RETIRADA',$3,'1','101')`, [protocol,code,block]);
  const find = (sender, selector = '', valid = true) => query(buscarEncomenda, [sender,selector,valid]);
  const withdraw = (protocol, sender, code) => query(registrarResposta, [protocol,'confirmar_retirada',sender,code]);
  await insert(protocolB,'B','2222');
  assert.equal((await find(senderA)).rows[0].protocolo, '');
  assert.equal((await withdraw(protocolB,senderA,'2222')).rowCount, 0);
  assert.equal((await find(senderB)).rows[0].protocolo, protocolB);
  const protocolA = randomUUID();
  await insert(protocolA,'A','1111');
  assert.equal((await find(senderA)).rows[0].protocolo, protocolA);
  assert.equal((await find(senderA, '2222')).rows[0].protocolo, '');
  assert.equal((await find(senderA, '', false)).rows[0].protocolo, '');
  const otherA = randomUUID();
  await insert(otherA,'A','3333');
  assert.equal((await find(senderA)).rows[0].protocolo, '');
  assert.equal((await find(senderA,'1111')).rows[0].protocolo, protocolA);
  assert.equal((await find(senderA,otherA)).rows[0].protocolo, otherA);
  assert.equal((await withdraw(protocolA,senderA,'9999')).rowCount, 0);
  await pool.query(`UPDATE ${schema}.moradores SET ativo=false WHERE bloco='A'`);
  assert.equal((await withdraw(protocolA,senderA,'1111')).rowCount, 0);
  await pool.query(`UPDATE ${schema}.moradores SET ativo=true WHERE bloco='A'`);
  const parallel = await Promise.all([withdraw(protocolA,senderA,'1111'),withdraw(protocolA,senderA,'1111')]);
  assert.equal(parallel.reduce((sum,result)=>sum+result.rowCount,0), 1);
  assert.equal((await pool.query(`SELECT status FROM ${schema}.encomendas WHERE protocolo=$1`,[protocolB])).rows[0].status,'AGUARDANDO_RETIRADA');
  await insert(randomUUID(),'A','3333');
  assert.equal((await find(senderA,'3333')).rows[0].protocolo, '');
});
