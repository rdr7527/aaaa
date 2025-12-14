import { NextResponse } from 'next/server';
import { readUsersFile } from '../../../lib/users';

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    // Merge latest flags from users file (e.g., deputyAccess) if available
    const data = readUsersFile();
    const stored = (data.users || []).find((u: any) => u.id === payload.id);
    const merged = { ...payload, ...(stored ? { deputyAccess: !!stored.deputyAccess, departmentId: stored.departmentId || payload.departmentId } : {}) };
    return NextResponse.json({ ok: true, user: merged });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
