import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const previousQuestionsFile = path.join(dataDir, 'previous_questions.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize file if it doesn't exist
if (!fs.existsSync(previousQuestionsFile)) {
  fs.writeFileSync(previousQuestionsFile, JSON.stringify({ previousQuestions: [] }, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const data = JSON.parse(fs.readFileSync(previousQuestionsFile, 'utf-8'));
    let questions = data.previousQuestions || [];

    if (departmentId) {
      questions = questions.filter((q: any) => q.departmentId === departmentId);
    }

    return NextResponse.json({ previousQuestions: questions });
  } catch (error) {
    console.error('Error reading previous questions:', error);
    return NextResponse.json({ error: 'Failed to load previous questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, departmentId } = body;

    if (!question || !answer || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = JSON.parse(fs.readFileSync(previousQuestionsFile, 'utf-8'));
    const newQuestion = {
      id: Date.now().toString(),
      question,
      answer,
      departmentId,
      createdAt: new Date().toISOString(),
    };

    data.previousQuestions.push(newQuestion);
    fs.writeFileSync(previousQuestionsFile, JSON.stringify(data, null, 2));

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating previous question:', error);
    return NextResponse.json({ error: 'Failed to create previous question' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const data = JSON.parse(fs.readFileSync(previousQuestionsFile, 'utf-8'));
    data.previousQuestions = data.previousQuestions.filter((q: any) => q.id !== id);
    fs.writeFileSync(previousQuestionsFile, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting previous question:', error);
    return NextResponse.json({ error: 'Failed to delete previous question' }, { status: 500 });
  }
}