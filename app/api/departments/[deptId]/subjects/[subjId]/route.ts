import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '../../../../../../lib/users';

function canManageDept(req: Request, deptId: string): boolean {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return false;
  try {
    const token = m.split('=')[1];
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return payload.role === 'admin' || (payload.role === 'department_manager' && payload.departmentId === deptId);
  } catch(e) { return false }
}

export async function PUT(req: Request, { params }: { params: Promise<{ deptId: string; subjId: string }> }) {
  const { deptId, subjId } = await params;
  const body = await req.json();
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === deptId);
  if (!dept) return NextResponse.json({ ok: false }, { status: 404 });
  
  const subject = (dept.subjects || []).find((s: any) => s.id === subjId);
  if (!subject) return NextResponse.json({ ok: false }, { status: 404 });
  
  // If request is to add a student, allow the subject's teacher to perform it
  if (body.addStudent) {
    const cookie = req.headers.get('cookie') || '';
    const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
    if (!m) return NextResponse.json({ ok: false }, { status: 401 });
    try {
      const token = m.split('=')[1];
      const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      // Teacher may add students only to their own subject
      if (payload.role === 'teacher') {
        if (subject.teacherId !== payload.id) return NextResponse.json({ ok: false }, { status: 401 });
        const studentId = body.addStudent;
        const student = (data.users || []).find((u: any) => u.id === studentId);
        if (!student) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
        if (student.role !== 'user') return NextResponse.json({ ok: false, error: 'User is not a student' }, { status: 400 });
        subject.students = subject.students || [];
        if (!subject.students.includes(studentId)) subject.students.push(studentId);
        writeUsersFile(data);
        return NextResponse.json({ ok: true, subject });
      }
    } catch (e) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  // Non-teacher operations: require admin or department_manager
  if (!canManageDept(req, deptId)) return NextResponse.json({ ok: false }, { status: 401 });

  if (body.name) subject.name = body.name;
  if (body.description !== undefined) subject.description = body.description;

  writeUsersFile(data);
  return NextResponse.json({ ok: true, subject });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ deptId: string; subjId: string }> }) {
  const { deptId, subjId } = await params;
  if (!canManageDept(req, deptId)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === deptId);
  if (!dept) return NextResponse.json({ ok: false }, { status: 404 });
  
  dept.subjects = (dept.subjects || []).filter((s: any) => s.id !== subjId);
  writeUsersFile(data);
  return NextResponse.json({ ok: true });
}
