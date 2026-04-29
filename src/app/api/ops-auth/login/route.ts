import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismadb';
import {
  OPS_SESSION_COOKIE,
  signOpsSessionToken,
  verifyPassword,
} from '@/lib/ops-auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = String(body.username ?? '')
      .trim()
      .slice(0, 64);
    const password = String(body.password ?? '');
    if (!username || !password) {
      return NextResponse.json({ success: false, error: '请输入用户名和密码' }, { status: 400 });
    }

    const user = await prisma.opsConsoleUser.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ success: false, error: '用户名或密码错误' }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, error: '用户名或密码错误' }, { status: 401 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip =
      forwarded?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown';

    await prisma.opsConsoleUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip.slice(0, 45) },
    });

    const token = await signOpsSessionToken(user.id, user.username);
    const res = NextResponse.json({ success: true, data: { username: user.username } });
    res.cookies.set(OPS_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error('[ops-auth/login]', e);
    const msg = e instanceof Error ? e.message : '登录失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
