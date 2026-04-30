import { NextResponse } from 'next/server';
import { readUsersFile, writeUsersFile } from '@/lib/users';

function parseAuth(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('auth='));
  if (!m) return null;
  try { const token = m.split('=')[1]; return JSON.parse(Buffer.from(token, 'base64').toString('utf8')); } catch(e) { return null }
}

export async function POST(req: Request, { params }: { params: Promise<{ vidId: string }> }) {
  const { vidId } = await params;
  const data = readUsersFile();
  const payload = parseAuth(req);
  if (!payload) return NextResponse.json({ ok: false }, { status: 401 });

  let video: any = null;
  let subject: any = null;
  let dept: any = null;

  for (const d of data.departments || []) {
    for (const s of d.subjects || []) {
      const v = s.videos?.find((vid: any) => vid.id === vidId);
      if (v) {
        video = v;
        subject = s;
        dept = d;
        break;
      }
    }
    if (video) break;
  }

  if (!video) return NextResponse.json({ ok: false, error: 'Video not found' }, { status: 404 });

  // Check if user is enrolled in the subject
  if (!subject.students?.includes(payload.id)) return NextResponse.json({ ok: false, error: 'Not enrolled' }, { status: 403 });

  if (!video.completions) video.completions = [];
  const existing = video.completions.find((c: any) => c.userId === payload.id);
  if (!existing) {
    video.completions.push({ userId: payload.id, completedAt: new Date().toISOString() });
    writeUsersFile(data);
  }

  return NextResponse.json({ ok: true });
}