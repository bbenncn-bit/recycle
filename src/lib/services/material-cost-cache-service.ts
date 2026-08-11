import { prisma } from '@/lib/prismadb';
import {
  calculateLIFOMaterialCost,
  parseProductionDate,
  resolveLifoSettlementQuantity,
} from './lifo-material-cost-service';
import { resolveSaleProductIdentity } from './lifo-match-resolve';
import {
  dedupeMaterialCostCacheByDeliveryNumber,
  insertMaterialCostCacheRefreshLog,
} from './material-cost-cache-log-service';
import { isDateInLocalYmdRange, parseLocalYmd, parseWarehouseDate } from './profit-service';

/** 材料构成项（与 MaterialCostCache.material_composition JSON 一致：material, quantity 吨, cost 元） */
export type MaterialCompositionItem = {
  material: string;
  quantity: number;
  cost: number;
};

/** 生产记录项（与 MaterialCostCache.production_records JSON 一致） */
export type ProductionRecordItem = {
  id: number;
  productionDate: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

/** 磅差：transitloss 列为吨数；列为空时材料核算回退扣杂率（率） */
function normalizeTransitLossRate(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1 ? value / 100 : value;
}

function processDecimal(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return parseFloat(String(value)) || 0;
  }
  return 0;
}

/**
 * 仅信任此时间之后写入的材料成本缓存。
 * 此前 MaterialCostCache 多为旧版 MySQL SP / 错误刷新结果（成本虚高），
 * 2026-08 起改为「优先读缓存」后曾直接污染利润分析；必须丢弃旧缓存。
 * 环境变量 MATERIAL_COST_CACHE_TRUST_AFTER（ISO 时间）可覆盖。
 */
export function getMaterialCostCacheTrustAfter(): Date {
  const fromEnv = (process.env.MATERIAL_COST_CACHE_TRUST_AFTER || '').trim();
  if (fromEnv) {
    const d = new Date(fromEnv);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // 北京时间 2026-08-11 17:00 — 修复「缓存优先读到旧 SP 脏数据」之后
  return new Date('2026-08-11T09:00:00.000Z');
}

function isTrustedCacheCalculatedAt(calculatedAt: Date | null | undefined): boolean {
  if (!calculatedAt) return false;
  return calculatedAt.getTime() >= getMaterialCostCacheTrustAfter().getTime();
}

function parseCacheComposition(raw: unknown): MaterialCompositionItem[] {
  const rawComp = raw as Array<{ material?: string; quantity?: number; cost?: number }> | null;
  if (!Array.isArray(rawComp)) return [];
  return rawComp
    .filter(
      (m): m is { material: string; quantity: number; cost: number } =>
        !!m && typeof m.material === 'string'
    )
    .map((m) => ({
      material: String(m.material),
      quantity: Number(m.quantity ?? 0),
      cost: Number(m.cost ?? 0),
    }));
}

function parseCacheProductionRecords(raw: unknown): ProductionRecordItem[] {
  const rawRec = raw as ProductionRecordItem[] | null;
  if (!Array.isArray(rawRec)) return [];
  return rawRec.map((r) => ({
    id: Number(r.id),
    productionDate: String(r.productionDate ?? ''),
    quantity: Number(r.quantity ?? 0),
    unitCost: Number(r.unitCost ?? 0),
    totalCost: Number(r.totalCost ?? 0),
  }));
}

/**
 * 从 MaterialCostCache 读取材料成本（仅信任近期 TypeScript LIFO 写入的结果）
 */
export async function getMaterialCostFromCache(
  deliveryNumber: string
): Promise<{
  materialCost: number;
  materialComposition: MaterialCompositionItem[];
  productionRecords: ProductionRecordItem[];
  settlementQuantity: number | null;
} | null> {
  try {
    const cache = await prisma.materialCostCache.findUnique({
      where: { deliveryNumber },
    });

    if (
      !cache ||
      cache.materialCost == null ||
      Number(cache.materialCost) === 0 ||
      !isTrustedCacheCalculatedAt(cache.calculatedAt)
    ) {
      return null;
    }

    return {
      materialCost: Number(cache.materialCost),
      materialComposition: parseCacheComposition(cache.materialComposition),
      productionRecords: parseCacheProductionRecords(cache.productionRecords),
      settlementQuantity:
        cache.settlementQuantity != null ? Number(cache.settlementQuantity) : null,
    };
  } catch (error) {
    console.error('从缓存获取材料成本失败:', error);
    return null;
  }
}

export type MaterialCostCacheEntry = {
  materialCost: number;
  materialComposition: MaterialCompositionItem[];
  productionRecords: ProductionRecordItem[];
  settlementQuantity: number | null;
};

/** 批量预取材料成本缓存（利润分析页一次加载，避免逐单 findUnique） */
export async function getMaterialCostsFromCacheBatch(
  deliveryNumbers: string[]
): Promise<Map<string, MaterialCostCacheEntry>> {
  const out = new Map<string, MaterialCostCacheEntry>();
  const keys = [
    ...new Set(
      deliveryNumbers.map((d) => (d || '').trim()).filter((d) => d.length > 0)
    ),
  ];
  if (keys.length === 0) return out;

  const trustAfter = getMaterialCostCacheTrustAfter();

  try {
    const rows = await prisma.materialCostCache.findMany({
      where: {
        deliveryNumber: { in: keys },
        calculatedAt: { gte: trustAfter },
        materialCost: { gt: 0 },
      },
      select: {
        deliveryNumber: true,
        materialCost: true,
        materialComposition: true,
        productionRecords: true,
        settlementQuantity: true,
        calculatedAt: true,
      },
    });

    for (const cache of rows) {
      const dn = (cache.deliveryNumber || '').trim();
      if (!dn) continue;
      if (!isTrustedCacheCalculatedAt(cache.calculatedAt)) continue;
      if (cache.materialCost == null || Number(cache.materialCost) === 0) continue;

      out.set(dn, {
        materialCost: Number(cache.materialCost),
        materialComposition: parseCacheComposition(cache.materialComposition),
        productionRecords: parseCacheProductionRecords(cache.productionRecords),
        settlementQuantity:
          cache.settlementQuantity != null ? Number(cache.settlementQuantity) : null,
      });
    }
  } catch (error) {
    console.error('批量读取 MaterialCostCache 失败:', error);
  }

  return out;
}

/** 将单笔 LIFO 结果回写缓存（利润页未命中时边算边写，供后续秒开） */
export async function upsertMaterialCostCacheEntry(params: {
  deliveryNumber: string;
  productName?: string | null;
  productWarehouse?: string | null;
  deliveryDate?: string | null;
  settlementQuantity?: number | null;
  materialCost: number;
  materialComposition: MaterialCompositionItem[];
  productionRecords: ProductionRecordItem[];
}): Promise<void> {
  const deliveryNumber = (params.deliveryNumber || '').trim();
  if (!deliveryNumber || !(params.materialCost > 0)) return;

  try {
    await prisma.materialCostCache.upsert({
      where: { deliveryNumber },
      create: {
        deliveryNumber,
        productName: params.productName ?? null,
        productWarehouse: params.productWarehouse ?? null,
        deliveryDate: params.deliveryDate ?? null,
        settlementQuantity: params.settlementQuantity ?? null,
        materialCost: params.materialCost,
        materialComposition: params.materialComposition,
        productionRecords: params.productionRecords,
        calculatedAt: new Date(),
      },
      update: {
        productName: params.productName ?? null,
        productWarehouse: params.productWarehouse ?? null,
        deliveryDate: params.deliveryDate ?? null,
        settlementQuantity: params.settlementQuantity ?? null,
        materialCost: params.materialCost,
        materialComposition: params.materialComposition,
        productionRecords: params.productionRecords,
        calculatedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn(`MaterialCostCache 回写失败 ${deliveryNumber}:`, err);
  }
}

/**
 * 加工数据变更后：删除该成品自指定日期起的材料成本缓存，促使利润页重算。
 * productionDateYmd 为空则删除该成品全部缓存。
 */
export async function invalidateMaterialCostCacheForProduct(params: {
  productName: string;
  productWarehouse?: string | null;
  fromDeliveryDateYmd?: string | null;
}): Promise<number> {
  const productName = (params.productName || '').trim();
  if (!productName) return 0;
  const wh = (params.productWarehouse || '').trim();
  const from = (params.fromDeliveryDateYmd || '').trim();

  try {
    const where: {
      productName: string;
      productWarehouse?: string;
      deliveryDate?: { gte: string };
    } = { productName };
    if (wh) where.productWarehouse = wh;
    if (/^\d{4}-\d{2}-\d{2}/.test(from)) {
      where.deliveryDate = { gte: from.slice(0, 10) };
    }
    const res = await prisma.materialCostCache.deleteMany({ where });
    return res.count;
  } catch (e) {
    console.warn('invalidateMaterialCostCacheForProduct failed:', e);
    return 0;
  }
}

/** 删除不受信任的旧缓存（旧 SP / 2026-05 脏数据），避免再次被读入 */
export async function purgeUntrustedMaterialCostCache(): Promise<number> {
  try {
    const res = await prisma.materialCostCache.deleteMany({
      where: { calculatedAt: { lt: getMaterialCostCacheTrustAfter() } },
    });
    return res.count;
  } catch (e) {
    console.warn('purgeUntrustedMaterialCostCache failed:', e);
    return 0;
  }
}

function parseDeliveryDateForCache(dateStr: string | null): Date | null {
  return parseProductionDate(dateStr) ?? parseWarehouseDate(dateStr);
}

/**
 * 使用 TypeScript LIFO（含 MSLKM、MGJKM 等 alias 材料列、库别解析、同月回退）刷新 MaterialCostCache。
 * 替代仅统计 M1~M9 列的旧版 sp_update_material_cost_cache。
 */
function trimSaleField(s: string | null | undefined): string {
  return (s ?? '').trim();
}

/** 结算单是否具备 LIFO 所需的成品标识（品种或仓库展示名至少一项非空） */
export function hasSaleProductIdentity(
  productType: string | null | undefined,
  warehouse: string | null | undefined,
): boolean {
  return trimSaleField(productType) !== '' || trimSaleField(warehouse) !== '';
}

export type MaterialCostCacheRefreshStats = {
  total: number;
  success: number;
  withCost: number;
  skippedNoProduct: number;
  dedupedRows: number;
  logId: number;
};

export async function refreshMaterialCostCacheUsingTypeScript(
  startDate: string,
  endDate: string,
): Promise<MaterialCostCacheRefreshStats> {
  const dedupedRows = await dedupeMaterialCostCacheByDeliveryNumber();

  const sales = await prisma.deliverySettlement.findMany({
    where: {
      deliveryNumber: { not: null },
      deliveryDate: { not: null },
      settlementQuantity: { not: null, gt: 0 },
      OR: [{ productType: { not: null } }, { warehouse: { not: null } }],
    },
    select: {
      id: true,
      deliveryNumber: true,
      productType: true,
      warehouse: true,
      deliveryDate: true,
      settlementQuantity: true,
      netWeight: true,
      deductionRate: true,
    },
  });

  const startYmd = startDate.trim();
  const endYmd = endDate.trim();
  if (!parseLocalYmd(startYmd) || !parseLocalYmd(endYmd)) {
    throw new Error('开始、结束日期须为 YYYY-MM-DD');
  }

  const DEFAULT_TRANSIT_LOSS_RATE = 0.005;

  const transitLossRawBySaleId = new Map<number, unknown>();
  try {
    const transitRows = await prisma.$queryRaw<Array<{ id: number; transitLoss: unknown }>>`
      SELECT id, transitloss AS transitLoss FROM DeliverySettlement
    `;
    for (const row of transitRows) {
      transitLossRawBySaleId.set(Number(row.id), row.transitLoss);
    }
  } catch {
    /* 无 transitloss 列时仅用 deduction_rate */
  }

  function getTransitLossTonsFromDb(saleId: number): number | null {
    if (!transitLossRawBySaleId.has(saleId)) return null;
    const raw = transitLossRawBySaleId.get(saleId);
    if (raw === null || raw === undefined) return null;
    const n = processDecimal(raw);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  let total = 0;
  let success = 0;
  let withCost = 0;
  let skippedNoProduct = 0;

  for (const sale of sales) {
    if (!hasSaleProductIdentity(sale.productType, sale.warehouse)) continue;

    const d = parseDeliveryDateForCache(sale.deliveryDate);
    if (!d || !isDateInLocalYmdRange(d, startYmd, endYmd)) continue;
    const deliveryNumber = trimSaleField(sale.deliveryNumber);
    if (!deliveryNumber) continue;

    total += 1;
    const settlementQty = Number(sale.settlementQuantity ?? 0);
    if (settlementQty <= 0) continue;

    const tonsDb = getTransitLossTonsFromDb(Number(sale.id));
    const rateFallback = (() => {
      const d = normalizeTransitLossRate(processDecimal(sale.deductionRate));
      return d > 0 ? d : DEFAULT_TRANSIT_LOSS_RATE;
    })();
    const lifoQty = resolveLifoSettlementQuantity({
      settlementQuantity: settlementQty,
      netWeightQuantity: processDecimal(sale.netWeight),
      transitLossTons: tonsDb !== null ? tonsDb : null,
      transitLossRate: tonsDb === null ? rateFallback : undefined,
    });
    if (lifoQty <= 0) continue;

    const { productName, productWarehouse } = await resolveSaleProductIdentity(
      sale.productType,
      sale.warehouse,
    );
    if (!productName) {
      skippedNoProduct += 1;
      continue;
    }

    const lifo = await calculateLIFOMaterialCost(
      productName,
      productWarehouse,
      lifoQty,
      d,
      { skipResolve: true },
    );

    const totalTons = lifo.composition.reduce((s, c) => s + (c.tons ?? 0), 0);
    const materialComposition: MaterialCompositionItem[] =
      totalTons > 0
        ? lifo.composition.map((c) => ({
            material: c.material,
            quantity: c.tons ?? 0,
            cost: ((c.tons ?? 0) / totalTons) * lifo.cost,
          }))
        : [];

    try {
      await prisma.materialCostCache.upsert({
        where: { deliveryNumber },
        create: {
          deliveryNumber,
          productName,
          productWarehouse,
          deliveryDate: sale.deliveryDate,
          settlementQuantity: settlementQty,
          materialCost: lifo.cost,
          materialComposition,
          productionRecords: lifo.productionRecords,
        },
        update: {
          productName,
          productWarehouse,
          deliveryDate: sale.deliveryDate,
          settlementQuantity: settlementQty,
          materialCost: lifo.cost,
          materialComposition,
          productionRecords: lifo.productionRecords,
          calculatedAt: new Date(),
        },
      });
      success += 1;
      if (lifo.cost > 0) withCost += 1;
    } catch (err) {
      console.error(`MaterialCostCache upsert 失败 ${deliveryNumber}:`, err);
    }
  }

  const summary = [
    `刷新成功 ${startYmd} ~ ${endYmd}`,
    `去重删除 ${dedupedRows} 条重复缓存`,
    `范围内结算单 ${total} 条`,
    `写入/更新 ${success} 条`,
    `材料成本>0: ${withCost} 条`,
    skippedNoProduct > 0 ? `无法解析成品名: ${skippedNoProduct} 条` : null,
  ]
    .filter(Boolean)
    .join('；');

  const logId = await insertMaterialCostCacheRefreshLog(summary, null);

  return { total, success, withCost, skippedNoProduct, dedupedRows, logId };
}
