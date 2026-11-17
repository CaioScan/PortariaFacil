import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db.mjs';
import { createNativeRepository } from './native.mjs';
import { createImporter } from './import.mjs';
import { HttpError, text, email, phone, password, boolean, hashPassword, verifyPassword, tokenHash, uuidPattern } from './domain.mjs';

const files = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']], ['/space-grotesk.ttf', ['space-grotesk.ttf', 'font/ttf']]]);
const mutate = new Set(['POST', 'PUT', 'DELETE']);
const dummyHash = 'scrypt:00000000000000000000000000000000:'+'00'.repeat(64);

function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function body(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Envie os dados em JSON.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16384) throw new HttpError(413, 'Dados muito grandes.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch { throw new HttpError(400, 'JSON inválido.'); }
}

export function createWebHandler({ database, appOrigin = 'http://127.0.0.1:4180', secureCookies = false,assetLoader,loginFailures }) {
  const { pool, schema } = database;
  const native = createNativeRepository(database);
  const importer = createImporter({database,native});
  const source = database.dataSchema;
  const failures = loginFailures||new Map();
  let nextPrune = 0;
  const origin = new URL(appOrigin).origin;
  const cookie = (token, maxAge) => `pf_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`;

  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(request.url, origin);
      const path = url.pathname;
      if (request.method === 'GET' && files.has(path)) {
        const [filename, type] = files.get(path);
        const file = assetLoader?await assetLoader(filename):await readFile(new URL(`./public/${filename}`, import.meta.url));
        response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        return response.end(file);
      }
      if (!path.startsWith('/api/')) throw new HttpError(404, 'Página não encontrada.');
      if (mutate.has(request.method) && request.headers.origin !== origin) throw new HttpError(403, 'Origem não autorizada. Abra o painel pelo endereço configurado.');

      if (path === '/api/login' && request.method === 'POST') {
        const key = request.socket.remoteAddress;
        const now = Date.now();
        if (now > nextPrune) {
          for (const [address, failure] of failures) if (failure.until < now) failures.delete(address);
          nextPrune = now + 60000;
        }
        const attempts = failures.get(key);
        if (attempts && attempts.until > now && attempts.count >= 10) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.');
        const data = await body(request);
        const loginEmail = email(data.email);
        const user = (await pool.query(`SELECT * FROM ${schema}.operators WHERE email=$1`, [loginEmail])).rows[0];
        const verified = await verifyPassword(data.password, user?.password_hash || dummyHash);
        if (!verified || !user?.active) {
          failures.set(key, { count: (attempts?.until > now ? attempts.count : 0) + 1, until: now + 15 * 60000 });
          throw new HttpError(401, 'E-mail ou senha inválidos.');
        }
        failures.delete(key);
        const token = randomBytes(32).toString('hex');
        const csrf = randomBytes(24).toString('hex');
        await pool.query(`DELETE FROM ${schema}.sessions WHERE expires_at < now()`);
        await pool.query(`INSERT INTO ${schema}.sessions(token_hash,operator_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')`, [tokenHash(token), user.id, csrf]);
        response.setHeader('Set-Cookie', cookie(token, 28800));
        return send(response, 200, { ok: true });
      }

      const token = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('pf_session='))?.slice(11);
      const session = token && /^[a-f0-9]{64}$/.test(token) ? (await pool.query(`
        SELECT o.id,o.condominium_id,o.name,o.email,o.role,s.csrf_token,c.name AS condominium_name
        FROM ${schema}.sessions s JOIN ${schema}.operators o ON o.id=s.operator_id
        JOIN ${schema}.condominiums c ON c.id=o.condominium_id
        WHERE s.token_hash=$1 AND s.expires_at>now() AND o.active=true`, [tokenHash(token)])).rows[0] : null;
      if (!session) throw new HttpError(401, 'Entre para acessar o painel.');
      if (mutate.has(request.method) && request.headers['x-csrf-token'] !== session.csrf_token) throw new HttpError(403, 'Sessão inválida. Atualize a página e tente novamente.');
      const condo = session.condominium_id;
      if(path==='/api/responsibles'&&request.method==='GET')return send(response,200,await native.bound(pool,condo)?(await pool.query(`SELECT id,nome,cargo,ativo FROM ${source}.responsaveis ORDER BY ativo DESC,nome`)).rows:[]);
      if(path==='/api/residents/import/template'&&request.method==='GET') {
        response.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="modelo-moradores.csv"'});
        return response.end('\uFEFFnome;bloco;andar;apartamento;whatsapp;email;endereco;complemento;ativo;autoriza_whatsapp\r\n');
      }
      if(path==='/api/residents/import/preview'&&request.method==='POST')return send(response,200,await importer.preview(request,session));
      if(path==='/api/residents/import/confirm'&&request.method==='POST')return send(response,200,await importer.confirm(await body(request),session));
      if (path === '/api/me' && request.method === 'GET') return send(response, 200, session);
      if (path === '/api/logout' && request.method === 'POST') {
        await pool.query(`DELETE FROM ${schema}.sessions WHERE token_hash=$1`, [tokenHash(token)]);
        response.setHeader('Set-Cookie', cookie('', 0));
        return send(response, 200, { ok: true });
      }
      if (path === '/api/dashboard' && request.method === 'GET') {
        const accessible = await native.bound(pool,condo);
        const residents = accessible ? Number((await pool.query(`SELECT count(*) FROM ${source}.moradores WHERE ativo`)).rows[0].count) : 0;
        const units = await native.units(condo);
        const counts = accessible ? (await pool.query(`SELECT count(*) FILTER(WHERE status='AGUARDANDO_RETIRADA')::int AS pending,count(*) FILTER(WHERE status='RETIRADA')::int AS delivered FROM ${source}.encomendas`)).rows[0] : {pending:0,delivered:0};
        const managers = Number((await pool.query(`SELECT count(*) FROM ${schema}.operators WHERE condominium_id=$1 AND role='sindico' AND active`,[condo])).rows[0].count);
        const calls=accessible?Number((await pool.query(`SELECT count(*) FROM ${source}.chamados WHERE status IN ('ABERTO','EM_ANDAMENTO')`)).rows[0].count):0;
        return send(response,200,{residents,units:units.length,managers,calls,...counts});
      }
      const route = path.match(/^\/api\/(units|residents|managers|deliveries|calls)(?:\/([A-Za-z0-9_-]+))?(?:\/(finalize))?$/);
      if (!route) throw new HttpError(404, 'Rota não encontrada.');
      const [, entity, id, action] = route;
      if (id && entity!=='residents' && !uuidPattern.test(id)) throw new HttpError(400, 'Identificador inválido.');
      if (entity === 'managers' && session.role !== 'admin') throw new HttpError(403, 'Somente o administrador gerencia os síndicos.');
      if (action && (entity !== 'deliveries' || request.method !== 'POST')) throw new HttpError(404, 'Rota não encontrada.');
      const required = result => {
        if (!result.rowCount) throw new HttpError(404, 'Registro não encontrado neste condomínio.');
        return result.rows[0];
      };

      if (['units','residents','deliveries','calls'].includes(entity)) {
        const data = mutate.has(request.method) && request.method !== 'DELETE' ? await body(request) : {};
        const result = await native.handle({entity,id,action,method:request.method,data,session});
        return send(response,result.status||200,result.value);
      }

      if (entity === 'managers') {
        if (request.method === 'GET' && !id) return send(response, 200, (await pool.query(`SELECT id,name,email,phone,active,created_at FROM ${schema}.operators WHERE condominium_id=$1 AND role='sindico' ORDER BY name`, [condo])).rows);
        if (['POST','PUT'].includes(request.method) && (request.method === 'POST' ? !id : Boolean(id))) {
          const data = await body(request);
          const name = text(data.name, 'Nome', { max: 120 });
          const loginEmail = email(data.email);
          const contact = phone(data.phone);
          const active = boolean(data.active, 'Status');
          let hash = null;
          if (!id || data.password) hash = await hashPassword(password(data.password));
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const result = id
              ? await client.query(`UPDATE ${schema}.operators SET name=$1,email=$2,phone=$3,active=$4,password_hash=COALESCE($5,password_hash) WHERE id=$6 AND condominium_id=$7 AND role='sindico' RETURNING id,name,email,phone,active`, [name,loginEmail,contact,active,hash,id,condo])
              : await client.query(`INSERT INTO ${schema}.operators(id,condominium_id,name,email,phone,role,password_hash,active) VALUES($1,$2,$3,$4,$5,'sindico',$6,$7) RETURNING id,name,email,phone,active`, [randomUUID(),condo,name,loginEmail,contact,hash,active]);
            const manager = required(result);
            if(await native.bound(client,condo)) {
              await client.query(`INSERT INTO ${source}.responsaveis(id,nome,whatsapp,cargo,ativo) VALUES($1,$2,$3,'SINDICO',$4) ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome,whatsapp=EXCLUDED.whatsapp,ativo=EXCLUDED.ativo,updated_at=now()`,[manager.id,name,contact,active]);
              await client.query(`INSERT INTO ${schema}.manager_links(operator_id,responsible_id) VALUES($1,$1) ON CONFLICT(operator_id) DO NOTHING`,[manager.id]);
            }
            if (id && (!active || hash)) await client.query(`DELETE FROM ${schema}.sessions WHERE operator_id=$1`, [id]);
            await client.query('COMMIT');
            return send(response, id ? 200 : 201, manager);
          } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
        }
        if (request.method === 'DELETE' && id) {
          await native.transaction(async client=>{
            const linked=(await client.query(`SELECT responsible_id FROM ${schema}.manager_links WHERE operator_id=$1`,[id])).rows[0];
            required(await client.query(`DELETE FROM ${schema}.operators WHERE id=$1 AND condominium_id=$2 AND role='sindico' RETURNING id`,[id,condo]));
            if(linked)await client.query(`DELETE FROM ${source}.responsaveis WHERE id=$1`,[linked.responsible_id]);
          });
          return send(response, 200, { ok: true });
        }
      }

      throw new HttpError(405, 'Ação não disponível para este registro.');
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      if (error instanceof HttpError) return send(response, error.status, { error: error.message });
      if (error.code === '23505') return send(response, 409, { error: 'Já existe cadastro para este WhatsApp, e-mail ou combinação de bloco, andar e apartamento.' });
      if (['22P02','22001'].includes(error.code))return send(response,400,{error:'Um campo contém um valor inválido ou excede o tamanho permitido.'});
      if (error.code === '23503') return send(response, 409, { error: 'Este cadastro tem vínculos ou histórico. Desative a pessoa para preservar os registros; unidades vinculadas não podem ser excluídas.' });
      console.error('Falha na operação do painel. Código:', error.code || 'INTERNAL');
      return send(response, 500, { error: 'Não foi possível concluir a operação no banco. Tente novamente.' });
    }
  };
}

export function createWebServer(options){return http.createServer(createWebHandler(options));}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const database = createDatabase();
  const port = Number(process.env.PORT || process.env.WEB_PORT || 4180);
  const appOrigin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
  const server = createWebServer({ database, appOrigin, secureCookies: new URL(appOrigin).protocol === 'https:' });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Porta ${port} ocupada. Verifique se o painel já está aberto.` : 'Não foi possível iniciar o painel.'); process.exitCode = 1; database.pool.end(); });
  try {
    await database.pool.query(`SELECT id FROM ${database.schema}.condominiums LIMIT 1`);
    server.listen(port, process.env.WEB_HOST || '127.0.0.1', () => console.log(`Portaria Fácil: ${appOrigin} | PostgreSQL conectado`));
  } catch {
    console.error('Banco indisponível ou estrutura não preparada. Execute npm run web:setup.');
    await database.pool.end();
    process.exitCode = 1;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(() => database.pool.end()); });
}
