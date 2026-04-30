import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGO = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKeyFromEnv() {
  const key = process.env.USER_DATA_KEY || 'dev-secret-key-change-in-production';
  // derive 32-byte key
  return pbkdf2Sync(key, 'usersalt', 100000, 32, 'sha256');
}

export function encryptJson(obj: any): string {
  const text = JSON.stringify(obj);
  const iv = randomBytes(IV_LENGTH);
  const key = getKeyFromEnv();
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptJson(payload: string): any {
  const [ivHex, encHex] = payload.split(':');
  if (!ivHex || !encHex) return null;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const key = getKeyFromEnv();
  const decipher = createDecipheriv(ALGO, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function ensureDataDir() {
  const p = path.join(process.cwd(), 'data');
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
}
