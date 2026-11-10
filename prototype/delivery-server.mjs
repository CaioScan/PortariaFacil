import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(new URL('./acompanhamento-entregas.html', import.meta.url));
const maxBodyBytes = 16 * 1024;
const maxResponseBytes = 8 * 1024;

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

function boundedText(value, maxLength) {
  return typeof value === 'string' && value.trim() && value.length <= maxLength
    ? value.trim()
    : null;
}

export function validateDeliveryEvent(input) {
  if (input?.type !== 'delivery.notification.requested') return null;
  const eventId = boundedText(input.eventId, 120);
  const delivery = input.delivery;
  const attempt = input.attempt;
  const reference = boundedText(delivery?.reference, 40);
  const unit = boundedText(delivery?.unit, 40);
  const recipientName = boundedText(delivery?.recipientName, 100);
  const description = boundedText(delivery?.description, 160);
  const carrier = boundedText(delivery?.carrier, 80);
  const arrivedAt = boundedText(delivery?.arrivedAt, 40);
  const attemptId = boundedText(attempt?.id, 120);
  const requestedAt = boundedText(attempt?.requestedAt, 40);

  if (!eventId || !/^[\w.:-]+$/.test(eventId) || !reference || !unit || !recipientName ||
      !description || !carrier || !arrivedAt || !attemptId || !requestedAt ||
      !Number.isInteger(attempt?.number) || attempt.number < 1 || attempt.number > 100 ||
      !['arrival', 'reminder'].includes(attempt?.reason) ||
      !Number.isFinite(Date.parse(arrivedAt)) || !Number.isFinite(Date.parse(requestedAt))) {
    return null;
  }

  return {
    type: 'delivery.notification.requested',
    eventId,
    delivery: { reference, unit, recipientName, description, carrier, arrivedAt },
    attempt: { id: attemptId, number: attempt.number, requestedAt, reason: attempt.reason },
  };
}

function isAllowedOrigin(request, port) {
  try {
    const origin = new URL(request.headers.origin);
    return origin.protocol === 'http:' &&
      ['127.0.0.1', 'localhost'].includes(origin.hostname) &&
      origin.port === String(port);
  } catch {
    return false;
  }
}

async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    throw new Error('content-type');
  }
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > maxBodyBytes) throw new Error('size');
  }
  return JSON.parse(raw);
}

async function readSmallJson(response) {
  if (!response.body) return {};
  const reader = response.body.getReader();
  let body = '';
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxResponseBytes) {
      await reader.cancel();
      throw new Error('Resposta do n8n excedeu o limite permitido.');
    }
    body += new TextDecoder().decode(value, { stream: true });
  }
  body += new TextDecoder().decode();
  return JSON.parse(body);
}

function validateWebhookConfig(webhookUrl, webhookKey) {
  if (!webhookUrl && !webhookKey) return null;
  if (!webhookUrl || !webhookKey || webhookKey.length < 32) {
    throw new Error('Configure URL e chave do webhook n8n; a chave deve ter ao menos 32 caracteres.');
  }
  const target = new URL(webhookUrl);
  const localHttp = target.protocol === 'http:' &&
    ['localhost', '127.0.0.1', 'host.docker.internal'].includes(target.hostname);
  if ((target.protocol !== 'https:' && !localHttp) || target.username || target.password) {
    throw new Error('Use HTTPS no n8n remoto ou HTTP somente para um host local, sem credenciais na URL.');
  }
  return target;
}

export function createDeliveryServer({
  webhookUrl = '',
  webhookKey = '',
  fetchImpl = fetch,
} = {}) {
  const target = validateWebhookConfig(webhookUrl, webhookKey);
  let server;

  server = http.createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/api/config') {
      return sendJson(response, 200, { n8nConfigured: Boolean(target) });
    }

    if (request.method === 'GET' && ['/','/acompanhamento-entregas.html'].includes(request.url)) {
      try {
        const page = await readFile(pagePath);
        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        return response.end(page);
      } catch {
        return sendJson(response, 404, { error: 'Protótipo não encontrado.' });
      }
    }

    if (request.method !== 'POST' || request.url !== '/api/entregas/aviso') {
      response.writeHead(404);
      return response.end();
    }
    if (!isAllowedOrigin(request, server.address()?.port)) {
      return sendJson(response, 403, { error: 'Origem não autorizada.' });
    }
    if (!target) return sendJson(response, 503, { error: 'Integração n8n não configurada.' });

    try {
      const event = validateDeliveryEvent(await readJson(request));
      if (!event) return sendJson(response, 400, { error: 'Evento de aviso inválido.' });

      const webhookResponse = await fetchImpl(target, {
        method: 'POST',
        headers: { 'X-Delivery-Key': webhookKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      if (!webhookResponse.ok) {
        return sendJson(response, 502, { error: `n8n respondeu HTTP ${webhookResponse.status}.` });
      }

      const result = await readSmallJson(webhookResponse);
      if (result.accepted !== true || result.eventId !== event.eventId) {
        return sendJson(response, 502, { error: 'Resposta do n8n não confirmou este evento.' });
      }
      return sendJson(response, 200, {
        accepted: true,
        eventId: event.eventId,
        status: boundedText(result.status, 40) || 'received',
      });
    } catch (error) {
      const status = error.message === 'content-type' ? 415 : error.message === 'size' ? 413 : 400;
      if (status !== 400) return sendJson(response, status, { error: 'Requisição inválida.' });
      if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'JSON inválido.' });
      return sendJson(response, 502, { error: 'Não foi possível confirmar o evento no n8n.' });
    }
  });

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 4173);
  const server = createDeliveryServer({
    webhookUrl: process.env.N8N_DELIVERY_WEBHOOK_URL || '',
    webhookKey: process.env.N8N_DELIVERY_WEBHOOK_KEY || '',
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Protótipo disponível em http://127.0.0.1:${port}`);
    console.log('Integração n8n configurada:', Boolean(process.env.N8N_DELIVERY_WEBHOOK_URL));
  });
}