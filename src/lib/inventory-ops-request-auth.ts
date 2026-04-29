import { NextResponse } from 'next/server';
import { verifyOpsSessionFromRequest } from '@/lib/ops-auth';

/**
 * 运维 API 仅允许已通过运维控制台登录的会话（Cookie `ops_session`）。
 * 浏览器必须先登录；不再接受 x-inventory-ops-secret 绕过（脚本请使用专用 Cron 等接口）。
 */
export async function assertInventoryOpsAuthorized(request: Request): Promise<NextResponse | null> {
  const session = await verifyOpsSessionFromRequest(request);
  if (session) return null;

  return NextResponse.json(
    {
      success: false,
      error: '未授权：请先登录运维控制台（算账经营 → 运维）',
    },
    { status: 401 }
  );
}
