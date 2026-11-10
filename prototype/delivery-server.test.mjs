import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryServer, validateDeliveryEvent } from './delivery-server.mjs';

const event = {
  type: 'delivery.notification.requested',
  eventId: 'ENC-2041:attempt-1',
  delivery: {
    reference: 'ENC-2041',
    unit: 'Bloco A · 31',
    recipientName: 'Ana Costa',
    description: 'Caixa pequena',
    carrier: 'Correios',
    arrivedAt: '2026-11-09T12:00:00.000Z',
  },
  attempt: {
    id: 'ENC-2041:attempt-1',
    number: 1,
    requestedAt: '2026-11-09T12:05:00.000Z',
    reason: 'arrival',
  },
};

async function startServer(t, options = {}) {
  const server = createDeliveryServer(options);
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('valida o contrato e remove campos não permitidos', () => {
  assert.deepEqual(validateDeliveryEvent({ ...event, phone: '+5511999999999' }), event);
  assert.equal(validateDeliveryEvent({ ...event, attempt: { ...event.attempt, number: 0 } }), null);
  assert.equal(validateDeliveryEvent({ ...event, type: 'delivery.cancelled' }), null);
});

test('não expõe a chave na configuração entregue ao navegador', async t => {
  const baseUrl = await startServer(t, {
    webhookUrl: 'https://n8n.example/webhook/delivery',
    webhookKey: 'k'.repeat(32),
  });
  const response = await fetch(`${baseUrl}/api/config`);
  assert.deepEqual(await response.json(), { n8nConfigured: true });
});

test('encaminha eventos normalizados ao n8n com chave somente no servidor', async t => {
  const calls = [];
  const baseUrl = await startServer(t, {
    webhookUrl: 'https://n8n.example/webhook/delivery',
    webhookKey: 'k'.repeat(32),
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return Response.json({ accepted: true, eventId: event.eventId, status: 'received' });
    },
  });
  const response = await fetch(`${baseUrl}/api/entregas/aviso`, {
    method: 'POST',
    headers: {
      Origin: baseUrl,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...event, phone: '+5511999999999' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    accepted: true,
    eventId: event.eventId,
    status: 'received',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers['X-Delivery-Key'], 'k'.repeat(32));
  assert.equal(calls[0].options.body.includes('+5511999999999'), false);
});

test('rejeita origem não local antes de chamar o n8n', async t => {
  let called = false;
  const baseUrl = await startServer(t, {
    webhookUrl: 'https://n8n.example/webhook/delivery',
    webhookKey: 'k'.repeat(32),
    fetchImpl: async () => { called = true; return Response.json({}); },
  });
  const response = await fetch(`${baseUrl}/api/entregas/aviso`, {
    method: 'POST',
    headers: { Origin: 'https://outside.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test('não envia eventos quando a integração está desconfigurada', async t => {
  const baseUrl = await startServer(t);
  const response = await fetch(`${baseUrl}/api/entregas/aviso`, {
    method: 'POST',
    headers: { Origin: baseUrl, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  assert.equal(response.status, 503);
});

test('rejeita credenciais curtas e URLs remotas sem HTTPS', () => {
  assert.throws(() => createDeliveryServer({
    webhookUrl: 'https://n8n.example/webhook/delivery',
    webhookKey: 'short',
  }));
  assert.throws(() => createDeliveryServer({
    webhookUrl: 'http://n8n.example/webhook/delivery',
    webhookKey: 'k'.repeat(32),
  }));
});