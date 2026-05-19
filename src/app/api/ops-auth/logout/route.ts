import { NextResponse } from 'next/server';
import { OPS_SESSION_COOKIE, opsSessionCookieSecure } from '@/lib/ops-auth';

export async function POST(request: Request) {
  const res = NextResponse.json({ success: true });
  res.cookies.set(OPS_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: opsSessionCookieSecure(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
