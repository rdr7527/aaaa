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

function noStoreJson(body: any, status?: number) {
  return NextResponse.json(body, { status: status || 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request) {
  const userInfo = getUserInfo(req);
  if (!userInfo || !['admin','department_manager','teacher'].includes(userInfo.role)) {
    return noStoreJson({ ok: false, error: 'Unauthorized' }, 403);
  }
  const data = readUsersFile();
  let users = data.users || [];
  
  // If department manager, filter to only users in their department
  if (userInfo?.role === 'department_manager' || userInfo?.role === 'teacher') {
    users = users.filter((u: any) => u.departmentId === userInfo.departmentId);
  }
  
  const safe = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    departmentId: u.departmentId || null,
    deputyAccess: !!u.deputyAccess,
  }));
  // support pagination: ?page=1&limit=50 and optional search `q`
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;
    const q = sp.get('q') || '';
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(1000, parseInt(sp.get('limit') || '50', 10)));

    // filter by search query if present
    let filtered = safe;
    if (q) {
      const ql = q.toLowerCase();
      filtered = safe.filter((u: any) => (u.id || '').toLowerCase().includes(ql) || (u.name || '').toLowerCase().includes(ql));
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return noStoreJson({ ok: true, users: paged, total, page, limit });
  } catch (e) {
    return noStoreJson({ ok: true, users: safe });
  }
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
    return noStoreJson({ ok: false, error: 'Unauthorized' }, 403);
  }
  
  const userInfo = getUserInfo(req);
  const body = await req.json();
  const data = readUsersFile();
  
  if ((data.users || []).find((u: any) => u.id === body.id)) {
    return noStoreJson({ ok: false, error: 'User already exists' }, 400);
  }
  
  // Department managers have full permissions to add users in any department.
  // But can only add 'user' and 'teacher' roles.
  if (userInfo?.role === 'department_manager') {
    if (body.departmentId !== userInfo.departmentId) {
      return noStoreJson({ ok: false, error: 'Department managers can only add users to their department' }, 403);
    }
    const allowed = body.role === 'user' || body.role === 'teacher';
    if (!allowed) {
      return noStoreJson({ ok: false, error: 'Department managers can only add students or teachers' }, 403);
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
  try {
    writeUsersFile(data);
  } catch (err) {
    console.error('Failed to save new user:', err);
    return noStoreJson({ ok: false, error: 'Failed to save user' }, 500);
  }
  
  return noStoreJson({ ok: true, user: { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId, deputyAccess: !!user.deputyAccess } });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const data = readUsersFile();
  const user = (data.users || []).find((u: any) => u.id === body.id);
  if (!user) return noStoreJson({ ok: false, error: 'User not found' }, 404);
  
  if (body.newId && body.newId !== body.id) {
    if ((data.users || []).find((u: any) => u.id === body.newId)) {
      return noStoreJson({ ok: false, error: 'New username already exists' }, 400);
    }
    user.id = body.newId;
  }
  
  if (body.name) user.name = body.name;
  if (body.role) user.role = body.role;
  if (body.departmentId !== undefined) user.departmentId = body.departmentId;
  if (body.password) user.password = hashPassword(body.password);
  // Only admins can set deputyAccess
  const requesterRole = getUserRole(req);
  if (body.deputyAccess !== undefined && requesterRole === 'admin') {
    user.deputyAccess = !!body.deputyAccess;
  }
  
  try {
    writeUsersFile(data);
  } catch (err) {
    console.error('Failed to update users file (PUT):', err);
    return noStoreJson({ ok: false, error: 'Failed to update user' }, 500);
  }
  return noStoreJson({ ok: true, user: { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId, deputyAccess: !!user.deputyAccess } });
}

export async function DELETE(req: Request) {
  if (!isAdminOrDeptManager(req)) {
    return noStoreJson({ ok: false, error: 'Unauthorized' }, 403);
  }
  
  const userInfo = getUserInfo(req);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');
  if (!userId) return noStoreJson({ ok: false, error: 'User ID required' }, 400);
  
  const data = readUsersFile();
  const userToDelete = (data.users || []).find((u: any) => u.id === userId);
  if (!userToDelete) return noStoreJson({ ok: false, error: 'User not found' }, 404);
  
  // Department managers can only delete users in their department
  if (userInfo?.role === 'department_manager' && userToDelete.departmentId !== userInfo.departmentId) {
    return noStoreJson({ ok: false, error: 'Cannot delete users from other departments' }, 403);
  }
  
  const adminCount = (data.users || []).filter((u: any) => u.role === 'admin').length;
  if (userToDelete.role === 'admin' && adminCount === 1) {
    return noStoreJson({ ok: false, error: 'Cannot delete last admin' }, 400);
  }
  
  data.users = (data.users || []).filter((u: any) => u.id !== userId);
  try {
    writeUsersFile(data);
  } catch (err) {
    console.error('Failed to delete user:', err);
    return noStoreJson({ ok: false, error: 'Failed to delete user' }, 500);
  }
  return noStoreJson({ ok: true });
}
