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

export async function getProductStockForEntry() {
  const rows = await prisma.productStock.findMany({
    select: {
      productName: true,
      warehouseCode: true,
      stockQty: true,
      currentPrice: true,
      updateTime: true,
    },
    take: 500,
    orderBy: { id: 'asc' },
  });
  if (!rows.length) return PRODUCT_LIST_FALLBACK;
  return rows
    .filter((r) => norm(r.productName))
    .map((r) => {
      const name = norm(r.productName);
      const warehouse = norm(r.warehouseCode);
      return {
        id: `${name}|${warehouse}`,
        name,
        warehouse,
        stockQty: toNum(r.stockQty) ?? 0,
        currentPrice: toNum(r.currentPrice) ?? 0,
      };
    });
}

export async function getMaterialStorageForEntry(): Promise<
  Record<
    string,
    Array<{ name: string; shortName: string; currentPrice: number; stockQty: number }>
  >
> {
  const rows = await prisma.materialStorage.findMany({
    select: {
      storageArea: true,
      materialType: true,
      aliasName: true,
      currentQty: true,
      currentPrice: true,
    },
    take: 2000,
  });

  const grouped: Record<
    string,
    Array<{ name: string; shortName: string; currentPrice: number; stockQty: number }>
  > = {};

  for (const r of rows) {
    const wh = norm(r.storageArea);
    const mat = norm(r.materialType);
    if (!wh || !mat) continue;
    const alias = norm(r.aliasName) || mat;
    if (!grouped[wh]) grouped[wh] = [];
    const exists = grouped[wh].some((x) => x.name === mat);
    if (exists) continue;
    grouped[wh].push({
      name: mat,
      shortName: alias,
      currentPrice: toNum(r.currentPrice) ?? 0,
      stockQty: toNum(r.currentQty) ?? 0,
    });
  }

  const staticMap = buildStaticWarehouseMaterials();
  for (const wh of WAREHOUSE_LIST) {
    if (!grouped[wh] || grouped[wh].length === 0) {
      grouped[wh] = staticMap[wh] || [];
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

  const dailyProcessPrice =
    productPrice != null
      ? productPrice
      : productTons != null && productTons > 0 && materialCostSum > 0
        ? materialCostSum / productTons
        : null;

  data.dailyProcessAmount =
    productTons != null && productTons > 0 && productPrice != null
      ? productTons * productPrice
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
