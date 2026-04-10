import { prisma } from '@/lib/prismadb';

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

    if (!cache || cache.materialCost == null) {
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
