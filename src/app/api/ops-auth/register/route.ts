import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismadb';
import { hashPassword } from '@/lib/ops-auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = String(body.username ?? '')
      .trim()
      .slice(0, 64);
    const password = String(body.password ?? '');
    if (!username || username.length < 2) {
      return NextResponse.json({ success: false, error: '用户名至少 2 个字符' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: '密码至少 6 位' }, { status: 400 });
    }

    const hash = await hashPassword(password);
    await prisma.opsConsoleUser.create({
      data: {
        username,
        passwordHash: hash,
        permission: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        username,
        pendingApproval: true,
        message: '注册申请已提交，请等待管理员审核开通后再登录',
      },
    });
  } catch (e) {
    console.error('[ops-auth/register]', e);
    const msg =
      e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002'
        ? '用户名已存在'
        : e instanceof Error
          ? e.message
          : '注册失败';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
