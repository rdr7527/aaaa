import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const DATA_FILE = path.join(process.cwd(), 'data', 'graduation_projects.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'graduation');

export async function GET() {
  try {
    const raw = await fs.promises.readFile(DATA_FILE, 'utf-8').catch(() => '[]');
    const projects = JSON.parse(raw || '[]');
    return NextResponse.json({ projects });
  } catch (e) {
    return new Response('خطأ في جلب المشاريع', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as any;
    const title = (form.get('title') as string) || null;
    const departmentId = (form.get('departmentId') as string) || null;
    if (!file) return new Response('الملف مفقود', { status: 400 });
    // build safe filename from title when provided
    function sanitizeName(n: string) {
      return n
        .replace(/[^0-9a-zA-Z\u0600-\u06FF\-_. ]+/g, '') // allow Arabic range and common chars
        .trim()
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_') || '';
    }
    const base = title ? sanitizeName(title) : sanitizeName(file.name || 'upload');
    const filename = base ? `${base}_${Date.now()}.pdf` : `${Date.now()}_${(file.name || 'upload.pdf').replace(/\s+/g, '_')}`;
    if (file.type !== 'application/pdf') return new Response('الملف يجب أن يكون PDF', { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    const savePath = path.join(UPLOAD_DIR, filename);
    await fs.promises.writeFile(savePath, buffer);

    // store metadata
    const raw = await fs.promises.readFile(DATA_FILE, 'utf-8').catch(() => '[]');
    const projects = JSON.parse(raw || '[]');
    const project = {
      id: String(Date.now()),
      name: title || file.name,
      originalName: file.name,
      filename,
      url: `/uploads/graduation/${filename}`,
      departmentId: departmentId || null,
      uploadedAt: new Date().toISOString(),
    };
    projects.unshift(project);
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), 'utf-8');

    return NextResponse.json({ project });
  } catch (e) {
    return new Response('فشل في رفع الملف', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('معرِّف المشروع مطلوب', { status: 400 });

    const raw = await fs.promises.readFile(DATA_FILE, 'utf-8').catch(() => '[]');
    const projects = JSON.parse(raw || '[]');
    const idx = projects.findIndex((p: any) => String(p.id) === String(id));
    if (idx === -1) return new Response('المشروع غير موجود', { status: 404 });
    const proj = projects[idx];
    // remove file if exists
    if (proj && proj.filename) {
      const filePath = path.join(UPLOAD_DIR, proj.filename);
      try { await fs.promises.unlink(filePath); } catch (_) { /* ignore */ }
    }
    projects.splice(idx, 1);
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (e) {
    return new Response('فشل في حذف المشروع', { status: 500 });
  }
}
