import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate } from '@/lib/services/profit-service';
import { parseProductionDate } from '@/lib/services/lifo-material-cost-service';
import { isCentralBaseStockReceipt } from '@/lib/cost-receipt-classification';
import { purchaseInboundStorageArea } from '@/lib/purchase-warehouse-location';

function dec(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return parseFloat(String((value as { toString(): string }).toString())) || 0;
  }
  return 0;
}

function norm(s: string | null | undefined): string {
  return (s || '').trim();
}

/** 滚存起点：2026-04-01 起计入采购与加工（3/31 期末已体现在 MaterialStorage 两列） */
export const MATERIAL_INVENTORY_ROLL_START = new Date(2026, 3, 1, 0, 0, 0, 0);

export interface MaterialStorageRowSnapshot {
  id: number;
  storageArea: string;
  materialType: string;
  aliasName: string;
  qty: number;
  price: number;
}

/** MaterialStorage 标准毛料目录（库区 + 毛料类型 + 别名） */
export interface MaterialStorageCatalogEntry {
  storageArea: string;
  materialType: string;
  aliasName: string;
  key: string;
}

export async function loadMaterialStorageCatalog(): Promise<MaterialStorageCatalogEntry[]> {
  const rows = await prisma.materialStorage.findMany({
    select: { storageArea: true, materialType: true, aliasName: true },
    orderBy: [{ storageArea: 'asc' }, { materialType: 'asc' }],
  });
  return rows.map((r) => {
    const storageArea = norm(r.storageArea) || '—';
    const materialType = norm(r.materialType) || '—';
    return {
      storageArea,
      materialType,
      aliasName: norm(r.aliasName),
      key: `${storageArea}\0${materialType}`,
    };
  });
}

/**
 * 将加工耗用/采购行上的库区+名称（可能是 alias_name）解析为标准 key：storage_area\0material_type。
 * 与滚存 matchStorageRowIndex 口径一致：先库区+毛料类型，再按别名匹配。
 */
export function buildMaterialStorageKeyResolver(
  catalog: MaterialStorageCatalogEntry[]
): (warehouse: string, materialOrAlias: string) => string | null {
  const canonicalKeySet = new Set(catalog.map((e) => e.key));
  const aliasToKey = new Map<string, string>();
  for (const e of catalog) {
    if (e.aliasName) aliasToKey.set(e.aliasName, e.key);
  }
  return (warehouse: string, materialOrAlias: string): string | null => {
    const w = norm(warehouse);
    const m = norm(materialOrAlias);
    if (!m) return null;
    const exact = `${w}\0${m}`;
    if (canonicalKeySet.has(exact)) return exact;
    const byAlias = aliasToKey.get(m);
    if (byAlias) return byAlias;
    const byType = catalog.find((e) => e.materialType === m && (!w || e.storageArea === w));
    return byType?.key ?? null;
  };
}

type CompItem = {
  warehouse?: string;
  material?: string;
  shortName?: string;
  tons?: number;
};

function parseCompositionJson(raw: unknown): CompItem[] | null {
  if (raw == null) return null;
  let arr: unknown[];
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
    try {
      arr = JSON.parse(raw.toString('utf8')) as unknown[];
    } catch {
      return null;
    }
  } else if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw) as unknown[];
    } catch {
      return null;
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return null;
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr as CompItem[];
}

/** DB 若无 material_composition 列则返回 false，避免 Prisma 选列报错 */
async function processingTableHasMaterialComposition(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint | number }>>(
      "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER('ProcessingCostInput') AND COLUMN_NAME = 'material_composition'"
    );
    const n = rows[0]?.cnt;
    return Number(n) > 0;
  } catch {
    return false;
  }
}

async function loadProcessingCompositionRows(): Promise<
  Array<{ productionDate: string | null; composition: CompItem[] | null }>
> {
  const hasCol = await processingTableHasMaterialComposition();
  if (!hasCol) {
    console.warn(
      '[material-storage-inventory] 表 ProcessingCostInput 无 material_composition 列，加工耗用暂不扣减；请执行迁移增加该列后可按构成扣库存。'
    );
    return [];
  }
  const raw = await prisma.$queryRawUnsafe<
    Array<{ production_date: string | null; material_composition: unknown }>
  >(
    'SELECT production_date, material_composition FROM ProcessingCostInput WHERE production_date IS NOT NULL'
  );
  return raw.map((r) => ({
    productionDate: r.production_date,
    composition: parseCompositionJson(r.material_composition),
  }));
}

function matchStorageRowIndex(
  rows: MaterialStorageRowSnapshot[],
  item: CompItem
): number {
  const w = norm(item.warehouse);
  const m = norm(item.material);
  if (w && m) {
    const i = rows.findIndex((r) => norm(r.storageArea) === w && norm(r.materialType) === m);
    if (i >= 0) return i;
  }
  const sn = norm(item.shortName);
  if (sn) {
    const j = rows.findIndex((r) => norm(r.aliasName) === sn);
    if (j >= 0) return j;
  }
  return -1;
}

function matchPurchaseRowIndex(
  rows: MaterialStorageRowSnapshot[],
  warehouse: string,
  material: string
): number {
  const w = norm(warehouse);
  const m = norm(material);
  if (!w || !m) return -1;
  return rows.findIndex((r) => norm(r.storageArea) === w && norm(r.materialType) === m);
}

function cloneState(rows: MaterialStorageRowSnapshot[]): MaterialStorageRowSnapshot[] {
  return rows.map((r) => ({ ...r }));
}

function ensurePurchaseRow(
  state: MaterialStorageRowSnapshot[],
  warehouse: string,
  material: string
): number {
  const w = norm(warehouse);
  const m = norm(material);
  if (!w || !m) return -1;
  const existing = matchPurchaseRowIndex(state, w, m);
  if (existing >= 0) return existing;
  // MaterialStorage 目录未建行时（如优质毛料库/M钢渣粒子/MP废钢库），仍按 SH 入库滚入
  state.push({
    id: -(state.length + 1),
    storageArea: w,
    materialType: m,
    aliasName: '',
    qty: 0,
    price: 0,
  });
  return state.length - 1;
}

/** 将区间 [rangeStart, rangeEnd]（含首尾自然日）内的中心基地 SH 入库与加工耗用滚入 state */
async function applyRollRange(
  state: MaterialStorageRowSnapshot[],
  rangeStart: Date,
  rangeEnd: Date
): Promise<void> {
  const rs = new Date(rangeStart);
  rs.setHours(0, 0, 0, 0);
  const re = new Date(rangeEnd);
  re.setHours(23, 59, 59, 999);

  const minStr = `${rs.getFullYear()}-${String(rs.getMonth() + 1).padStart(2, '0')}-${String(rs.getDate()).padStart(2, '0')}`;

  const purchases = await prisma.purchaseWarehouse.findMany({
    where: {
      warehouseDate: { not: null, gte: minStr },
    },
    select: {
      receiptNo: true,
      warehouse: true,
      warehouseArea: true,
      material: true,
      warehouseDate: true,
      estimatedDryBasis: true,
      totalPriceExcludingTax: true,
      status: true,
    },
  });

  for (const p of purchases) {
    const st = (p.status || '').trim();
    if (st.includes('红冲') || st.includes('撤销')) continue;
    if (!isCentralBaseStockReceipt(p.receiptNo, p.warehouse)) continue;
    const d = parseWarehouseDate(p.warehouseDate);
    if (!d || d < rs || d > re) continue;
    const idx = ensurePurchaseRow(state, purchaseInboundStorageArea(p), p.material || '');
    if (idx < 0) continue;
    const qty = dec(p.estimatedDryBasis);
    const costYuan = dec(p.totalPriceExcludingTax);
    // 允许负值入库行参与滚存（冲减行），仅忽略 0
    if (qty === 0) continue;
    const row = state[idx];
    const q0 = row.qty;
    const p0 = row.price;
    const q1 = q0 + qty;
    const val = q0 * p0 + costYuan;
    row.qty = q1;
    row.price = q1 > 0 ? val / q1 : p0;
  }

  const productions = await loadProcessingCompositionRows();

  for (const rec of productions) {
    const d = parseProductionDate(rec.productionDate);
    if (!d || d < rs || d > re) continue;
    const arr = rec.composition;
    if (!arr || !Array.isArray(arr)) continue;
    for (const item of arr) {
      const tons = typeof item.tons === 'number' ? item.tons : parseFloat(String(item.tons)) || 0;
      if (tons <= 0) continue;
      const idx = matchStorageRowIndex(state, item);
      if (idx < 0) continue;
      state[idx].qty -= tons;
    }
  }
}

/** 指定年月初日 0 点的中心基地毛料库存（4 月=表中期初列；5、6 月=自 2026-04-01 滚存） */
export async function getOpeningStateFirstDayOfMonth(
  year: number,
  month: number
): Promise<MaterialStorageRowSnapshot[]> {
  const storages = await prisma.materialStorage.findMany({
    select: {
      id: true,
      storageArea: true,
      materialType: true,
      aliasName: true,
      qty20260331: true,
      price20260331: true,
    },
  });

  const base: MaterialStorageRowSnapshot[] = storages.map((r) => ({
    id: r.id,
    storageArea: norm(r.storageArea) || '—',
    materialType: norm(r.materialType) || '—',
    aliasName: norm(r.aliasName),
    qty: dec(r.qty20260331),
    price: dec(r.price20260331),
  }));

  const first = new Date(year, month - 1, 1, 0, 0, 0, 0);
  if (first.getTime() < MATERIAL_INVENTORY_ROLL_START.getTime()) {
    return cloneState(base);
  }

  if (
    first.getFullYear() === MATERIAL_INVENTORY_ROLL_START.getFullYear() &&
    first.getMonth() === MATERIAL_INVENTORY_ROLL_START.getMonth()
  ) {
    return cloneState(base);
  }

  const state = cloneState(base);
  const rollEnd = new Date(first);
  rollEnd.setDate(rollEnd.getDate() - 1);
  rollEnd.setHours(23, 59, 59, 999);
  if (rollEnd.getTime() >= MATERIAL_INVENTORY_ROLL_START.getTime()) {
    await applyRollRange(state, MATERIAL_INVENTORY_ROLL_START, rollEnd);
  }
  return state;
}

/** 截止日 endYmd（当天 24 点）的中心基地毛料库存（含三库 SH，不含 TH） */
export async function getClosingStateThroughDate(endYmd: string): Promise<MaterialStorageRowSnapshot[]> {
  const [y, m, d] = endYmd.split('-').map((x) => parseInt(x, 10));
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error('closingDate 须为 YYYY-MM-DD');
  }
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (end.getTime() < MATERIAL_INVENTORY_ROLL_START.getTime()) {
    throw new Error('closingDate 须不早于 2026-04-01');
  }

  const storages = await prisma.materialStorage.findMany({
    select: {
      id: true,
      storageArea: true,
      materialType: true,
      aliasName: true,
      qty20260331: true,
      price20260331: true,
    },
  });

  const state: MaterialStorageRowSnapshot[] = storages.map((r) => ({
    id: r.id,
    storageArea: norm(r.storageArea) || '—',
    materialType: norm(r.materialType) || '—',
    aliasName: norm(r.aliasName),
    qty: dec(r.qty20260331),
    price: dec(r.price20260331),
  }));

  await applyRollRange(state, MATERIAL_INVENTORY_ROLL_START, end);
  return state;
}

/** 与增量同步冻结别名一致：不向这些别名行写回（避免覆盖专用口径） */
const ROLL_FORWARD_FROZEN_ALIASES = new Set([
  'MLKM2',
  'MLKM',
  'MLKQ1M2',
  'MLKQ1M0',
  'MLKQ1M6',
]);

/**
 * 按「20260331 期初 + 中心基地 SH 入库（含三库；库区优先、否则仓库）− 加工耗用」滚存结果，写回 MaterialStorage.current_qty/current_price，
 * 使小程序毛料库存与 PurchaseWarehouse 汇总及加工扣减口径一致。
 */
export async function persistRollforwardClosingToMaterialStorage(endYmd: string): Promise<{
  success: boolean;
  updated: number;
  skippedFrozen: number;
  endYmd: string;
}> {
  const snapshot = await getClosingStateThroughDate(endYmd);
  let updated = 0;
  let skippedFrozen = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of snapshot) {
      const alias = norm(row.aliasName);
      if (alias && ROLL_FORWARD_FROZEN_ALIASES.has(alias)) {
        skippedFrozen++;
        continue;
      }
      await tx.materialStorage.update({
        where: { id: row.id },
        data: {
          currentQty: row.qty,
          currentPrice: row.price,
        },
      });
      updated++;
    }
  });

  return { success: true, updated, skippedFrozen, endYmd };
}
