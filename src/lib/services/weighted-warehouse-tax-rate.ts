import { prisma } from '@/lib/prismadb';
import { normalizeMaterialCategoryLabel } from '@/lib/material-label';
import {
  ALIAS_PREFIX_LABEL,
  LEGACY_MATERIAL_QTY_LABELS,
} from '@/lib/processing-cost-input-material-columns';
import { parseProductionDate } from './lifo-material-cost-service';
import type { MaterialStorageCatalogEntry } from './material-storage-inventory-service';
import { loadMaterialStorageCatalog } from './material-storage-inventory-service';
import { parseWarehouseDate } from './profit-service';

function processDecimal(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return parseFloat(String((value as { toString(): string }).toString())) || 0;
  }
  return 0;
}

/** 归一化入库税率到「小数比率」：13 → 0.13，0.13 保持 */
export function normalizeWarehouseTaxRate(raw: number): number {
  const v = Number.isFinite(raw) ? raw : 0;
  if (v <= 0) return 0;
  if (v > 1) return v / 100;
  if (v === 1) return 0.01;
  return v;
}

/** LIFO 材料展示名 → PurchaseWarehouse.material 可能取值 */
export function buildPurchaseMaterialCandidates(
  compositionLabel: string,
  catalog: MaterialStorageCatalogEntry[]
): string[] {
  const set = new Set<string>();
  const add = (s: string | null | undefined) => {
    const t = (s || '').trim();
    if (!t) return;
    set.add(t);
    const norm = normalizeMaterialCategoryLabel(t);
    if (norm && norm !== '未知类型') set.add(norm);
  };

  add(compositionLabel);
  const normLabel = normalizeMaterialCategoryLabel(compositionLabel);

  for (const e of catalog) {
    const alias = normalizeMaterialCategoryLabel(e.aliasName);
    const matType = normalizeMaterialCategoryLabel(e.materialType);
    if (
      alias === normLabel ||
      matType === normLabel ||
      e.aliasName === compositionLabel ||
      e.materialType === compositionLabel
    ) {
      add(e.materialType);
      add(e.aliasName);
    }
  }

  for (const display of Object.values(ALIAS_PREFIX_LABEL)) {
    if (display === compositionLabel || normalizeMaterialCategoryLabel(display) === normLabel) {
      add(display);
    }
  }
  for (const display of Object.values(LEGACY_MATERIAL_QTY_LABELS)) {
    if (display === compositionLabel || normalizeMaterialCategoryLabel(display) === normLabel) {
      add(display);
    }
  }

  return [...set];
}

export type WarehouseTaxRateContext = {
  catalog: MaterialStorageCatalogEntry[];
  /** `${sortedCandidates}|${cutoffMs}` → 小数税率 */
  cache: Map<string, number>;
};

export async function createWarehouseTaxRateContext(): Promise<WarehouseTaxRateContext> {
  const catalog = await loadMaterialStorageCatalog();
  return { catalog, cache: new Map() };
}

async function resolveMaterialTaxRateAtDate(
  compositionLabel: string,
  beforeDate: Date,
  ctx: WarehouseTaxRateContext
): Promise<number> {
  const candidates = buildPurchaseMaterialCandidates(compositionLabel, ctx.catalog);
  if (candidates.length === 0) return 0;

  const cacheKey = `${candidates.slice().sort().join('|')}|${beforeDate.getTime()}`;
  if (ctx.cache.has(cacheKey)) return ctx.cache.get(cacheKey)!;

  const rows = await prisma.purchaseWarehouse.findMany({
    where: {
      material: { in: candidates },
      warehouseDate: { not: null },
      taxRate: { not: null },
    },
    select: { warehouseDate: true, taxRate: true },
  });

  let bestRate: number | null = null;
  let bestTime = -1;
  for (const row of rows) {
    const d = parseWarehouseDate(row.warehouseDate);
    if (!d || d > beforeDate) continue;
    const t = d.getTime();
    if (t > bestTime) {
      bestTime = t;
      bestRate = normalizeWarehouseTaxRate(processDecimal(row.taxRate));
    }
  }

  const rate = bestRate ?? 0;
  ctx.cache.set(cacheKey, rate);
  return rate;
}

function resolveCutoffDate(
  productionRecords: Array<{ productionDate: string; quantity: number }>,
  fallbackDate?: Date | null
): Date | null {
  if (productionRecords?.length) {
    const totalProdQty = productionRecords.reduce((s, r) => s + (r.quantity ?? 0), 0);
    if (totalProdQty > 0) {
      let sumT = 0;
      let valid = 0;
      for (const r of productionRecords) {
        const d =
          parseProductionDate(r.productionDate) ?? parseWarehouseDate(r.productionDate);
        if (d && (r.quantity ?? 0) > 0) {
          sumT += (r.quantity ?? 0) * d.getTime();
          valid += r.quantity ?? 0;
        }
      }
      if (valid > 0) return new Date(sumT / valid);
    }
  }
  return fallbackDate ?? null;
}

/**
 * 按 LIFO 溯源毛料构成，从 PurchaseWarehouse.tax_rate 取各料「生产日期前最近一笔入库税率」，
 * 再按材料用量（吨）加权平均。
 */
export async function getWeightedAvgWarehouseTaxRate(
  materialComposition: Array<{ material: string; quantity: number }>,
  productionRecords: Array<{ productionDate: string; quantity: number }>,
  ctx: WarehouseTaxRateContext,
  fallbackDate?: Date | null
): Promise<number> {
  if (!materialComposition?.length) return 0;

  const cutoffDate = resolveCutoffDate(productionRecords, fallbackDate);
  if (!cutoffDate) return 0;

  const totalQty = materialComposition.reduce((s, m) => s + (m.quantity ?? 0), 0);
  if (totalQty <= 0) return 0;

  let weighted = 0;
  for (const m of materialComposition) {
    const rate = await resolveMaterialTaxRateAtDate(m.material, cutoffDate, ctx);
    weighted += (m.quantity ?? 0) * rate;
  }
  return weighted / totalQty;
}
