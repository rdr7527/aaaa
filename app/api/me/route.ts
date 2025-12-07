import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    // Return full payload including departmentId if present
    return NextResponse.json({ ok: true, user: payload });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
