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

function canManageDept(req: Request, deptId: string): boolean {
  const payload = parseAuth(req);
  if (!payload) return false;
  return payload.role === 'admin' ||
    (payload.role === 'department_manager' && payload.departmentId === deptId) ||
    (payload.role === 'teacher' && payload.departmentId === deptId);
}

function findSubjectById(data: any, subjectId: string) {
  for (const dept of (data.departments || [])) {
    if (!dept.subjects) continue;
    const idx = dept.subjects.findIndex((s: any) => s.id === subjectId);
    if (idx !== -1) return { dept, subject: dept.subjects[idx], index: idx };
  }
  return null;
}

export async function GET(req: Request) {
  const data = readUsersFile();
  const subjects: any[] = [];
  (data.departments || []).forEach((d: any) => {
    (d.subjects || []).forEach((s: any) => subjects.push({ ...s, departmentId: d.id }));
  });
  return NextResponse.json({ ok: true, subjects });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!canManageDept(req, body.departmentId)) return NextResponse.json({ ok: false }, { status: 401 });
  
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === body.departmentId);
  if (!dept) return NextResponse.json({ ok: false, error: 'Department not found' }, { status: 404 });
  
  const subject = {
    id: Date.now().toString(),
    name: body.name,
    description: body.description || '',
    videos: [],
    teacherId: body.teacherId || null,
    students: [],
  };
  if (!dept.subjects) dept.subjects = [];
  dept.subjects.push(subject);
  writeUsersFile(data);
  return NextResponse.json({ ok: true, subject });
}

export async function PUT(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const subjectId = parts.pop() || '';
  const body = await req.json();
  const data = readUsersFile();
  const found = findSubjectById(data, subjectId);
  if (!found) return NextResponse.json({ ok: false, error: 'Subject not found' }, { status: 404 });
  const { dept, subject } = found;
  if (!canManageDept(req, dept.id)) return NextResponse.json({ ok: false }, { status: 401 });
  if (body.name !== undefined) subject.name = body.name;
  if (body.description !== undefined) subject.description = body.description;
  if (body.teacherId !== undefined) subject.teacherId = body.teacherId;
  // allow adding/removing students via PUT
  if (body.addStudent) {
    const payload = parseAuth(req);
    if (!payload) return NextResponse.json({ ok: false }, { status: 401 });
    // if teacher is adding, ensure they are teacher of this subject
    if (payload.role === 'teacher' && subject.teacherId !== payload.id) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const studentId = body.addStudent;
    const student = (data.users || []).find((u: any) => u.id === studentId);
    if (!student) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
    if (student.role !== 'user') return NextResponse.json({ ok: false, error: 'Not a student' }, { status: 400 });
    if (!subject.students) subject.students = [];
    if (!subject.students.includes(studentId)) subject.students.push(studentId);
    writeUsersFile(data);
    return NextResponse.json({ ok: true, subject });
  }
  writeUsersFile(data);
  return NextResponse.json({ ok: true, subject });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const subjectId = parts.pop() || '';
  const data = readUsersFile();
  const found = findSubjectById(data, subjectId);
  if (!found) return NextResponse.json({ ok: false, error: 'Subject not found' }, { status: 404 });
  const { dept, index } = found as any;
  if (!canManageDept(req, dept.id)) return NextResponse.json({ ok: false }, { status: 401 });
  dept.subjects.splice(index, 1);
  writeUsersFile(data);
  return NextResponse.json({ ok: true });
}
