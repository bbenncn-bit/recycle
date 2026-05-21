import { prisma } from '@/lib/prismadb';
import {
  ALIAS_PREFIX_LABEL,
  MATERIAL_ALIAS_PREFIXES,
} from '@/lib/processing-cost-input-material-columns';

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const n = parseFloat(String((v as { toString(): string }).toString()));
    return Number.isNaN(n) ? null : n;
  }
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

function parseJsonField(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw;
  return null;
}

/** 解析加工日期并得到 YYYY-MM */
export function getProductionMonthKey(productionDate: string | null | undefined): string | null {
  const t = (productionDate ?? '').trim();
  if (!t) return null;
  const d = new Date(t);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    return `${mdy[3]}-${String(parseInt(mdy[1], 10)).padStart(2, '0')}`;
  }
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(parseInt(iso[2], 10)).padStart(2, '0')}`;
  }
  return null;
}

function getRowField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
    const lower = k.toLowerCase();
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase() === lower) return row[rk];
    }
  }
  return undefined;
}

function getMaterialWarehousePrefixes(row: Record<string, unknown>): string[] | null {
  const mwRaw = parseJsonField(
    getRowField(row, 'material_warehouses', 'materialWarehouses')
  );
  if (!mwRaw || typeof mwRaw !== 'object' || Array.isArray(mwRaw)) return null;
  const keys = Object.keys(mwRaw as Record<string, unknown>).filter((k) => k.trim());
  return keys.length > 0 ? keys : null;
}

/** 投料组成：按 material_warehouses 中的毛料种类，取对应 XXX_qty / XXX_price；仅展示 qty>0 */
export function formatMaterialFeedComposition(row: Record<string, unknown>): string {
  const parts: string[] = [];
  const allowed = getMaterialWarehousePrefixes(row);

  const compRaw = parseJsonField(
    getRowField(row, 'material_composition', 'materialComposition')
  );
  if (Array.isArray(compRaw) && compRaw.length > 0) {
    for (const it of compRaw as Array<Record<string, unknown>>) {
      const prefix = String(it.material ?? '').trim();
      if (allowed && !allowed.includes(prefix)) continue;
      const tons = toNum(it.tons ?? it.quantity);
      if (!prefix || tons == null || tons <= 0) continue;
      const label = ALIAS_PREFIX_LABEL[prefix] ?? prefix;
      const price = toNum(getRowField(row, `${prefix}_price`, `${prefix}Price`));
      parts.push(
        `${label} ${tons}吨${price != null ? `，单价${price}` : ''}`
      );
    }
    if (parts.length > 0) return parts.join('；');
  }

  const prefixList = allowed ?? [...MATERIAL_ALIAS_PREFIXES];
  for (const prefix of prefixList) {
    const qty = toNum(getRowField(row, `${prefix}_qty`, `${prefix}Qty`));
    if (qty == null || qty <= 0) continue;
    const label = ALIAS_PREFIX_LABEL[prefix] ?? prefix;
    const price = toNum(getRowField(row, `${prefix}_price`, `${prefix}Price`));
    parts.push(
      `${label} ${qty}吨${price != null ? `，单价${price}` : ''}`
    );
  }

  return parts.length > 0 ? parts.join('；') : '—';
}

export type ProcessingCostInputListItem = {
  id: number;
  productName: string;
  productionDate: string;
  materialFeed: string;
  dailyProcessQty: number;
  dailyProcessAmount: number;
};

export async function listProcessingCostInputByMonth(
  month: string
): Promise<{ month: string; rows: ProcessingCostInputListItem[]; total: number }> {
  const m = month.trim();
  if (!/^\d{4}-\d{2}$/.test(m)) {
    throw new Error('月份须为 YYYY-MM 格式');
  }

  const rawRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ProcessingCostInput WHERE production_date IS NOT NULL AND TRIM(production_date) <> '' ORDER BY production_date ASC, id ASC`
  );

  const rows: ProcessingCostInputListItem[] = [];
  for (const row of rawRows) {
    const prodDate = String(getRowField(row, 'production_date', 'productionDate') ?? '').trim();
    if (getProductionMonthKey(prodDate) !== m) continue;

    const qty =
      toNum(getRowField(row, 'dailyProcess_qty', 'dailyProcessQty', 'product_tons', 'productTons')) ?? 0;
    const amount =
      toNum(getRowField(row, 'dailyProcess_amount', 'dailyProcessAmount')) ?? 0;

    rows.push({
      id: Number(row.id),
      productName: String(getRowField(row, 'product_name', 'productName') ?? '').trim() || '—',
      productionDate: prodDate,
      materialFeed: formatMaterialFeedComposition(row),
      dailyProcessQty: qty,
      dailyProcessAmount: amount,
    });
  }

  return { month: m, rows, total: rows.length };
}
