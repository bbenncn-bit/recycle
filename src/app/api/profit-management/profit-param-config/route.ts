import { NextResponse } from 'next/server';
import { assertInventoryOpsAuthorized } from '@/lib/inventory-ops-request-auth';
import {
  applyProfitParamUpdates,
  listProfitParamConfigForAdmin,
} from '@/lib/services/profit-param-config-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  try {
    const rows = await listProfitParamConfigForAdmin();
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    const parsed = updates
      .map((u: { id?: unknown; newValue?: unknown; effectiveDate?: unknown }) => ({
        id: Number(u?.id),
        newValue: Number(u?.newValue),
        effectiveDate:
          typeof u?.effectiveDate === 'string' ? u.effectiveDate : undefined,
      }))
      .filter(
        (u: { id: number; newValue: number }) =>
          Number.isFinite(u.id) && u.id > 0 && Number.isFinite(u.newValue)
      );

    if (parsed.length === 0) {
      return NextResponse.json(
        { success: false, error: '未提供有效修改项' },
        { status: 400 }
      );
    }

    const applied = await applyProfitParamUpdates(parsed);
    if (applied.length === 0) {
      return NextResponse.json({
        success: true,
        data: { applied: [], message: '无参数发生变更' },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        applied,
        message:
          '参数已更新。发货日期早于各变更时间的结算单将按 previous_value 中的历史值核算；之后按新 value 核算。请刷新利润分析页查看结果。',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
