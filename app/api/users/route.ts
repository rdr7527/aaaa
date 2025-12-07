import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '../../../lib/users';

function isAdmin(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return false;
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return payload.role === 'admin';
  } catch(e) { return false }
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const data = readUsersFile();
  // don't include passwords
  const safe = { ...data, users: (data.users||[]).map((u:any)=>({ id:u.id, name:u.name, role:u.role })) };
  return NextResponse.json({ ok: true, data: safe });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const data = readUsersFile();
  // Expect body to be full data object
  writeUsersFile(body);
  return NextResponse.json({ ok: true });
}
