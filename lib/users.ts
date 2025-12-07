import fs from 'fs';
import path from 'path';
import { encryptJson, decryptJson } from './crypto';
import { pbkdf2Sync, randomBytes } from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'users.enc.json');

function hashPassword(password: string, salt?: string) {
  const _salt = salt || randomBytes(8).toString('hex');
  const derived = pbkdf2Sync(password, _salt, 100000, 32, 'sha256').toString('hex');
  return `${_salt}:${derived}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const derived = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return derived === hash;
}

export function readUsersFile() {
  if (!fs.existsSync(DATA_FILE)) return { users: [] };
  const payload = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return decryptJson(payload);
  } catch (err) {
    return { users: [] };
  }
}

export function writeUsersFile(obj: any) {
  const payload = encryptJson(obj);
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, payload, 'utf8');
}

export function seedAdminIfEmpty() {
  const data = readUsersFile();
  if (!data.users || data.users.length === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const admin = {
      id: 'admin',
      name: 'Administrator',
      role: 'admin',
      password: hashPassword(adminPassword),
    };
    writeUsersFile({ users: [admin], departments: [] });
    return admin;
  }
  return null;
}

export { hashPassword, verifyPassword };
