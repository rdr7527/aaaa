import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VIDEO_DIR = path.join(process.cwd(), 'public', 'home', 'video');

function sanitizeFileName(name: string) {
  const clean = path.basename(name).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  return clean || 'uploaded_video';
}

export async function GET(req: NextRequest) {
  try {
    await fs.promises.mkdir(VIDEO_DIR, { recursive: true });
    const items = await fs.promises.readdir(VIDEO_DIR);
    const files = items.filter((file) => /\.(mp4|webm|ogg|mov|mkv)$/i.test(file));
    return NextResponse.json({ ok: true, files });
  } catch (error) {
    console.error('Failed to list video files', error);
    return NextResponse.json({ ok: false, error: 'Failed to list video files' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    await fs.promises.mkdir(VIDEO_DIR, { recursive: true });
    const fileName = sanitizeFileName(file.name);
    let targetPath = path.join(VIDEO_DIR, fileName);

    if (fs.existsSync(targetPath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      targetPath = path.join(VIDEO_DIR, `${base}_${Date.now()}${ext}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(targetPath, buffer);

    return NextResponse.json({ ok: true, name: path.basename(targetPath), url: `/home/video/${path.basename(targetPath)}` });
  } catch (error) {
    console.error('Failed to upload video', error);
    return NextResponse.json({ ok: false, error: 'Failed to upload video' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ ok: false, error: 'Missing file name' }, { status: 400 });
  }

  const safeName = sanitizeFileName(name);
  const targetPath = path.join(VIDEO_DIR, safeName);

  if (!targetPath.startsWith(VIDEO_DIR)) {
    return NextResponse.json({ ok: false, error: 'Invalid file name' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
    }

    await fs.promises.unlink(targetPath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete video', error);
    return NextResponse.json({ ok: false, error: 'Failed to delete video' }, { status: 500 });
  }
}
