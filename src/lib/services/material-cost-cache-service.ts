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

/** 途损：库内可能存 0.5（表示 0.5%）或 0.005 */
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
 * 从 MaterialCostCache 读取材料成本（由运维「刷新材料成本缓存」或利润页实时 LIFO 写入）
 */
export async function getMaterialCostFromCache(
  deliveryNumber: string
): Promise<{
  materialCost: number;
  materialComposition: MaterialCompositionItem[];
  productionRecords: ProductionRecordItem[];
} | null> {
  try {
    const cache = await prisma.materialCostCache.findUnique({
      where: { deliveryNumber },
    });

  // material_cost = 0 多为旧版 SP 未统计 MSLKM*/MGJKM* 列或库别不匹配；允许走实时 LIFO 重算
    if (
      !cache ||
      cache.materialCost == null ||
      Number(cache.materialCost) === 0
    ) {
      return null;
    }

    const rawComp = (cache.materialComposition as unknown) as Array<{ material?: string; quantity?: number; cost?: number }> | null;
    const materialComposition: MaterialCompositionItem[] = Array.isArray(rawComp)
      ? rawComp
          .filter((m): m is { material: string; quantity: number; cost: number } => !!m && typeof m.material === 'string')
          .map((m) => ({
            material: String(m.material),
            quantity: Number(m.quantity ?? 0),
            cost: Number(m.cost ?? 0),
          }))
      : [];

    const rawRec = (cache.productionRecords as unknown) as ProductionRecordItem[] | null;
    const productionRecords: ProductionRecordItem[] = Array.isArray(rawRec)
      ? rawRec.map((r) => ({
          id: Number(r.id),
          productionDate: String(r.productionDate ?? ''),
          quantity: Number(r.quantity ?? 0),
          unitCost: Number(r.unitCost ?? 0),
          totalCost: Number(r.totalCost ?? 0),
        }))
      : [];

    return {
      materialCost: Number(cache.materialCost),
      materialComposition,
      productionRecords,
    };
  } catch (error) {
    console.error('从缓存获取材料成本失败:', error);
    return null;
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

  const transitLossBySaleId = new Map<number, number>();
  try {
    const transitRows = await prisma.$queryRaw<Array<{ id: number; transitLoss: unknown }>>`
      SELECT id, transitloss AS transitLoss FROM DeliverySettlement
    `;
    for (const row of transitRows) {
      const v = normalizeTransitLossRate(processDecimal(row.transitLoss));
      if (v > 0) transitLossBySaleId.set(Number(row.id), v);
    }
  } catch {
    /* 无 transitloss 列时仅用 deduction_rate */
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

    const transit =
      transitLossBySaleId.get(Number(sale.id)) ??
      normalizeTransitLossRate(processDecimal(sale.deductionRate));
    const lifoQty = resolveLifoSettlementQuantity({
      settlementQuantity: settlementQty,
      netWeightQuantity: processDecimal(sale.netWeight),
      transitLossRate: transit,
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
