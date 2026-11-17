import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createDatabase, migrate } from '../db.mjs';
import { createWebServer } from '../server.mjs';
import { hashPassword } from '../domain.mjs';
import { prepareNativeDatabase } from '../native.mjs';

test('PostgreSQL: cadastros, retirada, sessões e isolamento de condomínios', { skip: !process.env.DATABASE_URL }, async t => {
  const testSchema = `pf_test_${randomBytes(8).toString('hex')}`;
  const db = createDatabase({ ...process.env, DATABASE_SCHEMA: testSchema, DATA_SCHEMA:testSchema });
  let server;
  t.after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    if (!/^pf_test_[a-f0-9]{16}$/.test(testSchema)) throw new Error('Schema de teste inválido.');
    await db.pool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
    await db.pool.end();
  });
  await migrate(db);
  await migrate(db);
  await prepareNativeDatabase(db);
  const schema = db.schema;
  const condo = randomUUID();
  const otherCondo = randomUUID();
  const loginPassword = 'Acesso-teste-123456';
  const hash = await hashPassword(loginPassword);
  await db.pool.query(`INSERT INTO ${schema}.condominiums(id,code,name) VALUES($1,'teste','Condomínio teste'),($2,'outro','Outro condomínio')`, [condo,otherCondo]);
  await db.pool.query(`INSERT INTO ${schema}.native_binding(singleton,condominium_id) VALUES(true,$1)`,[condo]);
  await db.pool.query(`INSERT INTO ${schema}.operators(id,condominium_id,name,email,role,password_hash) VALUES($1,$2,'Admin teste','admin@example.test','admin',$3),($4,$5,'Outro admin','outro@example.test','admin',$3)`, [randomUUID(),condo,hash,randomUUID(),otherCondo]);
  server = createWebServer({ database: db });
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const origin = 'http://127.0.0.1:4180';
  const call = async (path, { method = 'GET', data, auth, headers = {} } = {}) => {
    const response = await fetch(base + path, { method, headers: {
      Origin: origin, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(auth ? { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf } : {}), ...headers,
    }, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: response.status, value: await response.json(), cookie: response.headers.get('set-cookie') };
  };
  const login = async address => {
    const result = await call('/api/login', { method: 'POST', data: { email: address, password: loginPassword } });
    assert.equal(result.status, 200);
    assert.match(result.cookie, /HttpOnly/);
    assert.match(result.cookie, /SameSite=Strict/);
    const auth = { cookie: result.cookie.split(';')[0] };
    auth.csrf = (await call('/api/me', { auth })).value.csrf_token;
    return auth;
  };
  const admin = await login('admin@example.test');
  const other = await login('outro@example.test');
  let unit;
  let resident;
  let delivery;
  let manager;
  let managerAuth;

  await t.test('bloqueia acesso anônimo, origem externa e CSRF ausente', async () => {
    assert.equal((await call('/api/residents')).status, 401);
    assert.equal((await call('/api/units', { method: 'POST', data: {}, auth: admin, headers: { Origin: 'https://fora.example' } })).status, 403);
    assert.equal((await call('/api/units', { method: 'POST', data: {}, auth: admin, headers: { 'X-CSRF-Token': '' } })).status, 403);
    assert.equal((await call('/api/login', { method: 'POST', data: { email: 'admin@example.test', password: 'errada' } })).status, 401);
  });
  await t.test('cria unidade, evita duplicação e cadastra/edita morador', async () => {
    const result = await call('/api/units', { method: 'POST', auth: admin, data: { block: 'A', apartment: '101' } });
    assert.equal(result.status, 201);
    unit = result.value;
    assert.equal((await call('/api/units', { method: 'POST', auth: admin, data: { block: 'A', apartment: '101' } })).status, 409);
    const created = await call('/api/residents', { method: 'POST', auth: admin, data: { name: 'Morador fictício', email: '', phone: '11999998888', unitId: unit.id, active: true, whatsappConsent: false } });
    assert.equal(created.status, 201);
    resident = created.value;
    const edited = await call(`/api/residents/${resident.id}`, { method: 'PUT', auth: admin, data: { name: 'Morador teste editado', email: 'morador@example.test', phone: '11999998888', unitId: unit.id, active: true, whatsappConsent: true } });
    assert.equal(edited.status, 200);
    assert.equal(edited.value.name, 'Morador teste editado');
    assert.equal(edited.value.whatsapp_consent, true);
    assert.equal((await call(`/api/units/${unit.id}`, { method: 'DELETE', auth: admin })).status, 409);
  });
  await t.test('outro condomínio não consulta nem altera os registros', async () => {
    assert.deepEqual((await call('/api/residents', { auth: other })).value, []);
    assert.equal((await call('/api/residents', { method: 'POST', auth: other, data: { name: 'Tentativa', email: '', phone: '11999998888', unitId: unit.id, active: true, whatsappConsent: false } })).status, 404);
    assert.equal((await call(`/api/residents/${resident.id}`, { method: 'DELETE', auth: other })).status, 404);
    assert.equal((await call('/api/deliveries', { method: 'POST', auth: other, data: { residentId: resident.id, description: 'Tentativa' } })).status, 404);
  });
  await t.test('CRUD de síndico e permissão limitada', async () => {
    const created = await call('/api/managers', { method: 'POST', auth: admin, data: { name: 'Síndico teste', email: 'sindico@example.test', phone: '11911112222', active: true, password: loginPassword } });
    assert.equal(created.status, 201);
    assert.equal(created.value.password_hash, undefined);
    manager = created.value;
    managerAuth = await login('sindico@example.test');
    assert.equal((await call('/api/residents', { auth: managerAuth })).status, 200);
    assert.equal((await call('/api/managers', { auth: managerAuth })).status, 403);
    assert.equal((await call(`/api/managers/${manager.id}`, { method: 'PUT', auth: admin, data: { name: 'Síndico atualizado', email: 'sindico@example.test', phone: '11911112222', active: true, password: '' } })).status, 200);
    assert.equal((await db.pool.query(`SELECT cargo FROM ${schema}.responsaveis WHERE id=$1`,[manager.id])).rows[0].cargo,'SINDICO');
  });
  await t.test('registra encomenda e protege histórico', async () => {
    const result = await call('/api/deliveries', { method: 'POST', auth: managerAuth, data: { residentId: resident.id, description: 'Caixa de teste', carrier: 'Teste', trackingCode: 'TESTE-001' } });
    assert.equal(result.status, 201);
    delivery = result.value;
    assert.equal(delivery.status, 'pending');
    assert.equal(delivery.resident_name, 'Morador teste editado');
    assert.equal(delivery.unit_label, 'A · 101');
    assert.equal((await call(`/api/residents/${resident.id}`, { method: 'DELETE', auth: admin })).status, 409);
    assert.equal((await call(`/api/managers/${manager.id}`, { method: 'DELETE', auth: admin })).status, 409);
    assert.equal((await call('/api/dashboard', { auth: admin })).value.pending, 1);
  });
  await t.test('retirada exige recebedor e não pode ocorrer duas vezes', async () => {
    assert.equal((await call(`/api/deliveries/${delivery.id}/finalize`, { method: 'POST', auth: admin, data: { receivedBy: '' } })).status, 400);
    const result = await call(`/api/deliveries/${delivery.id}/finalize`, { method: 'POST', auth: admin, data: { receivedBy: 'Recebedor fictício' } });
    assert.equal(result.status, 200);
    assert.equal(result.value.status, 'delivered');
    assert.ok(result.value.delivered_at);
    assert.equal((await call(`/api/deliveries/${delivery.id}/finalize`, { method: 'POST', auth: admin, data: { receivedBy: 'Novamente' } })).status, 409);
    assert.equal((await call('/api/dashboard', { auth: admin })).value.delivered, 1);
  });
  await t.test('desativação de síndico revoga sessões e logout encerra acesso', async () => {
    await call(`/api/managers/${manager.id}`, { method: 'PUT', auth: admin, data: { name: 'Síndico', email: 'sindico@example.test', phone: '11911112222', active: false, password: '' } });
    assert.equal((await call('/api/me', { auth: managerAuth })).status, 401);
    assert.equal((await call('/api/logout', { method: 'POST', auth: admin, data: {} })).status, 200);
    assert.equal((await call('/api/me', { auth: admin })).status, 401);
  });
  await t.test('exclusão funciona para cadastro sem histórico', async () => {
    const auth = await login('admin@example.test');
    const newUnit=await call('/api/units',{method:'POST',auth,data:{block:'D',floor:'4',apartment:'401'}});
    const created = await call('/api/residents', { method: 'POST', auth, data: { name: 'Excluir fictício', email: '', phone: '11955556666', unitId: newUnit.value.id, active: true, whatsappConsent: false } });
    assert.equal(created.status,201);
    assert.equal((await call(`/api/residents/${created.value.id}`, { method: 'DELETE', auth })).status, 200);
    const createdManager = await call('/api/managers', { method: 'POST', auth, data: { name: 'Excluir síndico', email: 'excluir@example.test', phone: '11922223333', active: true, password: loginPassword } });
    assert.equal((await call(`/api/managers/${createdManager.value.id}`, { method: 'DELETE', auth })).status, 200);
  });
  await t.test('lê inserções diretas na tabela existente e preserva endereço',async()=>{
    const auth=await login('admin@example.test');
    await db.pool.query(`INSERT INTO ${schema}.moradores(bloco,andar,apartamento,nome,whatsapp,endereco) VALUES('B','2','201','Cadastro externo fictício','11933334444','Endereço de teste')`);
    const list=(await call('/api/residents',{auth})).value;
    const found=list.find(row=>row.phone==='11933334444');
    assert.equal(found.name,'Cadastro externo fictício');
    assert.equal(found.address,'Endereço de teste');
    assert.equal(found.floor,'2');
  });
  await t.test('upload com prévia, duplicados ignorados, transação e confirmação única',async()=>{
    const auth=await login('admin@example.test');
    const preview=async csv=>{
      const response=await fetch(base+'/api/residents/import/preview',{method:'POST',headers:{Origin:origin,Cookie:auth.cookie,'X-CSRF-Token':auth.csrf,'X-File-Name':'moradores.csv','Content-Type':'application/octet-stream'},body:csv});
      return {status:response.status,value:await response.json()};
    };
    const invalid=await preview('nome;apartamento;whatsapp\nSem telefone;9;\n');
    assert.equal(invalid.value.counts.error,1);
    assert.equal(invalid.value.batchId,null);
    const result=await preview('nome;bloco;andar;apartamento;whatsapp;autoriza_whatsapp\nDuplicado;A;;101;11999998888;nao\nNovo fictício;C;3;301;11944445555;sim\n');
    assert.equal(result.status,200);
    assert.deepEqual(result.value.counts,{valid:1,skip:1,error:0});
    const data={batchId:result.value.batchId,createUnits:true};
    const confirmed=await call('/api/residents/import/confirm',{method:'POST',auth,data});
    assert.equal(confirmed.status,200);
    assert.equal(confirmed.value.imported,1);
    assert.equal((await db.pool.query(`SELECT nome FROM ${schema}.moradores WHERE whatsapp='11944445555'`)).rows[0].nome,'Novo fictício');
    assert.equal((await call('/api/residents/import/confirm',{method:'POST',auth,data})).status,409);
  });
  await t.test('chamados: abertura, atribuição, solução obrigatória e reabertura com histórico',async()=>{
    const auth=await login('admin@example.test');
    const responsibleId=randomUUID();
    await db.pool.query(`INSERT INTO ${schema}.responsaveis(id,nome,whatsapp,cargo) VALUES($1,'Responsável fictício','11977778888','PORTEIRO')`,[responsibleId]);
    const baseData={description:'Lâmpada apagada no corredor',location:'Corredor',responsibleId};
    const created=await call('/api/calls',{method:'POST',auth,data:baseData});
    assert.equal(created.status,201);
    const id=created.value.id;
    assert.equal((await db.pool.query(`SELECT status FROM ${schema}.chamados WHERE id=$1`,[id])).rows[0].status,'ABERTO');
    assert.equal((await call(`/api/calls/${id}`,{method:'PUT',auth,data:{...baseData,status:'EM_ANDAMENTO'}})).status,200);
    assert.equal((await call(`/api/calls/${id}`,{method:'PUT',auth,data:{...baseData,status:'RESOLVIDO',resolution:''}})).status,400);
    assert.equal((await call(`/api/calls/${id}`,{method:'PUT',auth,data:{...baseData,status:'RESOLVIDO',resolution:'Lâmpada substituída'}})).status,200);
    assert.equal((await call(`/api/calls/${id}`,{method:'PUT',auth,data:{...baseData,status:'ABERTO',resolution:''}})).status,400);
    assert.equal((await call(`/api/calls/${id}`,{method:'PUT',auth,data:{...baseData,status:'ABERTO',resolution:'',reopenReason:'Problema retornou'}})).status,200);
    const history=await call(`/api/calls/${id}`,{auth});
    assert.equal(history.value.length,4);
    assert.deepEqual((await call('/api/calls',{auth:other})).value,[]);
    assert.equal((await call(`/api/calls/${id}`,{method:'PUT',auth:other,data:{...baseData,status:'ABERTO'}})).status,404);
  });
});
