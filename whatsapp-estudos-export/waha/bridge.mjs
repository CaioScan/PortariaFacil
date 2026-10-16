import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const canonical = value => String(value ?? '').replace(/:\d+@/, '@').replace('@s.whatsapp.net', '@c.us');

// No grupo autorizado, aceita comandos dos participantes; fora dele, somente conversa consigo mesmo.
export function selectCommand(event, me, now = Date.now(), started = 0, allowedGroup = '') {
  const p = event?.payload;
  if (event?.session !== 'default' || event?.event !== 'message.any' || !p) return null;
  if (typeof p.fromMe !== 'boolean' || p.source === 'api' || !p.id || typeof p.body !== 'string') return null;
  const identities = [me?.id, me?.lid].filter(Boolean).map(canonical);
  if (allowedGroup) {
    const groupChat = canonical(p.fromMe ? p.to : p.from);
    if (!allowedGroup.endsWith('@g.us') || groupChat !== allowedGroup) return null;
  } else if (!p.fromMe || !identities.includes(canonical(p.from)) || !identities.includes(canonical(p.to))) return null;
  const timestamp = Number(p.timestamp) * 1000;
  if (!Number.isFinite(timestamp) || timestamp < started - 5000 || Math.abs(now - timestamp) > 120000) return null;
  const match = p.body.match(/^!ia\s+([\s\S]+)$/i);
  if (!match || !match[1].trim() || match[1].length > 2000) return null;
  return { id: p.id, chatId: allowedGroup || p.to, text: match[1].trim() };
}

function sameSecret(value, expected) {
  const a = Buffer.from(String(value ?? ''));
  const b = Buffer.from(String(expected ?? ''));
  return b.length >= 32 && a.length === b.length && timingSafeEqual(a, b);
}

export async function startBridge(env = process.env) {
  for (const key of ['WAHA_API_KEY', 'N8N_WEBHOOK_KEY', 'WAHA_HOOK_SECRET', 'N8N_WEBHOOK_URL']) {
    if (!env[key]) throw new Error(`Configuração ausente: ${key}`);
  }
  const target = new URL(env.N8N_WEBHOOK_URL);
  if (target.protocol !== 'https:' || target.username || target.password) {
    throw new Error('Configure um destino n8n HTTPS sem credenciais na URL.');
  }
  const waha = 'http://waha:3000';
  const allowedGroup = env.TEST_GROUP_ID ?? '';
  if (allowedGroup && !/^\d+(?:-\d+)?@g\.us$/.test(allowedGroup)) {
    throw new Error('Grupo de teste inválido.');
  }
  const started = Date.now();
  const seen = new Set();
  let queue = Promise.resolve();
  let pending = 0;
  let sent = 0;
  let day = new Date().toISOString().slice(0, 10);
  let lastSent = 0;

  async function wahaRequest(path, body) {
    const response = await fetch(waha + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-Api-Key': env.WAHA_API_KEY, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`WAHA HTTP ${response.status}`);
    return response.json();
  }

  async function processEvent(event) {
    if (env.BOT_ENABLED !== 'true') return;
    const me = await wahaRequest('/api/sessions/default/me');
    const command = selectCommand(event, me, Date.now(), started, allowedGroup);
    if (!command || seen.has(command.id)) return;
    seen.add(command.id);
    if (seen.size > 1000) seen.delete(seen.values().next().value);
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) { sent = 0; day = today; }
    if (sent >= 100 || Date.now() - lastSent < 3000) return;
    sent += 1;
    lastSent = Date.now();
    // Envia apenas o texto: telefone e histórico ficam fora desta requisição.
    const response = await fetch(target, {
      method: 'POST', headers: { 'X-Study-Key': env.N8N_WEBHOOK_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: command.text }),
      signal: AbortSignal.timeout(60000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`n8n HTTP ${response.status}`);
    const data = await response.json();
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Resposta n8n inválida.');
    // O prefixo impede que uma resposta que contenha !ia seja tratada como comando.
    await wahaRequest('/api/sendText', {
      session: 'default', chatId: command.chatId, text: '🤖 ' + data.reply.trim().slice(0, 4000),
    });
    console.log('Comando de estudos respondido.');
  }

  const server = http.createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ ok: true, enabled: env.BOT_ENABLED === 'true' }));
    }
    if (request.method !== 'POST' || request.url !== '/events') {
      response.writeHead(404); return response.end();
    }
    if (!sameSecret(request.headers['x-relay-key'], env.WAHA_HOOK_SECRET)) {
      response.writeHead(401); return response.end();
    }
    try {
      let raw = '';
      for await (const chunk of request) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 65536) { response.writeHead(413); return response.end(); }
      }
      const event = JSON.parse(raw);
      if (pending >= 5) { response.writeHead(503); return response.end(); }
      pending += 1;
      queue = queue.then(() => processEvent(event))
        .catch(error => console.error('Falha na ponte:', error.message))
        .finally(() => { pending -= 1; });
      response.writeHead(202); response.end();
    } catch {
      response.writeHead(400); response.end();
    }
  });
  server.listen(3001, '0.0.0.0', () => console.log('Ponte local pronta; ativada:', env.BOT_ENABLED === 'true'));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startBridge().catch(error => { console.error(error.message); process.exitCode = 1; });
}
