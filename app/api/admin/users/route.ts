import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile, hashPassword } from '../../../../lib/users';

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
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = readUsersFile();
  const safe = (data.users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    departmentId: u.departmentId || null,
  }));
  return NextResponse.json({ ok: true, users: safe });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const data = readUsersFile();
  
  if ((data.users || []).find((u: any) => u.id === body.id)) {
    return NextResponse.json({ ok: false, error: 'User already exists' }, { status: 400 });
  }
  
  const user = {
    id: body.id,
    name: body.name || body.id,
    role: body.role || 'user',
    departmentId: body.departmentId || null,
    password: hashPassword(body.password || 'password123'),
  };
  if (!data.users) data.users = [];
  data.users.push(user);
  writeUsersFile(data);
  
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId } });
}

export async function PUT(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const data = readUsersFile();
  const user = (data.users || []).find((u: any) => u.id === body.id);
  if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  
  if (body.name) user.name = body.name;
  if (body.role) user.role = body.role;
  if (body.departmentId !== undefined) user.departmentId = body.departmentId;
  if (body.password) user.password = hashPassword(body.password);
  
  writeUsersFile(data);
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId } });
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');
  if (!userId) return NextResponse.json({ ok: false, error: 'User ID required' }, { status: 400 });
  
  const data = readUsersFile();
  const adminCount = (data.users || []).filter((u: any) => u.role === 'admin').length;
  const user = (data.users || []).find((u: any) => u.id === userId);
  
  if (user && user.role === 'admin' && adminCount === 1) {
    return NextResponse.json({ ok: false, error: 'Cannot delete last admin' }, { status: 400 });
  }
  
  data.users = (data.users || []).filter((u: any) => u.id !== userId);
  writeUsersFile(data);
  return NextResponse.json({ ok: true });
}
