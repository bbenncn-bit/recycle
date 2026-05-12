import { prisma } from '@/lib/prismadb';
import { purchaseInboundStorageArea } from '@/lib/purchase-warehouse-location';
import { isBaseSelfReceipt } from '@/lib/cost-receipt-classification';
import { parseWarehouseDate } from '@/lib/services/profit-service';

function norm(s: unknown): string {
  return (s != null ? String(s) : '').trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const n = parseFloat(String((v as { toString(): string }).toString()));
    return Number.isNaN(n) ? null : n;
  }
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 4/1 盘点滚存所在库区：平均采购单价列采用 MaterialStorage.current_price，不与入库单加权混算 */
const AVG_FROM_CURRENT_PRICE_STORAGE = new Set(['毛料库', '毛料库区一']);

export interface InventoryValueAnalysisRow {
  storageArea: string;
  materialType: string;
  currentQty: number;
  currentPrice: number;
  avgPurchaseUnitPrice: number | null;
  inventoryAmount: number;
  earliestPurchaseDate: string | null;
  latestPurchaseDate: string | null;
  latestPurchaseUnitPrice: number | null;
}

type Agg = {
  sumQty: number;
  sumAmount: number;
  minDate: Date | null;
  latest: { date: Date; id: number; unitPrice: number | null } | null;
};

/**
 * 毛料库存价值分析：当前库存来自 MaterialStorage；
 * 采购口径与入库同步一致（基地收货 SH、非红冲撤销），按库区+物料汇总 PurchaseWarehouse。
 */
export async function getInventoryValueAnalysisRows(): Promise<InventoryValueAnalysisRow[]> {
  const storages = await prisma.materialStorage.findMany({
    where: {
      currentQty: { gt: 0 },
    },
    select: {
      storageArea: true,
      materialType: true,
      currentQty: true,
      currentPrice: true,
    },
    orderBy: [{ storageArea: 'asc' }, { materialType: 'asc' }],
  });

  const purchases = await prisma.purchaseWarehouse.findMany({
    select: {
      id: true,
      receiptNo: true,
      warehouse: true,
      warehouseArea: true,
      material: true,
      estimatedDryBasis: true,
      totalPriceExcludingTax: true,
      unitPriceExcludingTax: true,
      warehouseDate: true,
      warehouseTime: true,
      status: true,
    },
    orderBy: { id: 'asc' },
  });

  const aggByKey = new Map<string, Agg>();

  for (const r of purchases) {
    const st = norm(r.status);
    if (st.includes('红冲') || st.includes('撤销')) continue;
    if (!isBaseSelfReceipt(r.receiptNo, r.warehouse)) continue;

    const storageArea = purchaseInboundStorageArea(r);
    const materialType = norm(r.material);
    const qty = toNum(r.estimatedDryBasis);
    let lineAmount = toNum(r.totalPriceExcludingTax);
    const unitPx = toNum(r.unitPriceExcludingTax);

    if (!storageArea || !materialType || qty == null || qty === 0) continue;

    // 总价缺失时用单价×数量，避免「只加吨数不加金额」把加权均价异常拉低
    if (lineAmount == null && unitPx != null && qty != null) {
      lineAmount = unitPx * qty;
    }
    // 仍无法还原金额则不参与加权汇总（否则分母偏大、均价失真）
    if (lineAmount == null) continue;

    const key = `${storageArea}\0${materialType}`;
    let agg = aggByKey.get(key);
    if (!agg) {
      agg = {
        sumQty: 0,
        sumAmount: 0,
        minDate: null,
        latest: null,
      };
      aggByKey.set(key, agg);
    }

    agg.sumQty += qty;
    agg.sumAmount += lineAmount;

    const dateStr = norm(r.warehouseDate || r.warehouseTime);
    const d = parseWarehouseDate(dateStr || null);
    if (d) {
      if (!agg.minDate || d < agg.minDate) agg.minDate = d;

      const prev = agg.latest;
      const id = r.id;
      if (
        !prev ||
        d > prev.date ||
        (d.getTime() === prev.date.getTime() && id > prev.id)
      ) {
        agg.latest = { date: d, id, unitPrice: unitPx };
      }
    }
  }

  const rows: InventoryValueAnalysisRow[] = [];

  for (const s of storages) {
    const sa = norm(s.storageArea);
    const mt = norm(s.materialType);
    if (!sa || !mt) continue;

    const qty = toNum(s.currentQty) ?? 0;
    const price = toNum(s.currentPrice) ?? 0;
    if (qty <= 0) continue;

    const key = `${sa}\0${mt}`;
    const agg = aggByKey.get(key);

    const useRollforwardPrice = AVG_FROM_CURRENT_PRICE_STORAGE.has(sa);
    const avgPurchase = useRollforwardPrice
      ? price
      : agg && Math.abs(agg.sumQty) > 1e-9
        ? agg.sumAmount / agg.sumQty
        : null;

    rows.push({
      storageArea: sa,
      materialType: mt,
      currentQty: qty,
      currentPrice: price,
      avgPurchaseUnitPrice: avgPurchase != null && Number.isFinite(avgPurchase) ? avgPurchase : null,
      inventoryAmount: qty * price,
      earliestPurchaseDate: agg?.minDate ? formatYmd(agg.minDate) : null,
      latestPurchaseDate: agg?.latest?.date ? formatYmd(agg.latest.date) : null,
      latestPurchaseUnitPrice:
        agg?.latest != null && agg.latest.unitPrice != null && Number.isFinite(agg.latest.unitPrice)
          ? agg.latest.unitPrice
          : null,
    });
  }

  return rows;
}
