import { NextResponse } from 'next/server';
import { readUsersFile, verifyPassword, seedAdminIfEmpty } from '../../../lib/users';

export async function POST(req: Request) {
  try {
    seedAdminIfEmpty();
    const { username, password } = await req.json();
    const data = readUsersFile();
    const user = (data.users || []).find((u: any) => u.id === username);
    if (!user) return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
    const ok = verifyPassword(password, user.password);
    if (!ok) return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
    // Create a simple signed token (not JWT) -> HMAC not required for demo; we set cookie with base64 user id
    const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role, departmentId: user.departmentId || null })).toString('base64');
    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId || null } });
    // Build cookie with SameSite and optional Secure in production
    const maxAge = 60 * 60 * 24; // 1 day
    const cookieParts = [`auth=${token}`, 'HttpOnly', 'Path=/', `Max-Age=${maxAge}`, 'SameSite=Lax'];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    res.headers.set('Set-Cookie', cookieParts.join('; '));
    // prevent caching of login response
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
