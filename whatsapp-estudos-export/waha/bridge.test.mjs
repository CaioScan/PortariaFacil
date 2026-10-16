import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectCommand } from './bridge.mjs';

const now = 1800000000000;
const me = { id: '5511000000000@c.us' };
const message = (changes = {}) => ({ event: 'message.any', session: 'default', payload: {
  id: 'test-message', fromMe: true, source: 'app', from: me.id, to: me.id,
  timestamp: now / 1000, body: '!ia oi', ...changes,
}});
test('aceita comando recente apenas na conversa consigo mesmo', () => {
  assert.equal(selectCommand(message(), me, now, now).text, 'oi');
  assert.equal(selectCommand(message({from: '5511000000000@s.whatsapp.net'}), me, now, now).text, 'oi');
});
test('ignora grupos, outras pessoas e mensagens sem comando', () => {
  for (const change of [{to:'123@g.us'}, {from:'5511999999999@c.us'}, {fromMe:false}, {body:'oi'}, {body:'!ia '}, {body:'!ia ' + 'x'.repeat(2001)}]) {
    assert.equal(selectCommand(message(change), me, now, now), null);
  }
});
test('respostas da API e respostas prefixadas não criam ciclos', () => {
  assert.equal(selectCommand(message({source:'api'}), me, now, now), null);
  assert.equal(selectCommand(message({body:'🤖 !ia resposta'}), me, now, now), null);
});
test('modo grupo aceita comandos próprios e dos participantes somente no grupo autorizado', () => {
  const group = '120363000000000000@g.us';
  assert.equal(selectCommand(message({to:group}), me, now, now, group).chatId, group);
  const incoming = message({from:group,to:me.id,fromMe:false,participant:'5511999999999@c.us'});
  assert.equal(selectCommand(incoming, me, now, now, group).chatId, group);
  assert.equal(selectCommand(incoming, me, now, now, group).text, 'oi');
  for (const change of [{to:'120363999999999999@g.us'}, {to:me.id}, {to:group,fromMe:false}, {from:'120363999999999999@g.us',fromMe:false}, {from:'5511999999999@c.us',fromMe:false}, {to:group,source:'api'}, {from:group,fromMe:false,source:'api'}, {to:group,body:'🤖 !ia teste'}, {from:group,fromMe:false,body:'oi sem comando'}]) {
    assert.equal(selectCommand(message(change), me, now, now, group), null);
  }
});
test('descarta eventos antigos, futuros, inválidos e anteriores ao início', () => {
  for (const timestamp of [now / 1000 - 121, now / 1000 + 121, 'inválido', 0]) {
    assert.equal(selectCommand(message({timestamp}), me, now, now), null);
  }
  assert.equal(selectCommand(message(), me, now, now + 10000), null);
  assert.equal(selectCommand({...message(),session:'outra'}, me, now, now), null);
  assert.equal(selectCommand({...message(),event:'session.status'}, me, now, now), null);
});
