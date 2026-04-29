import fs from 'fs';
import path from 'path';

const TUTORIALS_FILE = path.join(process.cwd(), 'data', 'tutorials.json');

export function readTutorialsFile() {
  if (!fs.existsSync(TUTORIALS_FILE)) {
    return {
      student: { video: 'todehe.mp4', title: 'دليل الطالب', steps: [], tips: [] },
      teacher: { video: 'todehe.mp4', title: 'دليل الأستاذ', steps: [], tips: [] },
      general: { video: 'todehe.mp4', title: 'الدليل العام', steps: [], tips: [] }
    };
  }
  const data = fs.readFileSync(TUTORIALS_FILE, 'utf8');
  try {
    return JSON.parse(data);
  } catch (err) {
    return {
      student: { video: 'todehe.mp4', title: 'دليل الطالب', steps: [], tips: [] },
      teacher: { video: 'todehe.mp4', title: 'دليل الأستاذ', steps: [], tips: [] },
      general: { video: 'todehe.mp4', title: 'الدليل العام', steps: [], tips: [] }
    };
  }
}

export function writeTutorialsFile(obj: any) {
  const dir = path.dirname(TUTORIALS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TUTORIALS_FILE, JSON.stringify(obj, null, 2), 'utf8');
}