import { NextResponse } from 'next/server';
import { readTutorialsFile, writeTutorialsFile } from '../../../lib/tutorials';

function parseAuth(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return null;
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return payload;
  } catch(e) { return null }
}

function isAdmin(req: Request) {
  const payload = parseAuth(req);
  return !!payload && payload.role === 'admin';
}

export async function GET(req: Request) {
  // Allow anyone to read tutorials for now
  const tutorials = readTutorialsFile();
  return NextResponse.json({ ok: true, tutorials });
}

export async function PUT(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const body = await req.json();
    const { type, data } = body; // type: 'student', 'teacher', 'general'

    if (!['student', 'teacher', 'general'].includes(type)) {
      return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 });
    }

    const tutorials = readTutorialsFile();
    tutorials[type] = { ...tutorials[type], ...data };
    writeTutorialsFile(tutorials);

    return NextResponse.json({ ok: true, tutorial: tutorials[type] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Invalid data' }, { status: 400 });
  }
}