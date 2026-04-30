import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '../../../../lib/users';

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

export async function PUT(req: Request, { params }: { params: Promise<{ deptId: string }> }) {
  const { deptId } = await params;
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === deptId);
  if (!dept) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  dept.name = body.name || dept.name;
  dept.description = body.description || dept.description;
  writeUsersFile(data);
  return NextResponse.json({ ok: true, department: dept });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ deptId: string }> }) {
  const { deptId } = await params;
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = readUsersFile();
  data.departments = (data.departments || []).filter((d: any) => d.id !== deptId);
  writeUsersFile(data);
  return NextResponse.json({ ok: true });
}
