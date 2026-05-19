import { NextResponse } from 'next/server';
import { assertInventoryOpsAuthorized } from '@/lib/inventory-ops-request-auth';
import { listMaterialCostCacheRefreshLogs } from '@/lib/services/material-cost-cache-log-service';

export async function GET(request: Request) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50),
    );
    const logs = await listMaterialCostCacheRefreshLogs(limit);
    return NextResponse.json({
      success: true,
      data: logs.map((r) => ({
        id: r.id,
        createdAt: r.createdAt?.toISOString() ?? null,
        deliveryNumber: r.deliveryNumber,
        errorMessage: r.errorMessage,
      })),
    });
  } catch (error) {
    console.error('[material-cost-cache-logs GET]', error);
    const msg = error instanceof Error ? error.message : '读取失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
