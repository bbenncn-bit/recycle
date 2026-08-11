import { prisma } from '@/lib/prismadb';
import {
  MATERIAL_ALIAS_PRISMA_FIELDS,
  getColumnPrefixByMaterial,
} from '@/lib/processing-cost-input-material-columns';
import {
  WAREHOUSE_LIST,
  buildStaticWarehouseMaterials,
} from '@/lib/warehouse-materials-config';
import {
  decrementMaterialStorageForProductionInsert,
  incrementProductStockForProcessingInsert,
  productStockTransfer,
} from '@/lib/services/inventory-ops-service';
import {
  extractProductWarehouseCode,
  resolveSaleProductIdentity,
} from '@/lib/services/lifo-match-resolve';
import { isBaseSelfReceipt } from '@/lib/cost-receipt-classification';
import { purchaseInboundStorageArea } from '@/lib/purchase-warehouse-location';
import { MATERIAL_INVENTORY_ROLL_START } from '@/lib/services/material-storage-inventory-service';

const PRODUCT_LIST_FALLBACK = [
  { id: 'JG散料|JGSL', name: 'JG散料', warehouse: 'JGSL', stockQty: 0, currentPrice: 0 },
  { id: 'PG散料|PGSL', name: 'PG散料', warehouse: 'PGSL', stockQty: 0, currentPrice: 0 },
  { id: 'PG钢筋压块|PGGJYK', name: 'PG钢筋压块', warehouse: 'PGGJYK', stockQty: 0, currentPrice: 0 },
  { id: 'PG脚手架压块|PGJSJYK', name: 'PG脚手架压块', warehouse: 'PGJSJYK', stockQty: 0, currentPrice: 0 },
  { id: 'PG压块（12类）|PGYK12', name: 'PG压块（12类）', warehouse: 'PGYK12', stockQty: 0, currentPrice: 0 },
  { id: 'PG压块（34类）|PGYK34', name: 'PG压块（34类）', warehouse: 'PGYK34', stockQty: 0, currentPrice: 0 },
  { id: 'XG普废|XGPF', name: 'XG普废', warehouse: 'XGPF', stockQty: 0, currentPrice: 0 },
  { id: '散料（汽拆）|QCSL', name: '散料（汽拆）', warehouse: 'QCSL', stockQty: 0, currentPrice: 0 },
  { id: '压块（汽拆）|QCYK', name: '压块（汽拆）', warehouse: 'QCYK', stockQty: 0, currentPrice: 0 },
];

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function norm(s: unknown): string {
  return (s ?? '').toString().trim();
}

function toComparableDateNum(s: string | null | undefined): number | null {
  const raw = norm(s);
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return y * 10000 + mo * 100 + d;
}

export type ProductionMaterialLine = {
  warehouse: string;
  material: string;
  shortName?: string;
  currentPrice?: number;
  tons: number;
};

export type InsertProcessingCostPayload = {
  productName: string;
  productWarehouse: string;
  productTons: number;
  productionDate: string;
  materialComposition: ProductionMaterialLine[];
  operatorOpenid: string;
  createBy?: string;
  name?: string;
};

export type ProductStockEntryItem = {
  id: string;
  name: string;
  warehouse: string;
  /** 净库存 = 总加工 − 总销售（吨） */
  stockQty: number;
  totalProcessedQty: number;
  totalSalesQty: number;
  currentPrice: number;
};

function productEntryKey(name: string, warehouse: string): string {
  return `${norm(name)}\0${norm(warehouse)}`;
}

async function getTotalProcessedQtyByProductKey(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      product_name: string | null;
      product_warehouse: string | null;
      total_qty: unknown;
    }>
  >(
    `SELECT product_name, product_warehouse,
            SUM(COALESCE(dailyProcess_qty, product_tons, 0)) AS total_qty
       FROM ProcessingCostInput
      WHERE product_name IS NOT NULL AND TRIM(product_name) <> ''
      GROUP BY product_name, product_warehouse`
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    const name = norm(r.product_name);
    const warehouse = norm(r.product_warehouse);
    if (!name) continue;
    const qty = toNum(r.total_qty) ?? 0;
    if (qty <= 0) continue;
    map.set(productEntryKey(name, warehouse), qty);
  }
  return map;
}

function buildWarehousesByProduct(keys: Iterable<string>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const key of keys) {
    const sep = key.indexOf('\0');
    if (sep < 0) continue;
    const name = key.slice(0, sep);
    const warehouse = key.slice(sep + 1);
    if (!name) continue;
    if (!map.has(name)) map.set(name, []);
    if (warehouse && !map.get(name)!.includes(warehouse)) {
      map.get(name)!.push(warehouse);
    }
  }
  return map;
}

/** 按成品汇总销售出库吨数：DeliverySettlement.net_weight（出厂净重，非结算量） */
async function getTotalSalesQtyByProductKey(
  knownProductKeys: Set<string>
): Promise<Map<string, number>> {
  const warehousesByProduct = buildWarehousesByProduct(knownProductKeys);
  const settlements = await prisma.deliverySettlement.findMany({
    select: {
      productType: true,
      warehouse: true,
      netWeight: true,
    },
    take: 50000,
  });

  const identityCache = new Map<string, { name: string; warehouse: string } | null>();
  const totals = new Map<string, number>();

  for (const row of settlements) {
    const qty = toNum(row.netWeight);
    if (qty == null || qty <= 0) continue;

    const cacheKey = `${norm(row.productType)}\0${norm(row.warehouse)}`;
    if (!identityCache.has(cacheKey)) {
      const identity = await resolveSaleProductIdentity(row.productType, row.warehouse);
      const name = norm(identity.productName);
      if (!name) {
        identityCache.set(cacheKey, null);
      } else {
        let warehouse = norm(identity.productWarehouse);
        if (!warehouse) {
          warehouse =
            extractProductWarehouseCode(row.warehouse) ||
            extractProductWarehouseCode(row.productType) ||
            '';
        }
        if (!warehouse) {
          const whs = warehousesByProduct.get(name) ?? [];
          if (whs.length === 1) warehouse = whs[0];
        }
        identityCache.set(cacheKey, { name, warehouse });
      }
    }
    const identity = identityCache.get(cacheKey);
    if (!identity || !identity.name) continue;

    const key = productEntryKey(identity.name, identity.warehouse);
    totals.set(key, (totals.get(key) ?? 0) + qty);
  }
  return totals;
}

export async function getProductStockForEntry(): Promise<ProductStockEntryItem[]> {
  const [stockRows, processedMap] = await Promise.all([
    prisma.productStock.findMany({
      select: {
        productName: true,
        warehouseCode: true,
        currentPrice: true,
      },
      take: 500,
      orderBy: { id: 'asc' },
    }),
    getTotalProcessedQtyByProductKey(),
  ]);

  const baseList =
    stockRows.length > 0
      ? stockRows
          .filter((r) => norm(r.productName))
          .map((r) => ({
            name: norm(r.productName),
            warehouse: norm(r.warehouseCode),
            currentPrice: toNum(r.currentPrice) ?? 0,
          }))
      : PRODUCT_LIST_FALLBACK.map((p) => ({
          name: p.name,
          warehouse: p.warehouse,
          currentPrice: p.currentPrice,
        }));

  const unionKeys = new Set<string>();
  for (const p of baseList) {
    if (p.name && p.warehouse) unionKeys.add(productEntryKey(p.name, p.warehouse));
  }
  for (const k of processedMap.keys()) unionKeys.add(k);

  const salesMap = await getTotalSalesQtyByProductKey(unionKeys);
  for (const k of salesMap.keys()) unionKeys.add(k);

  const priceByKey = new Map(
    baseList.map((p) => [productEntryKey(p.name, p.warehouse), p.currentPrice])
  );
  const nameWhByKey = new Map(
    baseList.map((p) => [productEntryKey(p.name, p.warehouse), p])
  );

  const items: ProductStockEntryItem[] = [];
  for (const key of unionKeys) {
    const [name, warehouse] = key.split('\0');
    if (!name) continue;
    const meta = nameWhByKey.get(key) ?? { name, warehouse: warehouse || '', currentPrice: 0 };
    const totalProcessedQty = processedMap.get(key) ?? 0;
    const totalSalesQty = salesMap.get(key) ?? 0;
    const stockQty = totalProcessedQty - totalSalesQty;
    items.push({
      id: `${meta.name}|${meta.warehouse}`,
      name: meta.name,
      warehouse: meta.warehouse,
      stockQty,
      totalProcessedQty,
      totalSalesQty,
      currentPrice: priceByKey.get(key) ?? meta.currentPrice ?? 0,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.warehouse.localeCompare(b.warehouse));
  return items.length > 0 ? items : PRODUCT_LIST_FALLBACK.map((p) => ({
    ...p,
    totalProcessedQty: 0,
    totalSalesQty: 0,
  }));
}

export type MaterialStorageEntryItem = {
  name: string;
  shortName: string;
  currentPrice: number;
  /** 净库存 = 累计采购 − 累计加工使用（吨） */
  stockQty: number;
  /** 累计采购（吨）：4/1 期初滚存 + 基地收货入库 */
  totalPurchaseQty: number;
  /** 累计加工使用（吨）：ProcessingCostInput.material_composition 汇总 */
  totalProcessingUsageQty: number;
};

type MaterialCatalogRow = {
  storageArea: string;
  materialType: string;
  aliasName: string;
  openingQty: number;
  currentPrice: number;
};

function materialEntryKey(storageArea: string, materialType: string): string {
  return `${norm(storageArea)}\0${norm(materialType)}`;
}

function resolveMaterialCatalogKey(
  catalog: MaterialCatalogRow[],
  warehouse: string,
  materialOrAlias: string
): string | null {
  const w = norm(warehouse);
  const m = norm(materialOrAlias);
  if (!m) return null;

  if (w) {
    const byType = catalog.find(
      (r) => norm(r.storageArea) === w && norm(r.materialType) === m
    );
    if (byType) return materialEntryKey(byType.storageArea, byType.materialType);

    const byAlias = catalog.find(
      (r) => norm(r.storageArea) === w && norm(r.aliasName) === m
    );
    if (byAlias) return materialEntryKey(byAlias.storageArea, byAlias.materialType);
  }

  const aliasHits = catalog.filter((r) => norm(r.aliasName) === m);
  if (aliasHits.length === 1) {
    return materialEntryKey(aliasHits[0].storageArea, aliasHits[0].materialType);
  }
  if (w && aliasHits.length > 1) {
    const hit = aliasHits.find((r) => norm(r.storageArea) === w);
    if (hit) return materialEntryKey(hit.storageArea, hit.materialType);
  }

  return null;
}

async function processingTableHasMaterialComposition(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint | number }>>(
      "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER('ProcessingCostInput') AND COLUMN_NAME = 'material_composition'"
    );
    return Number(rows[0]?.cnt ?? 0) > 0;
  } catch {
    return false;
  }
}

function parseCompositionJson(raw: unknown): Array<{
  warehouse?: string;
  material?: string;
  shortName?: string;
  tons?: number;
}> | null {
  if (raw == null) return null;
  let arr: unknown[];
  if (typeof raw === 'string') {
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
  if (!arr.length) return null;
  return arr as Array<{
    warehouse?: string;
    material?: string;
    shortName?: string;
    tons?: number;
  }>;
}

async function getTotalMaterialPurchaseByKey(
  catalog: MaterialCatalogRow[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const row of catalog) {
    map.set(materialEntryKey(row.storageArea, row.materialType), row.openingQty);
  }

  const rollStart = MATERIAL_INVENTORY_ROLL_START;
  const minStr = `${rollStart.getFullYear()}-${String(rollStart.getMonth() + 1).padStart(2, '0')}-${String(rollStart.getDate()).padStart(2, '0')}`;

  const purchases = await prisma.purchaseWarehouse.findMany({
    where: { warehouseDate: { not: null, gte: minStr } },
    select: {
      receiptNo: true,
      warehouse: true,
      warehouseArea: true,
      material: true,
      estimatedDryBasis: true,
      status: true,
    },
    take: 100000,
  });

  for (const p of purchases) {
    const st = norm(p.status);
    if (st.includes('红冲') || st.includes('撤销')) continue;
    if (!isBaseSelfReceipt(p.receiptNo, p.warehouse)) continue;
    const area = purchaseInboundStorageArea(p);
    const key = resolveMaterialCatalogKey(catalog, area, p.material || '');
    if (!key) continue;
    const qty = toNum(p.estimatedDryBasis);
    if (qty == null || qty === 0) continue;
    map.set(key, (map.get(key) ?? 0) + qty);
  }
  return map;
}

async function getTotalMaterialProcessingUsageByKey(
  catalog: MaterialCatalogRow[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!(await processingTableHasMaterialComposition())) return map;

  const raw = await prisma.$queryRawUnsafe<
    Array<{ material_composition: unknown }>
  >('SELECT material_composition FROM ProcessingCostInput WHERE material_composition IS NOT NULL');

  for (const row of raw) {
    const comp = parseCompositionJson(row.material_composition);
    if (!comp?.length) continue;
    for (const item of comp) {
      const tons = toNum(item.tons);
      if (tons == null || tons <= 0) continue;
      const key = resolveMaterialCatalogKey(
        catalog,
        item.warehouse || '',
        item.material || item.shortName || ''
      );
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + tons);
    }
  }
  return map;
}

export async function getMaterialStorageForEntry(): Promise<
  Record<string, MaterialStorageEntryItem[]>
> {
  const rows = await prisma.materialStorage.findMany({
    select: {
      storageArea: true,
      materialType: true,
      aliasName: true,
      qty20260331: true,
      currentPrice: true,
    },
    take: 2000,
  });

  const catalog: MaterialCatalogRow[] = rows
    .map((r) => ({
      storageArea: norm(r.storageArea),
      materialType: norm(r.materialType),
      aliasName: norm(r.aliasName),
      openingQty: toNum(r.qty20260331) ?? 0,
      currentPrice: toNum(r.currentPrice) ?? 0,
    }))
    .filter((r) => r.storageArea && r.materialType);

  const [purchaseMap, usageMap] = await Promise.all([
    getTotalMaterialPurchaseByKey(catalog),
    getTotalMaterialProcessingUsageByKey(catalog),
  ]);

  const grouped: Record<string, MaterialStorageEntryItem[]> = {};

  for (const row of catalog) {
    const wh = row.storageArea;
    const mat = row.materialType;
    const key = materialEntryKey(wh, mat);
    const totalPurchaseQty = purchaseMap.get(key) ?? row.openingQty;
    const totalProcessingUsageQty = usageMap.get(key) ?? 0;
    const stockQty = totalPurchaseQty - totalProcessingUsageQty;
    const alias = row.aliasName || mat;
    if (!grouped[wh]) grouped[wh] = [];
    if (grouped[wh].some((x) => x.name === mat)) continue;
    grouped[wh].push({
      name: mat,
      shortName: alias,
      currentPrice: row.currentPrice,
      stockQty,
      totalPurchaseQty,
      totalProcessingUsageQty,
    });
  }

  const staticMap = buildStaticWarehouseMaterials();
  for (const wh of WAREHOUSE_LIST) {
    if (!grouped[wh] || grouped[wh].length === 0) {
      grouped[wh] = (staticMap[wh] || []).map((m) => ({
        name: m.name,
        shortName: m.shortName,
        currentPrice: m.currentPrice,
        stockQty: 0,
        totalPurchaseQty: 0,
        totalProcessingUsageQty: 0,
      }));
    }
  }
  return grouped;
}

async function getProductStockPrice(
  productName: string,
  warehouseCode: string | null
): Promise<number | null> {
  const pn = norm(productName);
  if (!pn) return null;
  const wh = norm(warehouseCode);
  const row = await prisma.productStock.findFirst({
    where: wh ? { productName: pn, warehouseCode: wh } : { productName: pn },
    select: { currentPrice: true },
  });
  return row ? toNum(row.currentPrice) : null;
}

async function buildMaterialStoragePriceMap(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const rows = await prisma.materialStorage.findMany({
    select: { storageArea: true, materialType: true, currentPrice: true },
    take: 2000,
  });
  for (const r of rows) {
    const wh = norm(r.storageArea);
    const mt = norm(r.materialType);
    const p = toNum(r.currentPrice);
    if (wh && mt && p != null) map[`${wh}\0${mt}`] = p;
  }
  return map;
}

async function buildLatestPurchasePriceMap(
  productionDate: string
): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const targetNum = toComparableDateNum(productionDate);
  const rows = await prisma.purchaseWarehouse.findMany({
    select: {
      warehouseArea: true,
      material: true,
      warehouseTime: true,
      warehouseDate: true,
      unitPriceExcludingTax: true,
      id: true,
    },
    orderBy: [{ warehouseTime: 'desc' }, { id: 'desc' }],
    take: 1500,
  });
  for (const r of rows) {
    const wh = norm(r.warehouseArea);
    const mt = norm(r.material);
    if (!wh || !mt) continue;
    const key = `${wh}\0${mt}`;
    if (map[key] != null) continue;
    const d = toComparableDateNum(
      r.warehouseTime ? String(r.warehouseTime) : r.warehouseDate
    );
    if (targetNum != null && d != null && d > targetNum) continue;
    const p = toNum(r.unitPriceExcludingTax);
    if (p != null) map[key] = p;
  }
  return map;
}

type ProcessingCostCreateData = Parameters<
  typeof prisma.processingCostInput.create
>[0]['data'];

function buildPrismaCreateData(
  payload: InsertProcessingCostPayload,
  productPrice: number | null,
  storagePriceMap: Record<string, number>,
  lifoPriceMap: Record<string, number>
): ProcessingCostCreateData {
  const productName = norm(payload.productName);
  const productWarehouse = norm(payload.productWarehouse);
  const productTons = toNum(payload.productTons);
  const productionDate = norm(payload.productionDate);
  const openid = norm(payload.operatorOpenid);

  const data: ProcessingCostCreateData = {
    productName,
    productWarehouse: productWarehouse || null,
    productionDate,
    dailyProcessQty: productTons,
    productTons,
    dailyProcessAmount: null,
    dailyProcessPrice: null,
    openid: openid || null,
    cloudOpenid: openid || null,
    createBy: payload.createBy || openid || null,
    name: payload.name || null,
  };

  for (const fields of Object.values(MATERIAL_ALIAS_PRISMA_FIELDS)) {
    (data as Record<string, unknown>)[fields.qty] = null;
    (data as Record<string, unknown>)[fields.price] = null;
  }

  const materialWarehouses: Record<string, string> = {};
  let materialCostSum = 0;

  for (const m of payload.materialComposition) {
    const mat = norm(m.material);
    const wh = norm(m.warehouse);
    const tons = toNum(m.tons);
    if (tons == null || tons <= 0) continue;
    const colPrefix = getColumnPrefixByMaterial({ material: mat, shortName: m.shortName });
    if (!colPrefix) continue;
    const fields = MATERIAL_ALIAS_PRISMA_FIELDS[colPrefix];
    if (!fields) continue;

    let price = 0;
    if (colPrefix !== 'FL1') {
      const priceByLifo = lifoPriceMap[`${wh}\0${mat}`];
      const priceByInput = toNum(m.currentPrice);
      const priceByStorage = storagePriceMap[`${wh}\0${mat}`];
      price =
        priceByLifo != null
          ? priceByLifo
          : priceByInput != null
            ? priceByInput
            : priceByStorage != null
              ? priceByStorage
              : 0;
    }
    (data as Record<string, unknown>)[fields.qty] = tons;
    (data as Record<string, unknown>)[fields.price] = price;
    materialWarehouses[colPrefix] = wh || productWarehouse;
    materialCostSum += tons * price;
  }

  if (materialCostSum === 0 && payload.materialComposition.length > 0) {
    for (const m of payload.materialComposition) {
      const mat = norm(m.material);
      const wh = norm(m.warehouse);
      const tons = toNum(m.tons);
      if (tons == null || tons <= 0) continue;
      const pLifo = lifoPriceMap[`${wh}\0${mat}`];
      const pInput = toNum(m.currentPrice);
      const pStorage = storagePriceMap[`${wh}\0${mat}`];
      const p = pLifo != null ? pLifo : pInput != null ? pInput : pStorage != null ? pStorage : 0;
      materialCostSum += tons * p;
    }
  }

  // 成品金额：优先 ProductStock.current_price；若未维护或为 0（常见于 JG散料/JGSL），
  // 回退为投料成本合计（Σ 毛料吨数×单价），避免 dailyProcess_amount 落成 NULL/0。
  const useProductPrice = productPrice != null && productPrice > 0;
  const dailyProcessPrice = useProductPrice
    ? productPrice
    : productTons != null && productTons > 0 && materialCostSum > 0
      ? materialCostSum / productTons
      : null;

  data.dailyProcessAmount =
    productTons != null && productTons > 0
      ? useProductPrice
        ? productTons * productPrice!
        : materialCostSum > 0
          ? materialCostSum
          : null
      : null;
  data.dailyProcessPrice = dailyProcessPrice;
  data.materialWarehouses = JSON.stringify(materialWarehouses);
  data.materialComposition = payload.materialComposition;

  return data;
}

export async function insertProcessingCost(
  payload: InsertProcessingCostPayload
): Promise<{
  success: boolean;
  error?: string;
  id?: number;
  productStockUpdate?: {
    productName: string;
    productWarehouse: string;
    beforeQty?: number;
    afterQty?: number;
    deltaQty: number;
  };
}> {
  const productName = norm(payload.productName);
  const productWarehouse = norm(payload.productWarehouse);
  const productTons = toNum(payload.productTons);
  const productionDate = norm(payload.productionDate);
  const materialComposition = payload.materialComposition || [];

  if (!productName || !productionDate) {
    return { success: false, error: '缺少成品名称或生产日期' };
  }
  if (!materialComposition.some((m) => (toNum(m.tons) ?? 0) > 0)) {
    return { success: false, error: '请至少选择一种毛料并填写用量' };
  }

  const productPrice = await getProductStockPrice(productName, productWarehouse);
  const storagePriceMap = await buildMaterialStoragePriceMap();
  const lifoPriceMap = await buildLatestPurchasePriceMap(productionDate);
  const createData = buildPrismaCreateData(
    payload,
    productPrice,
    storagePriceMap,
    lifoPriceMap
  );

  const inserted = await prisma.processingCostInput.create({ data: createData });
  const insertedId = inserted.id;
  const operatorOpenid = norm(payload.operatorOpenid);

  const materialResults: Array<{ wh: string; mat: string; tons: number; touched: boolean }> =
    [];
  for (const m of materialComposition) {
    const tons = toNum(m.tons);
    if (tons == null || tons <= 0) continue;
    const wh = norm(m.warehouse);
    const mat = norm(m.material);
    if (!wh || !mat) continue;
    const res = await decrementMaterialStorageForProductionInsert(wh, mat, tons, {
      recordId: insertedId,
      productionDate,
      operatorOpenid,
    });
    materialResults.push({ wh, mat, tons, touched: res.touched === true });
  }

  const failedLines = materialResults.filter((x) => !x.touched);
  if (failedLines.length > 0) {
    try {
      await prisma.processingCostInput.delete({ where: { id: insertedId } });
    } catch {
      /* ignore rollback failure */
    }
    const lineText = failedLines
      .slice(0, 5)
      .map((x) => `${x.wh}/${x.mat}/${Number(x.tons || 0).toFixed(4)}吨`)
      .join('；');
    return {
      success: false,
      error: `毛料库存扣减失败，已回滚本次加工单。失败明细：${lineText}`,
    };
  }

  let productStockUpdate:
    | {
        productName: string;
        productWarehouse: string;
        beforeQty?: number;
        afterQty?: number;
        deltaQty: number;
      }
    | undefined;

  if (productTons != null && productTons > 0) {
    const unitPrice =
      toNum(inserted.dailyProcessPrice) != null
        ? toNum(inserted.dailyProcessPrice)
        : productPrice;
    const incRes = await incrementProductStockForProcessingInsert(
      productName,
      productWarehouse,
      productTons,
      {
        recordId: insertedId,
        productionDate,
        defaultPrice: unitPrice,
        operatorOpenid,
      }
    );
    if (!incRes.ok) {
      return {
        success: false,
        error: '加工单已写入，但成品库存更新失败，请联系管理员检查 ProductStock',
      };
    }
    productStockUpdate = {
      productName,
      productWarehouse,
      beforeQty: incRes.beforeQty,
      afterQty: incRes.afterQty,
      deltaQty: productTons,
    };
  }

  // 加工变更会使后续结算单的 LIFO 结果变化：作废该成品自生产日起的材料成本缓存
  try {
    const { invalidateMaterialCostCacheForProduct } = await import(
      './material-cost-cache-service'
    );
    const fromYmd = productionDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
    await invalidateMaterialCostCacheForProduct({
      productName,
      productWarehouse: productWarehouse || null,
      fromDeliveryDateYmd: fromYmd,
    });
  } catch (e) {
    console.warn('加工录入后作废材料成本缓存失败（不影响本单保存）:', e);
  }

  return { success: true, id: insertedId, productStockUpdate };
}

export async function getMyProcessingCostList(operatorOpenid: string) {
  const openid = norm(operatorOpenid);
  if (!openid) return [];

  const rows = await prisma.processingCostInput.findMany({
    where: {
      OR: [{ openid }, { cloudOpenid: openid }, { createBy: openid }],
    },
    select: {
      id: true,
      productName: true,
      productWarehouse: true,
      productionDate: true,
      dailyProcessQty: true,
      productTons: true,
    },
    orderBy: { id: 'desc' },
    take: 30,
  });

  return rows.map((r) => ({
    id: r.id,
    product_name: r.productName,
    product_warehouse: r.productWarehouse,
    production_date: r.productionDate,
    dailyProcess_qty: toNum(r.dailyProcessQty),
    product_tons: toNum(r.productTons),
  }));
}

export { productStockTransfer };
