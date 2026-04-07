import { NextResponse } from 'next/server';
import { readUsersFile } from '../../../../lib/users';
import { readAttendanceFile } from '../../../../lib/attendance';
import * as XLSX from 'xlsx';

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

export async function GET(req: Request) {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo || (userInfo.role !== 'teacher' && userInfo.role !== 'department_manager' && userInfo.role !== 'admin')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const date = searchParams.get('date');

    // Read attendance data
    const attendanceData = readAttendanceFile();
    let records = (attendanceData.records || []);

    // Filter by subjectId if provided
    if (subjectId) {
      records = records.filter((r: any) => String(r.subjectId) === String(subjectId));
    }

    // Filter by date if provided
    if (date) {
      records = records.filter((r: any) => r.date === date);
    }

    // For teachers, only show their own records
    if (userInfo.role === 'teacher') {
      records = records.filter((r: any) => r.teacherId === userInfo.id);
    }

    // Prepare data for Excel
    const excelData = records.map((record: any) => ({
      'رقم الطالب': record.studentId,
      'اسم الطالب': record.studentName,
      'التاريخ': record.date,
      'الوقت': record.time || '-',
      'المادة': record.subjectId,
      'الحالة': record.status === 'present' ? 'حاضر ✓' : 'غائب ✗',
      'المعلم': record.teacherId,
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Student ID
      { wch: 15 }, // Student Name
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 12 }, // Subject
      { wch: 12 }, // Status
      { wch: 12 }, // Teacher
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'الغيابات');

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Generate filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                     now.getMinutes().toString().padStart(2, '0');
    const filename = `attendance_${dateStr}_${timeStr}.xlsx`;

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Attendance export error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
