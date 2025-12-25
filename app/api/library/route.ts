import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const libraryFile = path.join(dataDir, 'library.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize library.json if it doesn't exist
if (!fs.existsSync(libraryFile)) {
  fs.writeFileSync(libraryFile, JSON.stringify([]));
}

export async function GET() {
  try {
    const data = fs.readFileSync(libraryFile, 'utf8');
    let books = JSON.parse(data);
    // Add a default book if empty for testing
    if (books.length === 0) {
      books = [{
        id: 'default',
        title: 'كتاب تجريبي',
        url: 'https://example.com',
        departmentId: '1', // Assuming a department exists
        createdAt: new Date().toISOString(),
      }];
      fs.writeFileSync(libraryFile, JSON.stringify(books, null, 2));
    }
    return NextResponse.json(books);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load library' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, url, departmentId, uploaderId, uploaderName } = await request.json();
    if (!title || !url || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = fs.readFileSync(libraryFile, 'utf8');
    const books = JSON.parse(data);
    const newBook = {
      id: Date.now().toString(),
      title,
      url,
      departmentId,
      uploaderId,
      uploaderName,
      createdAt: new Date().toISOString(),
    };
    books.push(newBook);
    fs.writeFileSync(libraryFile, JSON.stringify(books, null, 2));
    return NextResponse.json(newBook, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add book' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing book id' }, { status: 400 });
    }

    const data = fs.readFileSync(libraryFile, 'utf8');
    let books = JSON.parse(data);
    books = books.filter((book: any) => book.id !== id);
    fs.writeFileSync(libraryFile, JSON.stringify(books, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}