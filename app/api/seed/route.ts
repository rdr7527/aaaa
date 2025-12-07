import { NextResponse } from 'next/server';
import { seedAdminIfEmpty } from '../../../lib/users';

export async function POST() {
  try {
    const admin = seedAdminIfEmpty();
    if (!admin) return NextResponse.json({ ok: true, created: false });
    return NextResponse.json({ ok: true, created: true, id: admin.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Error' }, { status: 500 });
  }
}
