import { NextResponse } from 'next/server';
import {
  getOperationsStatus,
  getRecentMaterialStorageLogs,
  syncMaterialStorageFromPurchase,
  rebuildMaterialStorageFromPurchase,
  refreshMaterialCostCache,
} from '@/lib/services/inventory-ops-service';
import { deleteProcessingOrderWithRollback } from '@/lib/services/processing-order-delete-service';

function verifyOpsSecret(request: Request): NextResponse | null {
  const secret = process.env.INVENTORY_OPS_SECRET?.trim();
  if (!secret) return null;
  const h = request.headers.get('x-inventory-ops-secret')?.trim();
  if (h !== secret) {
    return NextResponse.json({ success: false, error: '未授权（请配置请求头 x-inventory-ops-secret）' }, { status: 401 });
  }
  return null;
}

/** 加工单管理员删除：须已配置并匹配 INVENTORY_OPS_SECRET */
function canProcessingDeleteAdmin(request: Request): boolean {
  const secret = process.env.INVENTORY_OPS_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('x-inventory-ops-secret')?.trim() === secret;
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
  | { action: 'refreshMaterialCostCache'; startDate: string; endDate: string }
  | { action: 'deleteProcessingOrder'; id: number; openid?: string | null };

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

    if (action === 'deleteProcessingOrder') {
      const id = Number((body as { id?: unknown }).id);
      const openid = (body as { openid?: string | null }).openid ?? null;
      const adminBypass = canProcessingDeleteAdmin(request);
      const result = await deleteProcessingOrderWithRollback({
        id,
        openid: typeof openid === 'string' ? openid : null,
        adminBypass,
      });
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, data: result },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          '未知 action（syncPurchase | rebuildPurchase | refreshMaterialCostCache | deleteProcessingOrder）',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[operations POST]', error);
    const msg = error instanceof Error ? error.message : '执行失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
