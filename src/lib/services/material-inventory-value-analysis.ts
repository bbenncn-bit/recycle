import { prisma } from '@/lib/prismadb';
import { purchaseInboundStorageArea } from '@/lib/purchase-warehouse-location';
import { isCentralBaseStockReceipt } from '@/lib/cost-receipt-classification';
import { parseWarehouseDate } from '@/lib/services/profit-service';
import { getClosingStateThroughDate } from '@/lib/services/material-storage-inventory-service';

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

function todayYmdLocal(): string {
  return formatYmd(new Date());
}

/** 4/1 盘点滚存所在库区：平均采购单价列采用滚存单价，不与入库单加权混算 */
const AVG_FROM_ROLLFORWARD_PRICE_STORAGE = new Set(['毛料库', '毛料库区一']);

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

const CACHE_MS = 3 * 60 * 1000;
let rowsCache: { at: number; rows: InventoryValueAnalysisRow[]; asOf: string } | null = null;

/**
 * 毛料库存价值分析（临时口径）：
 * 数量/计价 = 2026-03-31 期初 + 中心基地 SH 入库（含优质毛料库 / M钢渣粒子 / MP废钢库）− 加工耗用滚存至今日，
 * 仅剔除 TH 贸易直送。平均采购单价 / 最早·最近采购日按同一库存入库口径汇总。
 */
export async function getInventoryValueAnalysisRows(): Promise<InventoryValueAnalysisRow[]> {
  const asOf = todayYmdLocal();
  if (rowsCache && rowsCache.asOf === asOf && Date.now() - rowsCache.at < CACHE_MS) {
    return rowsCache.rows;
  }

  // 真实中心基地库存：滚存计入全部 SH（含三库），仅排除 TH
  const closing = await getClosingStateThroughDate(asOf);
  const storages = closing.filter((s) => (s.qty ?? 0) > 1e-9);

  const materialTypes = [
    ...new Set(storages.map((s) => norm(s.materialType)).filter(Boolean)),
  ];

  const aggByKey = new Map<string, Agg>();

  if (materialTypes.length > 0) {
    const purchases = await prisma.purchaseWarehouse.findMany({
      where: {
        material: { in: materialTypes },
      },
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

    for (const r of purchases) {
      const st = norm(r.status);
      if (st.includes('红冲') || st.includes('撤销')) continue;
      // 中心基地库存入库（含三库）；剔除 TH 贸易直送
      if (!isCentralBaseStockReceipt(r.receiptNo, r.warehouse)) continue;

      const storageArea = purchaseInboundStorageArea(r);
      const materialType = norm(r.material);
      const qty = toNum(r.estimatedDryBasis);
      let lineAmount = toNum(r.totalPriceExcludingTax);
      const unitPx = toNum(r.unitPriceExcludingTax);

      if (!storageArea || !materialType || qty == null || qty === 0) continue;

      if (lineAmount == null && unitPx != null && qty != null) {
        lineAmount = unitPx * qty;
      }
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
        if (!prev || d > prev.date || (d.getTime() === prev.date.getTime() && id > prev.id)) {
          agg.latest = { date: d, id, unitPrice: unitPx };
        }
      }
    }
  }

  const rows: InventoryValueAnalysisRow[] = [];

  for (const s of storages) {
    const sa = norm(s.storageArea);
    const mt = norm(s.materialType);
    if (!sa || !mt) continue;

    const qty = s.qty ?? 0;
    const price = s.price ?? 0;
    if (qty <= 0) continue;

    const key = `${sa}\0${mt}`;
    const agg = aggByKey.get(key);

    const useRollforwardPrice = AVG_FROM_ROLLFORWARD_PRICE_STORAGE.has(sa);
    const avgPurchase = useRollforwardPrice
      ? price
      : agg && Math.abs(agg.sumQty) > 1e-9
        ? agg.sumAmount / agg.sumQty
        : price > 0
          ? price
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

  rows.sort((a, b) => {
    const c = a.storageArea.localeCompare(b.storageArea, 'zh');
    if (c !== 0) return c;
    return a.materialType.localeCompare(b.materialType, 'zh');
  });

  rowsCache = { at: Date.now(), rows, asOf };
  return rows;
}
