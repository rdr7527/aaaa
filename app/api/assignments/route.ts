import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'data', 'assignments.json');

function readData() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function writeData(data: any) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}
function getUserFromReq(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('auth='));
  if (!m) return null;
  try {
    const token = m.split('=')[1];
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  let departmentId = url.searchParams.get('departmentId');
  const all = readData();

  const user = getUserFromReq(req);
  if (user && user.role === 'department_manager') {
    if (!departmentId) departmentId = user.departmentId;
    else if (departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (departmentId) {
    const filtered = all.filter((a: any) => a.departmentId === departmentId);
    return NextResponse.json({ assignments: filtered });
  }
  return NextResponse.json({ assignments: all });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = getUserFromReq(req);
    if (user && user.role === 'department_manager') {
      if (!body.departmentId || body.departmentId !== user.departmentId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
    }
    const all = readData();
    const id = `a_${Date.now()}`;
    const assignment = { ...body, id, createdAt: new Date().toISOString(), completions: [] };
    all.unshift(assignment);
    writeData(all);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const user = getUserFromReq(req);
    const all = readData();
    const assignment = all.find((a: any) => a.id === id);
    if (!assignment) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Check authorization
    if (user) {
      if (user.role === 'department_manager') {
        if (assignment.departmentId !== user.departmentId) {
          return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
      } else if (user.role === 'teacher') {
        if (assignment.departmentId !== user.departmentId) {
          return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
    }

    const filtered = all.filter((a: any) => a.id !== id);
    writeData(filtered);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
}
