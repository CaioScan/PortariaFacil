import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { createDatabase, migrate } from './db.mjs';
import { hashPassword, email } from './domain.mjs';
import { prepareNativeDatabase } from './native.mjs';

const database = createDatabase();
try {
  await migrate(database);
  await prepareNativeDatabase(database);
  const { pool, schema } = database;
  const adminEmail = email(process.env.ADMIN_EMAIL || 'admin@portaria.local');
  const existing = await pool.query(`SELECT id FROM ${schema}.operators WHERE email=$1`, [adminEmail]);
  if (existing.rowCount) {
    console.log('Banco preparado. Administrador existente preservado; senha não alterada.');
  } else {
    const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(18).toString('base64url');
    const hash = await hashPassword(adminPassword);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const condo = await client.query(`INSERT INTO ${schema}.condominiums(id,code,name) VALUES($1,$2,$3)
        ON CONFLICT(code) DO UPDATE SET code=EXCLUDED.code RETURNING id`,
      [randomUUID(), process.env.CONDOMINIUM_CODE || 'principal', process.env.CONDOMINIUM_NAME || 'Meu condomínio']);
      await client.query(`INSERT INTO ${schema}.operators(id,condominium_id,name,email,role,password_hash)
        VALUES($1,$2,$3,$4,'admin',$5)`, [randomUUID(), condo.rows[0].id, 'Administrador', adminEmail, hash]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    if (!process.env.ADMIN_PASSWORD) {
      const current = await readFile(new URL('../.env', import.meta.url), 'utf8');
      if (!/^ADMIN_PASSWORD=/m.test(current)) await appendFile(new URL('../.env', import.meta.url), `\nADMIN_PASSWORD=${adminPassword}\n`);
    }
    await writeFile(new URL('../acesso-local.txt', import.meta.url),
      `Portaria Facil - acesso local\nURL: ${process.env.APP_ORIGIN || 'http://127.0.0.1:4180'}\nE-mail: ${adminEmail}\nSenha: ${adminPassword}\n\nArquivo privado. Nao publique nem compartilhe.\n`, { mode: 0o600 });
    console.log('Administrador criado. Consulte o login no arquivo privado acesso-local.txt.');
  }
  const admin = (await pool.query(`SELECT condominium_id FROM ${schema}.operators WHERE email=$1`,[adminEmail])).rows[0];
  await pool.query(`INSERT INTO ${schema}.native_binding(singleton,condominium_id) VALUES(true,$1) ON CONFLICT(singleton) DO NOTHING`,[admin.condominium_id]);
  const source = database.dataSchema;
  const reconciliation = await pool.connect();
  try {
    await reconciliation.query('BEGIN');
    await reconciliation.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${schema}:reconciliation`]);
    const applied=await reconciliation.query(`SELECT 1 FROM ${schema}.data_migrations WHERE name='private-residents-to-native-v1'`);
    if(!applied.rowCount){
      const reconciled=await reconciliation.query(`INSERT INTO ${source}.moradores(bloco,andar,apartamento,nome,whatsapp,ativo)
        SELECT u.block,'',u.apartment,r.name,r.phone,r.active FROM ${schema}.residents r JOIN ${schema}.units u ON u.id=r.unit_id
        WHERE r.condominium_id=$1 AND length(u.block)<=20 AND length(u.apartment)<=20 ON CONFLICT DO NOTHING`,[admin.condominium_id]);
      await reconciliation.query(`INSERT INTO ${schema}.data_migrations(name) VALUES('private-residents-to-native-v1')`);
      console.log('Cadastros anteriores conciliados sem sobrescrever a base:',reconciled.rowCount);
    }
    await reconciliation.query('COMMIT');
  }catch(error){await reconciliation.query('ROLLBACK');throw error;}finally{reconciliation.release();}
  console.log('Painel vinculado às tabelas moradores, responsaveis e encomendas existentes.');
} catch (error) {
  console.error('Não foi possível preparar o PostgreSQL. Verifique rede, credenciais e permissões. Código:', error.code || 'SETUP_ERROR');
  process.exitCode = 1;
} finally { await database.pool.end(); }
