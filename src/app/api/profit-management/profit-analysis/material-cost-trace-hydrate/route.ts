import { NextResponse } from 'next/server';
import { loadProcessingOrderCostSnapshots } from '@/lib/services/lifo-material-cost-service';

/**
 * 按加工单 id 批量补全投料明细（供材料成本跟踪表导出使用；兼容旧缓存无 materials）。
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.map((x) => Math.floor(Number(x))).filter((n) => n > 0)
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }
    if (ids.length > 2000) {
      return NextResponse.json(
        { success: false, error: '一次最多查询 2000 个加工单 id' },
        { status: 400 }
      );
    }

    const map = await loadProcessingOrderCostSnapshots(ids);
    const data: Record<
      string,
      {
        totalQty: number;
        unitCost: number;
        totalCost: number;
        productionDate: string;
        materials: Array<{ material: string; qty: number; price: number; cost: number }>;
      }
    > = {};
    for (const [id, snap] of map.entries()) {
      data[String(id)] = snap;
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
