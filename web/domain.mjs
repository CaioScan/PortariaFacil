import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function text(value, label, { max = 160, optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${label}: informe entre 1 e ${max} caracteres.`);
  }
  return value.trim();
}

export function email(value, optional = false) {
  const result = text(value, 'E-mail', { max: 254, optional }).toLowerCase();
  if ((!optional || result) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new HttpError(400, 'Informe um e-mail válido.');
  return result;
}

export function phone(value, optional = false) {
  const result = text(value, 'Telefone', { max: 30, optional }).replace(/\D/g, '');
  if ((!optional || result) && (result.length < 10 || result.length > 15)) throw new HttpError(400, 'Telefone: informe de 10 a 15 dígitos, incluindo DDD.');
  return result;
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) throw new HttpError(400, 'A senha deve ter entre 10 e 128 caracteres.');
  return value;
}

export function boolean(value, label) {
  if (typeof value !== 'boolean') throw new HttpError(400, `${label}: valor inválido.`);
  return value;
}

export async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password(value), salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(value, encoded) {
  if (typeof value !== 'string' || value.length > 128) return false;
  const [algorithm, salt, stored] = String(encoded).split(':');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(stored || '')) return false;
  const actual = await scrypt(value, salt, 64);
  return timingSafeEqual(actual, Buffer.from(stored, 'hex'));
}

export const tokenHash = token => createHash('sha256').update(token).digest('hex');

export function residentInput(body) {
  if (!uuidPattern.test(body.unitId || '')) throw new HttpError(400, 'Selecione uma unidade válida.');
  return {
    name: text(body.name, 'Nome', { max: 120 }), email: email(body.email, true), phone: phone(body.phone),
    unitId: body.unitId, whatsappConsent: boolean(body.whatsappConsent, 'Autorização de WhatsApp'),
    active: boolean(body.active, 'Status'),
  };
}
