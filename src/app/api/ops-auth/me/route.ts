import { NextResponse } from 'next/server';
import { verifyOpsSessionFromRequest } from '@/lib/ops-auth';

export async function GET(request: Request) {
  const session = await verifyOpsSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    data: { username: session.username, userId: session.sub },
  });
}
