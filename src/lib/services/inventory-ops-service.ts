import { prisma } from '@/lib/prismadb';
import { isBaseSelfReceipt } from '@/lib/cost-receipt-classification';
import { purchaseInboundStorageArea } from '@/lib/purchase-warehouse-location';

/** 默认 prisma 或 $transaction 内的 tx，用于加工单删除等与库存写同一原子事务 */
export type PrismaDb = Pick<
  typeof prisma,
  | '$queryRaw'
  | '$queryRawUnsafe'
  | '$executeRaw'
  | '$executeRawUnsafe'
  | 'materialStorage'
  | 'productStock'
>;

export const PURCHASE_SYNC_KEY = 'purchase_warehouse_last_id';

const FROZEN_MATERIAL_ALIASES = new Set([
  'MLKM2',
  'MLKM',
  'MLKQ1M2',
  'MLKQ1M0',
  'MLKQ1M6',
]);
const PROCESSING_MATERIAL_PREFIXES = [
  'MSLKM4', 'MSLKM2', 'MSLKM', 'MSLKM0', 'MSLKM6',
  'MJSJM4', 'MJSJM2',
  'MCKKM', 'MCKKM0',
  'MGJKM0', 'MGJKM10',
  'MLKM2', 'MLKM',
  'MLKQ1M2', 'MLKQ1M0', 'MLKQ1M6',
  'FL1',
];

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

function parseMaybeJson(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  const s = String(v).trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

type ProcessingMaterialLine = {
  warehouse: string;
  materialType: string;
  tons: number;
};

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

/** 采购入库同步游标（MaterialStorageSyncState.purchase_warehouse_last_id），仅大于游标的行会被增量同步处理 */
export async function getPurchaseSyncCursor(): Promise<number> {
  const n = await getSyncStateNum(PURCHASE_SYNC_KEY, 0);
  return n == null || n < 0 ? 0 : n;
}

/** 尚未被增量同步处理的 PurchaseWarehouse 行数（id 大于游标）。用于自动轮询触发。 */
export async function countUnsyncedPurchaseRows(): Promise<number> {
  if (!(await hasSyncStateTable())) return 0;
  const lastId = await getPurchaseSyncCursor();
  return prisma.purchaseWarehouse.count({ where: { id: { gt: lastId } } });
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

  let row = await db.materialStorage.findFirst({
    where: { storageArea: warehouse, materialType },
  });
  // 加工单列存的是别名前缀（如 MGJKM0），库存表 material_type 为中文料型名；按别名再匹配一行
  if (!row) {
    row = await db.materialStorage.findFirst({
      where: { storageArea: warehouse, aliasName: materialType },
    });
  }
  if (!row) return { touched: false };

  const resolvedMaterialType = norm(row.materialType) || materialType;

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
    material_type: resolvedMaterialType,
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
  db: PrismaDb = prisma,
  meta?: {
    recordId?: number;
    businessDate?: string | null;
    note?: string | null;
  }
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
  const priceBefore = toNum(row.currentPrice);
  await db.productStock.update({
    where: { id: row.id },
    data: { stockQty: newQty },
  });
  await appendMaterialStorageLog(
    {
      business_date: meta?.businessDate ?? null,
      change_type: 'PRODUCT_STOCK_DELETE_ROLLBACK',
      source_type: 'ProcessingCostInput',
      source_ref: meta?.recordId != null ? String(meta.recordId) : null,
      storage_area: wh || '未指定仓库',
      material_type: pn,
      qty_before: cur,
      qty_delta: -t,
      qty_after: newQty,
      price_before: priceBefore,
      price_after: priceBefore,
      amount_delta_yuan: null,
      operator_openid: null,
      photo_urls: null,
      note: meta?.note ?? 'deleteProcessingOrder 成品回滚扣减',
    },
    db
  );
  return true;
}

/**
 * 增量同步：只读取 `PurchaseWarehouse.id > 游标` 的行（按 id 升序），对每条基地收货行调用
 * `adjustMaterialStorage` **累加**数量与金额，推进游标。不会按业务日期回溯，也不会撤销加工单已产生的毛料扣减
 *（加工走独立流水与 `MaterialStorage` 更新）。`maxRows` 仅限制**本轮**最多处理多少条**新行**，用于分批；不是「往前翻历史」。
 * 若修改了游标**之前**已同步过的入库单行，增量不会重放该行，需全量重算或手工调账。
 */
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

    const storageArea = purchaseInboundStorageArea(r);
    const materialType = norm(r.material);
    const qty = toNum(r.estimatedDryBasis);
    const amount = toNum(r.totalPriceExcludingTax);

    // 允许负值入库行参与库存变动（例如冲减/回退行），仅跳过 0
    if (!storageArea || !materialType || qty == null || qty === 0) {
      processed++;
      continue;
    }

    const bizDate = norm(r.warehouseDate || r.warehouseTime) || null;
    const result = await adjustMaterialStorage({
      warehouse: storageArea,
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

    const storageArea = purchaseInboundStorageArea(r);
    const materialType = norm(r.material);
    const qty = toNum(r.estimatedDryBasis);
    const amount = toNum(r.totalPriceExcludingTax);

    // 允许负值入库行参与重算，避免与原始入库单口径不一致
    if (!storageArea || !materialType || qty == null || qty === 0) continue;

    const key = `${storageArea}\0${materialType}`;
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

export async function reconcileProductStockWithProcessing(options?: {
  apply?: boolean;
  tolerance?: number;
}): Promise<{
  success: boolean;
  apply: boolean;
  checked: number;
  mismatched: number;
  repaired: number;
  details: Array<{
    productName: string;
    warehouseCode: string;
    expectedQty: number;
    actualQty: number;
    deltaQty: number;
    action: 'none' | 'update' | 'insert';
  }>;
}> {
  const apply = options?.apply === true;
  const tolerance = options?.tolerance != null ? Math.max(0, options.tolerance) : 0.0001;

  const expectedRows = await prisma.$queryRawUnsafe<
    Array<{
      product_name: string | null;
      product_warehouse: string | null;
      expected_qty: unknown;
    }>
  >(
    `SELECT product_name, product_warehouse, SUM(COALESCE(dailyProcess_qty, 0)) AS expected_qty
       FROM ProcessingCostInput
      WHERE product_name IS NOT NULL
      GROUP BY product_name, product_warehouse`
  );

  const actualRows = await prisma.productStock.findMany({
    select: {
      id: true,
      productName: true,
      warehouseCode: true,
      stockQty: true,
      currentPrice: true,
    },
  });

  const expectedMap = new Map<string, { productName: string; warehouseCode: string; qty: number }>();
  for (const r of expectedRows) {
    const productName = norm(r.product_name);
    const warehouseCode = norm(r.product_warehouse);
    if (!productName || !warehouseCode) continue;
    const key = `${productName}\0${warehouseCode}`;
    expectedMap.set(key, {
      productName,
      warehouseCode,
      qty: Math.max(0, toNum(r.expected_qty) ?? 0),
    });
  }

  const actualMap = new Map<
    string,
    { id: number; productName: string; warehouseCode: string; qty: number; currentPrice: number | null }
  >();
  for (const r of actualRows) {
    const productName = norm(r.productName);
    const warehouseCode = norm(r.warehouseCode);
    if (!productName || !warehouseCode) continue;
    const key = `${productName}\0${warehouseCode}`;
    actualMap.set(key, {
      id: r.id,
      productName,
      warehouseCode,
      qty: Math.max(0, toNum(r.stockQty) ?? 0),
      currentPrice: toNum(r.currentPrice),
    });
  }

  const unionKeys = new Set<string>([...expectedMap.keys(), ...actualMap.keys()]);
  const details: Array<{
    productName: string;
    warehouseCode: string;
    expectedQty: number;
    actualQty: number;
    deltaQty: number;
    action: 'none' | 'update' | 'insert';
  }> = [];

  let repaired = 0;
  for (const key of unionKeys) {
    const expected = expectedMap.get(key);
    const actual = actualMap.get(key);
    const productName = expected?.productName || actual?.productName || '';
    const warehouseCode = expected?.warehouseCode || actual?.warehouseCode || '';
    const expectedQty = expected?.qty ?? 0;
    const actualQty = actual?.qty ?? 0;
    const deltaQty = expectedQty - actualQty;
    const mismatch = Math.abs(deltaQty) > tolerance;
    if (!mismatch) {
      details.push({
        productName,
        warehouseCode,
        expectedQty: Number(expectedQty.toFixed(4)),
        actualQty: Number(actualQty.toFixed(4)),
        deltaQty: Number(deltaQty.toFixed(4)),
        action: 'none',
      });
      continue;
    }

    let action: 'none' | 'update' | 'insert' = 'none';
    if (apply) {
      if (actual) {
        await prisma.productStock.update({
          where: { id: actual.id },
          data: { stockQty: expectedQty },
        });
        action = 'update';
      } else {
        await prisma.productStock.create({
          data: {
            productName,
            warehouseCode,
            stockQty: expectedQty,
            currentPrice: null,
          },
        });
        action = 'insert';
      }
      repaired++;
      await appendMaterialStorageLog({
        business_date: new Date().toISOString().slice(0, 10),
        change_type: 'PRODUCT_STOCK_REPAIR',
        source_type: 'ProcessingCostInput',
        source_ref: key,
        storage_area: warehouseCode,
        material_type: productName,
        qty_before: actualQty,
        qty_delta: deltaQty,
        qty_after: expectedQty,
        price_before: actual?.currentPrice ?? null,
        price_after: actual?.currentPrice ?? null,
        amount_delta_yuan: null,
        operator_openid: null,
        photo_urls: null,
        note: '库存一致性修复：按 ProcessingCostInput 汇总重算 ProductStock',
      });
    }

    details.push({
      productName,
      warehouseCode,
      expectedQty: Number(expectedQty.toFixed(4)),
      actualQty: Number(actualQty.toFixed(4)),
      deltaQty: Number(deltaQty.toFixed(4)),
      action,
    });
  }

  const mismatched = details.filter((d) => Math.abs(d.deltaQty) > tolerance).length;
  return {
    success: true,
    apply,
    checked: details.length,
    mismatched,
    repaired,
    details: details
      .sort((a, b) => Math.abs(b.deltaQty) - Math.abs(a.deltaQty))
      .slice(0, 200),
  };
}

export async function reconcileProcessingMaterialConsumeById(options: {
  id: number;
  apply?: boolean;
  tolerance?: number;
}): Promise<{
  success: boolean;
  apply: boolean;
  id: number;
  productionDate: string | null;
  requiredLines: ProcessingMaterialLine[];
  alreadyConsumedLines: ProcessingMaterialLine[];
  missingLines: ProcessingMaterialLine[];
  adjusted: number;
}> {
  const id = Number(options.id);
  const apply = options.apply === true;
  const tolerance = options.tolerance != null ? Math.max(0, options.tolerance) : 0.0001;
  if (!Number.isFinite(id) || id < 1) throw new Error('无效的加工单 id');

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT * FROM ProcessingCostInput WHERE id = ? LIMIT 1`,
    id
  );
  const row = rows[0];
  if (!row) throw new Error(`加工单不存在: id=${id}`);

  const productionDate = norm((row.production_date as string | null | undefined) || null) || null;
  const defaultWh = norm((row.product_warehouse as string | null | undefined) || null);
  const materialWarehouses = (parseMaybeJson(row.material_warehouses) || {}) as Record<string, unknown>;
  const compositionRaw = parseMaybeJson(row.material_composition);
  const requiredMap = new Map<string, ProcessingMaterialLine>();

  const appendRequired = (warehouse: string, materialType: string, tonsRaw: unknown) => {
    const wh = norm(warehouse);
    const mt = norm(materialType);
    const tons = toNum(tonsRaw);
    if (!wh || !mt || tons == null || tons <= tolerance) return;
    const key = `${wh}\0${mt}`;
    const prev = requiredMap.get(key);
    if (prev) prev.tons += tons;
    else requiredMap.set(key, { warehouse: wh, materialType: mt, tons });
  };

  if (Array.isArray(compositionRaw) && compositionRaw.length > 0) {
    for (const item of compositionRaw) {
      if (!item || typeof item !== 'object') continue;
      const wh = norm((item as Record<string, unknown>).warehouse as string | null | undefined) || defaultWh;
      const mt = norm((item as Record<string, unknown>).material as string | null | undefined);
      appendRequired(wh, mt, (item as Record<string, unknown>).tons);
    }
  } else {
    const aliasRows = await prisma.materialStorage.findMany({
      select: { storageArea: true, aliasName: true, materialType: true },
    });
    const aliasLookup = new Map<string, string>();
    for (const a of aliasRows) {
      const wh = norm(a.storageArea);
      const alias = norm(a.aliasName);
      const mt = norm(a.materialType);
      if (!wh || !alias || !mt) continue;
      aliasLookup.set(`${wh}\0${alias.toUpperCase()}`, mt);
    }
    for (const prefix of PROCESSING_MATERIAL_PREFIXES) {
      const qty = toNum(row[`${prefix}_qty`]);
      if (qty == null || qty <= tolerance) continue;
      const wh = norm((materialWarehouses[prefix] as string | null | undefined) || defaultWh);
      if (!wh) continue;
      const mt = aliasLookup.get(`${wh}\0${prefix.toUpperCase()}`) || prefix;
      appendRequired(wh, mt, qty);
    }
  }

  const requiredLines = Array.from(requiredMap.values()).map((x) => ({
    ...x,
    tons: Number(x.tons.toFixed(4)),
  }));
  if (requiredLines.length === 0) {
    throw new Error('该加工单未解析到可核减的毛料明细');
  }

  const consumeLogs = await prisma.$queryRawUnsafe<
    Array<{
      storage_area: string | null;
      material_type: string | null;
      consumed_qty: unknown;
    }>
  >(
    `SELECT storage_area, material_type, SUM(ABS(qty_delta)) AS consumed_qty
       FROM MaterialStorageChangeLog
      WHERE source_type = 'ProcessingCostInput'
        AND source_ref = ?
        AND change_type IN ('PRODUCTION_CONSUME', 'PRODUCTION_RECONSUME')
      GROUP BY storage_area, material_type`,
    String(id)
  );
  const consumedMap = new Map<string, number>();
  for (const log of consumeLogs) {
    const wh = norm(log.storage_area);
    const mt = norm(log.material_type);
    const q = toNum(log.consumed_qty) ?? 0;
    if (!wh || !mt || q <= 0) continue;
    consumedMap.set(`${wh}\0${mt}`, q);
  }

  const alreadyConsumedLines = Array.from(consumedMap.entries()).map(([key, tons]) => {
    const [warehouse, materialType] = key.split('\0');
    return { warehouse, materialType, tons: Number(tons.toFixed(4)) };
  });

  const missingLines = requiredLines
    .map((line) => {
      const key = `${line.warehouse}\0${line.materialType}`;
      const consumed = consumedMap.get(key) ?? 0;
      const missing = line.tons - consumed;
      return { ...line, tons: Number(missing.toFixed(4)) };
    })
    .filter((line) => line.tons > tolerance);

  let adjusted = 0;
  if (apply && missingLines.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const line of missingLines) {
        const res = await adjustMaterialStorage(
          {
            warehouse: line.warehouse,
            materialType: line.materialType,
            deltaQty: -line.tons,
            changeType: 'PRODUCTION_RECONSUME',
            sourceType: 'ProcessingCostInput',
            sourceRef: String(id),
            businessDate: productionDate,
            note: 'ops 补扣：历史加工单未核减毛料库存',
          },
          tx as unknown as PrismaDb
        );
        if (!res.touched) {
          throw new Error(`补扣失败：未找到可更新库存行（${line.warehouse} / ${line.materialType}）`);
        }
        adjusted++;
      }
    });
  }

  return {
    success: true,
    apply,
    id,
    productionDate,
    requiredLines,
    alreadyConsumedLines,
    missingLines,
    adjusted,
  };
}
