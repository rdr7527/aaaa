import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '../../../lib/users';

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

export async function POST(req: Request) {
  const body = await req.json();
  if (!canManageDept(req, body.departmentId)) return NextResponse.json({ ok: false }, { status: 401 });
  
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === body.departmentId);
  if (!dept) return NextResponse.json({ ok: false, error: 'Department not found' }, { status: 404 });
  
  const subject = (dept.subjects || []).find((s: any) => s.id === body.subjectId);
  if (!subject) return NextResponse.json({ ok: false, error: 'Subject not found' }, { status: 404 });
  
  const video = {
    id: Date.now().toString(),
    title: body.title,
    url: body.url,
    description: body.description || '',
  };
  if (!subject.videos) subject.videos = [];
  subject.videos.push(video);
  writeUsersFile(data);
  return NextResponse.json({ ok: true, video });
}
