import { prisma } from '@/lib/prismadb';
import { calculateLIFOMaterialCost, parseProductionDate } from './lifo-material-cost-service';
import { resolveLifoMatchParams } from './lifo-match-resolve';
import { parseWarehouseDate } from './profit-service';

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

/**
 * 从缓存中获取材料成本（缓存由 MySQL 事件自动更新）
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
export async function refreshMaterialCostCacheUsingTypeScript(
  startDate: string,
  endDate: string,
): Promise<{ total: number; success: number; withCost: number }> {
  const sales = await prisma.deliverySettlement.findMany({
    where: {
      deliveryNumber: { not: null },
      productType: { not: null },
      deliveryDate: { not: null },
      settlementQuantity: { not: null, gt: 0 },
    },
    select: {
      deliveryNumber: true,
      productType: true,
      warehouse: true,
      deliveryDate: true,
      settlementQuantity: true,
    },
  });

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  let total = 0;
  let success = 0;
  let withCost = 0;

  for (const sale of sales) {
    const d = parseDeliveryDateForCache(sale.deliveryDate);
    if (!d || d < start || d > end) continue;
    const deliveryNumber = (sale.deliveryNumber || '').trim();
    if (!deliveryNumber) continue;

    total += 1;
    const qty = Number(sale.settlementQuantity ?? 0);
    if (qty <= 0) continue;

    const lifo = await calculateLIFOMaterialCost(
      (sale.productType || '').trim(),
      sale.warehouse,
      qty,
      d,
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

    const { productWarehouse } = await resolveLifoMatchParams(
      sale.productType,
      sale.warehouse,
    );

    await prisma.materialCostCache.upsert({
      where: { deliveryNumber },
      create: {
        deliveryNumber,
        productName: sale.productType,
        productWarehouse,
        deliveryDate: sale.deliveryDate,
        settlementQuantity: qty,
        materialCost: lifo.cost,
        materialComposition,
        productionRecords: lifo.productionRecords,
      },
      update: {
        productName: sale.productType,
        productWarehouse,
        deliveryDate: sale.deliveryDate,
        settlementQuantity: qty,
        materialCost: lifo.cost,
        materialComposition,
        productionRecords: lifo.productionRecords,
        calculatedAt: new Date(),
      },
    });

    success += 1;
    if (lifo.cost > 0) withCost += 1;
  }

  return { total, success, withCost };
}
