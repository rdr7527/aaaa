import fs from 'fs';
import path from 'path';
import os from 'os';

const DEFAULT_DATA_FILE = path.join(process.cwd(), 'data', 'attendance.json');
const DATA_FILE = process.env.DATA_FILE_PATH || (process.env.VERCEL ? path.join(os.tmpdir(), 'attendance.json') : DEFAULT_DATA_FILE);

export interface AttendanceRecord {
  id: string;
  date: string;
  time?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  teacherId: string;
  status: 'present' | 'absent'; // present or absent
}

export function readAttendanceFile() {
  if (!fs.existsSync(DATA_FILE)) return { records: [] };
  try {
    const encrypted = fs.readFileSync(DATA_FILE, 'utf-8');
    const decrypted = encrypted; // For now, no encryption
    return JSON.parse(decrypted);
  } catch {
    return { records: [] };
  }
}

export function writeAttendanceFile(obj: any) {
  try {
    const json = JSON.stringify(obj, null, 2);
    fs.writeFileSync(DATA_FILE, json, 'utf-8');
  } catch (err) {
    console.error('Failed to write attendance file:', err);
    throw err;
  }
}

export function addAttendanceRecord(record: AttendanceRecord) {
  const data = readAttendanceFile();
  if (!data.records) data.records = [];
  data.records.push(record);
  writeAttendanceFile(data);
  return record;
}

export function getAttendanceByDateAndSubject(date: string, subjectId: string) {
  const data = readAttendanceFile();
  return (data.records || []).filter((r: any) => r.date === date && r.subjectId === subjectId);
}

export function getStudentAttendance(studentId: string, subjectId: string) {
  const data = readAttendanceFile();
  return (data.records || []).filter((r: any) => r.studentId === studentId && r.subjectId === subjectId);
}
