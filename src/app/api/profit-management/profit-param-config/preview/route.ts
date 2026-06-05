import { NextResponse } from 'next/server';
import { assertInventoryOpsAuthorized } from '@/lib/inventory-ops-request-auth';
import { getProfitPreviewBasis } from '@/lib/services/profit-analysis-service';
import {
  applyWarehouseTaxToBasis,
  buildParamSnapshot,
  computeProfitSubitems,
  loadAllParamConfigRows,
  type ParamConfigRow,
  type ProfitRowBasis,
} from '@/lib/services/profit-param-config-service';

export const dynamic = 'force-dynamic';

/** GET：取当月（或指定月）首行结算单样本 + 按当前参数算出的 9/10/11/利润/吨钢毛利 */
export async function GET(request: Request) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;
    const preview = await getProfitPreviewBasis(month);

    const rows = await loadAllParamConfigRows();
    const deliveryDate = new Date(preview.deliveryDateIso);
    const effectiveBasis = applyWarehouseTaxToBasis(preview.basis, rows, deliveryDate);
    const snapshot = buildParamSnapshot(rows, deliveryDate, effectiveBasis.customer);
    const subitems = computeProfitSubitems(effectiveBasis, snapshot);

    return NextResponse.json({
      success: true,
      data: { ...preview, basis: effectiveBasis, snapshot, subitems },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST：套用"草稿参数"对给定基础量即时试算（不落库）。
 * body: { basis, deliveryDateIso, draft: [{ id, value }] }
 */
export async function POST(request: Request) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const basis = body?.basis as ProfitRowBasis | undefined;
    const deliveryDateIso =
      typeof body?.deliveryDateIso === 'string' ? body.deliveryDateIso : null;
    const draftRaw = Array.isArray(body?.draft) ? body.draft : [];

    if (!basis || typeof basis !== 'object') {
      return NextResponse.json(
        { success: false, error: '缺少基础量 basis' },
        { status: 400 }
      );
    }

    const draftById = new Map<number, number>();
    for (const d of draftRaw) {
      const id = Number((d as { id?: unknown })?.id);
      const value = Number((d as { value?: unknown })?.value);
      if (Number.isFinite(id) && id > 0 && Number.isFinite(value)) {
        draftById.set(id, value);
      }
    }

    const rows = await loadAllParamConfigRows();
    // 套用草稿：覆盖对应 id 的 value，并清空历史（使新值无视日期直接生效）
    const draftRows: ParamConfigRow[] = rows.map((r) =>
      draftById.has(r.id)
        ? { ...r, value: draftById.get(r.id)!, previousValueRaw: null }
        : r
    );

    const deliveryDate = deliveryDateIso ? new Date(deliveryDateIso) : new Date();
    const effectiveBasis = applyWarehouseTaxToBasis(
      basis.warehouseTaxRateFromLifo && (basis.warehouseTaxRate ?? 0) > 0
        ? basis
        : { ...basis, warehouseTaxRate: 0, warehouseTaxRateFromLifo: false },
      draftRows,
      deliveryDate
    );
    const snapshot = buildParamSnapshot(draftRows, deliveryDate, effectiveBasis.customer);
    const subitems = computeProfitSubitems(effectiveBasis, snapshot);

    return NextResponse.json({ success: true, data: { snapshot, subitems } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
