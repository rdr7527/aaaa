import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '../../../../../../../../lib/users';

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

export async function PUT(req: Request, { params }: { params: Promise<{ deptId: string; subjId: string; vidId: string }> }) {
  const { deptId, subjId, vidId } = await params;
  if (!canManageDept(req, deptId)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === deptId);
  if (!dept) return NextResponse.json({ ok: false }, { status: 404 });
  
  const subject = (dept.subjects || []).find((s: any) => s.id === subjId);
  if (!subject) return NextResponse.json({ ok: false }, { status: 404 });
  
  const video = (subject.videos || []).find((v: any) => v.id === vidId);
  if (!video) return NextResponse.json({ ok: false }, { status: 404 });
  
  if (body.title) video.title = body.title;
  if (body.url) video.url = body.url;
  if (body.description !== undefined) video.description = body.description;
  
  writeUsersFile(data);
  return NextResponse.json({ ok: true, video });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ deptId: string; subjId: string; vidId: string }> }) {
  const { deptId, subjId, vidId } = await params;
  if (!canManageDept(req, deptId)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === deptId);
  if (!dept) return NextResponse.json({ ok: false }, { status: 404 });
  
  const subject = (dept.subjects || []).find((s: any) => s.id === subjId);
  if (!subject) return NextResponse.json({ ok: false }, { status: 404 });
  
  subject.videos = (subject.videos || []).filter((v: any) => v.id !== vidId);
  writeUsersFile(data);
  return NextResponse.json({ ok: true });
}
