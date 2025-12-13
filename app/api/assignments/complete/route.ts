import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'data', 'assignments.json');

function readData() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function writeData(data: any) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assignmentId, answer } = body;
    if (!assignmentId) return NextResponse.json({ error: 'missing assignmentId' }, { status: 400 });
    // identify user from cookie (don't trust client-provided userId)
    const cookie = req.headers.get('cookie') || '';
    const m = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('auth='));
    if (!m) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    let user: any = null;
    try {
      const token = m.split('=')[1];
      user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    } catch (e) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const all = readData();
    const idx = all.findIndex((a: any) => a.id === assignmentId);
    if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const a = all[idx];

    // if the user is a department_manager, ensure the assignment belongs to their department
    if (user.role === 'department_manager' && a.departmentId && user.departmentId !== a.departmentId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    a.completions = a.completions || [];
    // prevent duplicate submission by same user
    const already = a.completions.find((c: any) => c.userId === user.id);
    if (already) {
      return NextResponse.json({ ok: false, already: true }, { status: 409 });
    }
    a.completions.push({ answer, userId: user.id, userName: user.name || user.id, date: new Date().toISOString() });
    all[idx] = a;
    writeData(all);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
}
