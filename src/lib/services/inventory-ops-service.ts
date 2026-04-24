import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prismadb';
import { isBaseSelfReceipt } from '@/lib/cost-receipt-classification';

/** 默认 prisma 或 $transaction 内的 tx，用于加工单删除等与库存写同一原子事务 */
export type PrismaDb = typeof prisma | Prisma.TransactionClient;

export const PURCHASE_SYNC_KEY = 'purchase_warehouse_last_id';

const FROZEN_MATERIAL_ALIASES = new Set([
  'MLKM2',
  'MLKM',
  'MLKQ1M2',
  'MLKQ1M0',
  'MLKQ1M6',
]);

function norm(s: string | null | undefined): string {
  return (s || '').trim();
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

export async function hasSyncStateTable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok FROM MaterialStorageSyncState LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function hasChangeLogTable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok FROM MaterialStorageChangeLog LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

async function getSyncStateNum(keyName: string, defaultValue: number): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<Array<{ value_num: bigint | number | null }>>`
      SELECT value_num FROM MaterialStorageSyncState WHERE key_name = ${keyName} LIMIT 1
    `;
    const v = rows[0]?.value_num;
    const n = v != null ? Number(v) : null;
    return n != null && !Number.isNaN(n) ? n : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function upsertSyncState(keyName: string, valueNum: number): Promise<boolean> {
  try {
    await prisma.$executeRaw`
      INSERT INTO MaterialStorageSyncState (key_name, value_num, updated_at)
      VALUES (${keyName}, ${valueNum}, NOW())
      ON DUPLICATE KEY UPDATE value_num = VALUES(value_num), updated_at = NOW()
    `;
    return true;
  } catch (e) {
    console.warn('[inventory-ops] upsertSyncState failed:', e);
    return false;
  }
}

async function appendMaterialStorageLog(
  row: {
    business_date: string | null;
    change_type: string;
    source_type: string | null;
    source_ref: string | null;
    storage_area: string;
    material_type: string;
    qty_before: number;
    qty_delta: number;
    qty_after: number;
    price_before: number | null;
    price_after: number | null;
    amount_delta_yuan: number | null;
    operator_openid: string | null;
    photo_urls: string | null;
    note: string | null;
  },
  db: PrismaDb = prisma
): Promise<void> {
  const ready = await hasChangeLogTable();
  if (!ready) return;
  try {
    await db.$executeRaw`
      INSERT INTO MaterialStorageChangeLog (
        business_date, change_type, source_type, source_ref,
        storage_area, material_type,
        qty_before, qty_delta, qty_after, price_before, price_after,
        amount_delta_yuan, operator_openid, photo_urls, note
      ) VALUES (
        ${row.business_date}, ${row.change_type}, ${row.source_type}, ${row.source_ref},
        ${row.storage_area}, ${row.material_type},
        ${row.qty_before}, ${row.qty_delta}, ${row.qty_after}, ${row.price_before}, ${row.price_after},
        ${row.amount_delta_yuan}, ${row.operator_openid}, ${row.photo_urls}, ${row.note}
      )
    `;
  } catch (e) {
    console.warn('[inventory-ops] appendMaterialStorageLog skipped:', e);
  }
}

async function adjustMaterialStorage(
  opts: {
    warehouse: string;
    materialType: string;
    deltaQty: number;
    deltaAmountYuan?: number | null;
    changeType: string;
    sourceType?: string | null;
    sourceRef?: string | null;
    businessDate?: string | null;
    note?: string | null;
  },
  db: PrismaDb = prisma
): Promise<{ touched: boolean; frozen?: boolean }> {
  const warehouse = norm(opts.warehouse);
  const materialType = norm(opts.materialType);
  const deltaQtyRaw = toNum(opts.deltaQty);
  const deltaQty = deltaQtyRaw != null ? deltaQtyRaw : 0;
  if (!warehouse || !materialType || deltaQty === 0) return { touched: false };

  const row = await db.materialStorage.findFirst({
    where: { storageArea: warehouse, materialType },
  });
  if (!row) return { touched: false };

  const aliasName = norm(row.aliasName);
  if (aliasName && FROZEN_MATERIAL_ALIASES.has(aliasName)) {
    return { touched: false, frozen: true };
  }

  const beforeQty = toNum(row.currentQty) ?? 0;
  const beforePrice = toNum(row.currentPrice) ?? 0;
  let afterQty = beforeQty + deltaQty;
  if (afterQty < 0) afterQty = 0;
  let afterPrice = beforePrice;

  if (opts.changeType === 'PURCHASE_IN' && deltaQty > 0) {
    const amount = toNum(opts.deltaAmountYuan) ?? 0;
    if (amount > 0) {
      const totalAmount = beforeQty * beforePrice + amount;
      afterPrice = afterQty > 0 ? totalAmount / afterQty : beforePrice;
    }
  }

  await db.materialStorage.update({
    where: { id: row.id },
    data: {
      currentQty: afterQty,
      currentPrice: afterPrice,
    },
  });

  await appendMaterialStorageLog({
    business_date: opts.businessDate ?? null,
    change_type: opts.changeType,
    source_type: opts.sourceType ?? null,
    source_ref: opts.sourceRef ?? null,
    storage_area: warehouse,
    material_type: materialType,
    qty_before: beforeQty,
    qty_delta: deltaQty,
    qty_after: afterQty,
    price_before: beforePrice,
    price_after: afterPrice,
    amount_delta_yuan: opts.deltaAmountYuan != null ? (toNum(opts.deltaAmountYuan) ?? null) : null,
    operator_openid: null,
    photo_urls: null,
    note: opts.note ?? null,
  }, db);

  return { touched: true };
}

/** 删除加工单：将当时扣减的毛料加回（与云函数 incrementMaterialStorage 一致） */
export async function incrementMaterialStorageForProcessingDelete(
  warehouse: string,
  materialType: string,
  tons: number,
  meta: { recordId: number; productionDate?: string | null },
  db: PrismaDb = prisma
): Promise<{ touched: boolean; frozen?: boolean }> {
  const q = toNum(tons);
  if (!norm(warehouse) || !norm(materialType) || q == null || q <= 0) {
    return { touched: false };
  }
  return adjustMaterialStorage(
    {
      warehouse,
      materialType,
      deltaQty: q,
      changeType: 'PRODUCTION_DELETE_ROLLBACK',
      sourceType: 'ProcessingCostInput',
      sourceRef: String(meta.recordId),
      businessDate: meta.productionDate ?? null,
      note: 'deleteProcessingOrder 毛料回滚',
    },
    db
  );
}

/** 删除加工单：扣减当时增加的成品库存 */
export async function decrementProductStockForProcessingDelete(
  productName: string,
  warehouseCode: string | null | undefined,
  tons: number,
  db: PrismaDb = prisma
): Promise<boolean> {
  const t = toNum(tons);
  const pn = norm(productName);
  if (!pn || t == null || t <= 0) return false;
  const wh = norm(warehouseCode);
  const row = await db.productStock.findFirst({
    where: wh ? { productName: pn, warehouseCode: wh } : { productName: pn },
  });
  if (!row) return false;
  const cur = toNum(row.stockQty) ?? 0;
  const newQty = Math.max(0, cur - t);
  await db.productStock.update({
    where: { id: row.id },
    data: { stockQty: newQty },
  });
  return true;
}

export async function syncMaterialStorageFromPurchase(options?: {
  maxRows?: number;
  trigger?: string;
}): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
  trigger?: string;
  lastId?: number;
  maxSeenId?: number;
  fetched?: number;
  processed?: number;
  touched?: number;
}> {
  const maxRows =
    options?.maxRows != null && options.maxRows > 0
      ? Math.min(10000, Math.floor(options.maxRows))
      : 2000;
  const trigger = norm(options?.trigger) || 'web';

  const stateReady = await hasSyncStateTable();
  if (!stateReady) {
    return {
      success: false,
      skipped: true,
      error:
        '缺少 MaterialStorageSyncState 表（请先执行 docs/material_storage_change_log.sql 或等价 DDL）',
    };
  }

  let lastId = await getSyncStateNum(PURCHASE_SYNC_KEY, 0);
  if (lastId == null || lastId < 0) lastId = 0;

  const rows = await prisma.purchaseWarehouse.findMany({
    where: { id: { gt: lastId } },
    orderBy: { id: 'asc' },
    take: maxRows,
    select: {
      id: true,
      receiptNo: true,
      warehouse: true,
      warehouseArea: true,
      material: true,
      warehouseDate: true,
      warehouseTime: true,
      estimatedDryBasis: true,
      totalPriceExcludingTax: true,
      status: true,
    },
  });

  let touched = 0;
  let processed = 0;
  let maxSeenId = lastId;

  for (const r of rows) {
    const rowId = r.id;
    if (rowId > maxSeenId) maxSeenId = rowId;

    const status = norm(r.status);
    if (status.includes('红冲') || status.includes('撤销')) {
      processed++;
      continue;
    }
    if (!isBaseSelfReceipt(r.receiptNo, r.warehouse)) {
      processed++;
      continue;
    }

    const warehouseArea = norm(r.warehouseArea);
    const materialType = norm(r.material);
    const qty = toNum(r.estimatedDryBasis);
    const amount = toNum(r.totalPriceExcludingTax);

    if (!warehouseArea || !materialType || qty == null || qty <= 0) {
      processed++;
      continue;
    }

    const bizDate = norm(r.warehouseDate || r.warehouseTime) || null;
    const result = await adjustMaterialStorage({
      warehouse: warehouseArea,
      materialType,
      deltaQty: qty,
      deltaAmountYuan: amount != null ? amount : 0,
      changeType: 'PURCHASE_IN',
      sourceType: 'PurchaseWarehouse',
      sourceRef: String(rowId),
      businessDate: bizDate,
      note: `trigger=${trigger}`,
    });
    if (result.touched) touched++;
    processed++;
  }

  if (maxSeenId > lastId) {
    await upsertSyncState(PURCHASE_SYNC_KEY, maxSeenId);
  }

  return {
    success: true,
    trigger,
    lastId,
    maxSeenId,
    fetched: rows.length,
    processed,
    touched,
  };
}

export async function rebuildMaterialStorageFromPurchase(options?: {
  touchOnlyMatched?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
  touched?: number;
  purchaseRows?: number;
  maxSeenId?: number;
  stateReady?: boolean;
}> {
  const touchOnlyMatched = options?.touchOnlyMatched !== false;

  const storages = await prisma.materialStorage.findMany();
  const purchases = await prisma.purchaseWarehouse.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      receiptNo: true,
      warehouse: true,
      warehouseArea: true,
      material: true,
      estimatedDryBasis: true,
      totalPriceExcludingTax: true,
      status: true,
    },
  });

  const agg: Record<string, { qty: number; amount: number }> = {};
  let maxSeenId = 0;

  for (const r of purchases) {
    if (r.id > maxSeenId) maxSeenId = r.id;
    const status = norm(r.status);
    if (status.includes('红冲') || status.includes('撤销')) continue;
    if (!isBaseSelfReceipt(r.receiptNo, r.warehouse)) continue;

    const warehouseArea = norm(r.warehouseArea);
    const materialType = norm(r.material);
    const qty = toNum(r.estimatedDryBasis);
    const amount = toNum(r.totalPriceExcludingTax);

    if (!warehouseArea || !materialType || qty == null || qty <= 0) continue;

    const key = `${warehouseArea}\0${materialType}`;
    if (!agg[key]) agg[key] = { qty: 0, amount: 0 };
    agg[key].qty += qty;
    agg[key].amount += amount != null ? amount : 0;
  }

  let touched = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const row of storages) {
    const storageArea = norm(row.storageArea);
    const materialType = norm(row.materialType);
    const aliasName = norm(row.aliasName);
    if (!storageArea || !materialType) continue;
    if (aliasName && FROZEN_MATERIAL_ALIASES.has(aliasName)) continue;

    const key = `${storageArea}\0${materialType}`;
    const hasAgg = !!agg[key];
    if (!hasAgg && touchOnlyMatched) continue;

    const beforeQty = toNum(row.currentQty) ?? 0;
    const beforePrice = toNum(row.currentPrice) ?? 0;
    const afterQty = hasAgg ? agg[key].qty : 0;
    const afterPrice =
      hasAgg && agg[key].qty > 0 ? agg[key].amount / agg[key].qty : beforePrice;

    await prisma.materialStorage.update({
      where: { id: row.id },
      data: {
        currentQty: afterQty,
        currentPrice: afterPrice,
      },
    });

    await appendMaterialStorageLog({
      business_date: today,
      change_type: 'PURCHASE_INIT_REBUILD',
      source_type: 'PurchaseWarehouse',
      source_ref: 'FULL',
      storage_area: storageArea,
      material_type: materialType,
      qty_before: beforeQty,
      qty_delta: afterQty - beforeQty,
      qty_after: afterQty,
      price_before: beforePrice,
      price_after: afterPrice,
      amount_delta_yuan: null,
      operator_openid: null,
      photo_urls: null,
      note: '全量重算（基地收货）',
    });
    touched++;
  }

  const stateReady = await hasSyncStateTable();
  if (stateReady) {
    await upsertSyncState(PURCHASE_SYNC_KEY, maxSeenId);
  }

  return {
    success: true,
    touched,
    purchaseRows: purchases.length,
    maxSeenId,
    stateReady,
  };
}

export type ChangeLogRow = {
  id: bigint | number;
  business_date: string | null;
  change_type: string;
  source_type: string | null;
  source_ref: string | null;
  storage_area: string;
  material_type: string;
  qty_before: unknown;
  qty_delta: unknown;
  qty_after: unknown;
  created_at: Date | string | null;
};

export async function getRecentMaterialStorageLogs(limit: number): Promise<ChangeLogRow[]> {
  const lim = Math.max(1, Math.min(500, Math.floor(limit)));
  const ready = await hasChangeLogTable();
  if (!ready) return [];
  try {
    const rows = await prisma.$queryRaw<ChangeLogRow[]>`
      SELECT id, business_date, change_type, source_type, source_ref,
        storage_area, material_type, qty_before, qty_delta, qty_after, created_at
      FROM MaterialStorageChangeLog
      ORDER BY id DESC
      LIMIT ${lim}
    `;
    return rows;
  } catch {
    return [];
  }
}

export async function getOperationsStatus(): Promise<{
  syncStateTable: boolean;
  changeLogTable: boolean;
  purchaseSyncLastId: number | null;
  materialCostCacheRows: number;
}> {
  const syncStateTable = await hasSyncStateTable();
  const changeLogTable = await hasChangeLogTable();
  let purchaseSyncLastId: number | null = null;
  if (syncStateTable) {
    purchaseSyncLastId = await getSyncStateNum(PURCHASE_SYNC_KEY, 0);
  }
  let materialCostCacheRows = 0;
  try {
    const c = await prisma.materialCostCache.count();
    materialCostCacheRows = c;
  } catch {
    materialCostCacheRows = 0;
  }

  return {
    syncStateTable,
    changeLogTable,
    purchaseSyncLastId,
    materialCostCacheRows,
  };
}

/** 执行 MySQL 存储过程，刷新 MaterialCostCache（与小程序/定时任务同一逻辑） */
export async function refreshMaterialCostCache(startDate: string, endDate: string): Promise<void> {
  const s = norm(startDate);
  const e = norm(endDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) {
    throw new Error('开始、结束日期须为 YYYY-MM-DD');
  }
  await prisma.$executeRawUnsafe(`CALL sp_update_material_cost_cache(?, ?)`, s, e);
}
