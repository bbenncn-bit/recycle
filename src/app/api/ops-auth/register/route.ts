import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismadb';
import { hashPassword } from '@/lib/ops-auth';

export async function POST(request: Request) {
  try {
    const allowExtra =
      process.env.OPS_ALLOW_REGISTER?.trim() === '1' ||
      process.env.OPS_ALLOW_REGISTER?.trim()?.toLowerCase() === 'true';

    const count = await prisma.opsConsoleUser.count();
    if (count > 0 && !allowExtra) {
      return NextResponse.json(
        { success: false, error: '已存在账号，禁止自助注册。如需新增请联系管理员或设置 OPS_ALLOW_REGISTER=1' },
        { status: 403 }
      );
    }

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
      },
    });

    return NextResponse.json({ success: true, data: { username } });
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
