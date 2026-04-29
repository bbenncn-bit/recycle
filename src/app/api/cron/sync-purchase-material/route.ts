import { NextResponse } from 'next/server';
import { syncMaterialStorageFromPurchase } from '@/lib/services/inventory-ops-service';

/**
 * 定时任务 / ETL 完成后调用：按 PurchaseWarehouse 增量同步至 MaterialStorage。
 * 配置环境变量 CRON_SYNC_SECRET，请求头：Authorization: Bearer <secret>
 * 或 x-cron-sync-secret: <secret>
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SYNC_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { success: false, error: '未配置 CRON_SYNC_SECRET' },
      { status: 503 }
    );
  }

  const auth = request.headers.get('authorization')?.trim();
  const bearer =
    auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = request.headers.get('x-cron-sync-secret')?.trim();
  if (bearer !== secret && header !== secret) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { maxRows?: number };
    const result = await syncMaterialStorageFromPurchase({
      maxRows: body.maxRows ?? 10_000,
      trigger: 'cron_sync_purchase',
    });
    return NextResponse.json({ success: result.success !== false, data: result });
  } catch (e) {
    console.error('[cron/sync-purchase-material]', e);
    const msg = e instanceof Error ? e.message : '同步失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
