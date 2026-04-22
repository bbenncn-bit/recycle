import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate } from '@/lib/services/profit-service';
import { parseProductionDate } from '@/lib/services/lifo-material-cost-service';
import { isBaseSelfReceipt } from '@/lib/cost-receipt-classification';

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

/** 将区间 [rangeStart, rangeEnd]（含首尾自然日）内的基地收货入库与加工耗用滚入 state */
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
    if (!isBaseSelfReceipt(p.receiptNo, p.warehouse)) continue;
    const d = parseWarehouseDate(p.warehouseDate);
    if (!d || d < rs || d > re) continue;
    const idx = matchPurchaseRowIndex(state, p.warehouse || '', p.material || '');
    if (idx < 0) continue;
    const qty = dec(p.estimatedDryBasis);
    const costYuan = dec(p.totalPriceExcludingTax);
    if (qty <= 0) continue;
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

/** 指定年月初日 0 点的基地收货毛料库存（4 月=表中期初列；5、6 月=自 2026-04-01 滚存） */
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

/** 截止日 endYmd（当天 24 点）的基地收货毛料库存 */
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
