import { NextResponse } from 'next/server';
import {
  getOperationsStatus,
  getRecentMaterialStorageLogs,
  syncMaterialStorageFromPurchase,
  rebuildMaterialStorageFromPurchase,
  refreshMaterialCostCache,
} from '@/lib/services/inventory-ops-service';

function verifyOpsSecret(request: Request): NextResponse | null {
  const secret = process.env.INVENTORY_OPS_SECRET?.trim();
  if (!secret) return null;
  const h = request.headers.get('x-inventory-ops-secret')?.trim();
  if (h !== secret) {
    return NextResponse.json({ success: false, error: '未授权（请配置请求头 x-inventory-ops-secret）' }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = verifyOpsSecret(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const logLimit = Math.min(200, Math.max(10, parseInt(searchParams.get('logLimit') || '50', 10) || 50));

    const status = await getOperationsStatus();
    const rawLogs = await getRecentMaterialStorageLogs(logLimit);
    const recentLogs = rawLogs.map((r) => ({
      ...r,
      id: typeof r.id === 'bigint' ? r.id.toString() : r.id,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        recentLogs,
      },
    });
  } catch (error) {
    console.error('[operations GET]', error);
    const msg = error instanceof Error ? error.message : '读取失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

type PostBody =
  | { action: 'syncPurchase'; maxRows?: number; trigger?: string }
  | { action: 'rebuildPurchase'; touchOnlyMatched?: boolean }
  | { action: 'refreshMaterialCostCache'; startDate: string; endDate: string };

export async function POST(request: Request) {
  const denied = verifyOpsSecret(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as PostBody;
    const action = body?.action;

    if (action === 'syncPurchase') {
      const result = await syncMaterialStorageFromPurchase({
        maxRows: body.maxRows,
        trigger: body.trigger,
      });
      return NextResponse.json({ success: result.success !== false, data: result });
    }

    if (action === 'rebuildPurchase') {
      const result = await rebuildMaterialStorageFromPurchase({
        touchOnlyMatched: body.touchOnlyMatched,
      });
      return NextResponse.json({ success: result.success !== false, data: result });
    }

    if (action === 'refreshMaterialCostCache') {
      await refreshMaterialCostCache(body.startDate, body.endDate);
      return NextResponse.json({
        success: true,
        data: { message: '已执行 CALL sp_update_material_cost_cache(开始, 结束)' },
      });
    }

    return NextResponse.json(
      { success: false, error: '未知 action（syncPurchase | rebuildPurchase | refreshMaterialCostCache）' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[operations POST]', error);
    const msg = error instanceof Error ? error.message : '执行失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
