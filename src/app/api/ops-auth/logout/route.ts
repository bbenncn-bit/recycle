import { NextResponse } from 'next/server';
import { OPS_SESSION_COOKIE } from '@/lib/ops-auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(OPS_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
