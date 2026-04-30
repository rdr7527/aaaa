import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const messagesFile = path.join(process.cwd(), 'data', 'messages.json');

function readMessages() {
  try {
    const data = fs.readFileSync(messagesFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeMessages(data: any[]) {
  fs.writeFileSync(messagesFile, JSON.stringify(data, null, 2));
}

export async function GET() {
  const messages = readMessages();
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages = readMessages();
  const newMessage = {
    id: Date.now().toString(),
    ...body,
    date: new Date().toISOString(),
  };
  messages.unshift(newMessage);
  writeMessages(messages);
  return NextResponse.json({ message: newMessage });
}