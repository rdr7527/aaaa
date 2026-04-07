import { NextResponse } from 'next/server';
import { readUsersFile } from '../../../lib/users';
import { readAttendanceFile, writeAttendanceFile, addAttendanceRecord } from '../../../lib/attendance';

function getUserInfo(req: any) {
  const authHeader = req.headers.get('cookie') || '';
  const cookie = authHeader.split(';').map((s: string) => s.trim()).find((s: string) => s.startsWith('auth='));
  if (!cookie) return null;
  const token = cookie.substring(cookie.indexOf('=') + 1);
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const data = readUsersFile();
    return (data.users || []).find((u: any) => u.id === payload.id);
  } catch (err) {
    console.error('Failed to parse auth token', err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo || (userInfo.role !== 'teacher' && userInfo.role !== 'department_manager')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { date, time, studentId, studentName, subjectId, status } = body;

    if (!date || !studentId || !subjectId || !status) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    // Check if record already exists for this date/student/subject
    const data = readAttendanceFile();
    const existingIndex = (data.records || []).findIndex((r: any) => 
      r.date === date && r.studentId === studentId && r.subjectId === subjectId
    );

    if (existingIndex >= 0) {
      // Update existing record
      data.records[existingIndex].status = status;
      data.records[existingIndex].time = time || '';
    } else {
      // Add new record
      const record = {
        id: `${Date.now()}-${studentId}`,
        date,
        time: time || '',
        studentId,
        studentName,
        subjectId,
        teacherId: userInfo.id,
        status,
      };
      data.records.push(record);
    }

    writeAttendanceFile(data);
    return NextResponse.json({ ok: true, message: 'Attendance recorded' });
  } catch (err) {
    console.error('Attendance POST error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) {
      return NextResponse.json({ ok: false, error: 'Missing subjectId' }, { status: 400 });
    }

    const data = readAttendanceFile();
    const records = (data.records || []).filter((r: any) => {
      if (String(r.subjectId) !== String(subjectId)) return false;
      if (date) return r.date === date;
      return true;
    });
    
    return NextResponse.json({ ok: true, records }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Attendance GET error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
