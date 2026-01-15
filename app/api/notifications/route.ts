import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const notificationsFile = path.join(process.cwd(), 'data', 'notifications.json');

function readNotifications() {
  try {
    const data = fs.readFileSync(notificationsFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeNotifications(data: any[]) {
  fs.writeFileSync(notificationsFile, JSON.stringify(data, null, 2));
}

export async function GET() {
  const notifications = readNotifications();
  return NextResponse.json({ notifications });
}

export async function POST(req: Request) {
  const body = await req.json();
  const notifications = readNotifications();
  const newNotification = {
    id: Date.now().toString(),
    ...body,
    read: false,
    date: new Date().toISOString(),
  };
  notifications.unshift(newNotification);
  writeNotifications(notifications);
  return NextResponse.json({ notification: newNotification });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const notifications = readNotifications();
  const notification = notifications.find((n: any) => n.id === body.id);
  if (!notification) return NextResponse.json({ ok: false, error: 'Notification not found' }, { status: 404 });
  
  if (body.read !== undefined) notification.read = body.read;
  writeNotifications(notifications);
  return NextResponse.json({ ok: true });
}