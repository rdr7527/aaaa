import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '../../../lib/users';

function parseAuth(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return null;
  try { const token = m.split('=')[1]; return JSON.parse(Buffer.from(token, 'base64').toString('utf8')); } catch(e) { return null }
}

export async function POST(req: Request) {
  const body = await req.json();
  const data = readUsersFile();
  const dept = (data.departments || []).find((d: any) => d.id === body.departmentId);
  if (!dept) return NextResponse.json({ ok: false, error: 'Department not found' }, { status: 404 });
  const subject = (dept.subjects || []).find((s: any) => s.id === body.subjectId);
  if (!subject) return NextResponse.json({ ok: false, error: 'Subject not found' }, { status: 404 });

  const payload = parseAuth(req);
  if (!payload) return NextResponse.json({ ok: false }, { status: 401 });
  const allowed = payload.role === 'admin' ||
    (payload.role === 'department_manager' && payload.departmentId === body.departmentId) ||
    (payload.role === 'teacher' && payload.id === subject.teacherId);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 401 });

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

export async function GET(req: Request) {
  const data = readUsersFile();
  const videos: any[] = [];
  (data.departments || []).forEach((dept: any) => {
    (dept.subjects || []).forEach((subj: any) => {
      (subj.videos || []).forEach((v: any) => {
        videos.push({ ...v, departmentId: dept.id, subjectId: subj.id, subjectName: subj.name, departmentName: dept.name });
      });
    });
  });
  return NextResponse.json({ ok: true, videos });
}
