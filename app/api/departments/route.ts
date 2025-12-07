import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '../../../lib/users';

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
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const data = readUsersFile();

  if (id) {
    // If requesting a single department by id: allow admin or the department manager of that dept
    const payload = parseAuth(req);
    if (!payload) return NextResponse.json({ ok: false }, { status: 401 });
    const dept = (data.departments || []).find((d: any) => d.id === id);
    if (!dept) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    
    // Allow if admin OR if department_manager managing this dept
    const isAllowed = payload.role === 'admin' || 
                      (payload.role === 'department_manager' && payload.departmentId === id);
    
    if (isAllowed) {
      return NextResponse.json({ ok: true, department: dept });
    }
    
    // Also allow regular users viewing their own department
    if (payload.role === 'user' && payload.departmentId === id) {
      return NextResponse.json({ ok: true, department: dept });
    }
    
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // No id: only admin can list all departments
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, departments: data.departments || [] });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const data = readUsersFile();
  const dept = {
    id: Date.now().toString(),
    name: body.name,
    description: body.description || '',
    subjects: [],
  };
  if (!data.departments) data.departments = [];
  data.departments.push(dept);
  writeUsersFile(data);
  return NextResponse.json({ ok: true, department: dept });
}
