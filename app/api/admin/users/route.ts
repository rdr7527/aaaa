import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile, hashPassword } from '../../../../lib/users';

function isAdminOrDeptManager(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return false;
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return payload.role === 'admin' || payload.role === 'department_manager';
  } catch(e) { return false }
}

function getUserInfo(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return null;
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return payload;
  } catch(e) { return null }
}

export async function GET(req: Request) {
  if (!isAdminOrDeptManager(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
  }
  
  const userInfo = getUserInfo(req);
  const data = readUsersFile();
  let users = data.users || [];
  
  // If department manager, filter to only users in their department
  if (userInfo?.role === 'department_manager') {
    users = users.filter((u: any) => u.departmentId === userInfo.departmentId);
  }
  
  const safe = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    departmentId: u.departmentId || null,
    deputyAccess: !!u.deputyAccess,
  }));
  return NextResponse.json({ ok: true, users: safe });
}

function getUserRole(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return null;
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return payload.role;
  } catch(e) { return null }
}

export async function POST(req: Request) {
  if (!isAdminOrDeptManager(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
  }
  
  const userInfo = getUserInfo(req);
  const body = await req.json();
  const data = readUsersFile();
  
  if ((data.users || []).find((u: any) => u.id === body.id)) {
    return NextResponse.json({ ok: false, error: 'User already exists' }, { status: 400 });
  }
  
  // Department managers can only add users to their department and only as 'user' role
  if (userInfo?.role === 'department_manager') {
    if (body.role !== 'user' || body.departmentId !== userInfo.departmentId) {
      return NextResponse.json({ ok: false, error: 'Department managers can only add students to their department' }, { status: 403 });
    }
  }
  
  const user = {
    id: body.id,
    name: body.name || body.id,
    role: body.role || 'user',
    departmentId: body.departmentId || null,
    password: hashPassword(body.password || 'password123'),
    deputyAccess: userInfo?.role === 'admin' ? !!body.deputyAccess : false,
  };
  if (!data.users) data.users = [];
  data.users.push(user);
  writeUsersFile(data);
  
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId, deputyAccess: !!user.deputyAccess } });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const data = readUsersFile();
  const user = (data.users || []).find((u: any) => u.id === body.id);
  if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  
  if (body.name) user.name = body.name;
  if (body.role) user.role = body.role;
  if (body.departmentId !== undefined) user.departmentId = body.departmentId;
  if (body.password) user.password = hashPassword(body.password);
  // Only admins can set deputyAccess
  const requesterRole = getUserRole(req);
  if (body.deputyAccess !== undefined && requesterRole === 'admin') {
    user.deputyAccess = !!body.deputyAccess;
  }
  
  writeUsersFile(data);
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId, deputyAccess: !!user.deputyAccess } });
}

export async function DELETE(req: Request) {
  if (!isAdminOrDeptManager(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
  }
  
  const userInfo = getUserInfo(req);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');
  if (!userId) return NextResponse.json({ ok: false, error: 'User ID required' }, { status: 400 });
  
  const data = readUsersFile();
  const userToDelete = (data.users || []).find((u: any) => u.id === userId);
  if (!userToDelete) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  
  // Department managers can only delete users in their department
  if (userInfo?.role === 'department_manager' && userToDelete.departmentId !== userInfo.departmentId) {
    return NextResponse.json({ ok: false, error: 'Cannot delete users from other departments' }, { status: 403 });
  }
  
  const adminCount = (data.users || []).filter((u: any) => u.role === 'admin').length;
  if (userToDelete.role === 'admin' && adminCount === 1) {
    return NextResponse.json({ ok: false, error: 'Cannot delete last admin' }, { status: 400 });
  }
  
  data.users = (data.users || []).filter((u: any) => u.id !== userId);
  writeUsersFile(data);
  return NextResponse.json({ ok: true });
}
