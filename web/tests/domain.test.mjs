import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { email, phone, hashPassword, verifyPassword, residentInput, tokenHash } from '../domain.mjs';

test('normaliza contato e rejeita cadastros inválidos', () => {
  assert.equal(email(' ADMIN@EXAMPLE.TEST '), 'admin@example.test');
  assert.equal(phone('(11) 99999-8888'), '11999998888');
  assert.throws(() => email('sem-email'));
  assert.throws(() => phone('123'));
  const resident = { name: ' Pessoa teste ', email: '', phone: '11999998888', unitId: randomUUID(), active: true, whatsappConsent: false };
  assert.equal(residentInput(resident).name, 'Pessoa teste');
  assert.throws(() => residentInput({ ...resident, active: 'false' }));
  assert.throws(() => residentInput({ ...resident, unitId: "' OR true" }));
});

test('senhas usam salt independente e validação constante de hash', async () => {
  const first = await hashPassword('senha-de-teste-valida');
  const second = await hashPassword('senha-de-teste-valida');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('senha-de-teste-valida', first), true);
  assert.equal(await verifyPassword('senha-errada', first), false);
  assert.equal(await verifyPassword('qualquer', 'invalido'), false);
  assert.equal(tokenHash('sessao').length, 64);
});
