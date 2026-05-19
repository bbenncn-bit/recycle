import { prisma } from '@/lib/prismadb';

export type MaterialCostCacheRefreshLogRow = {
  id: number;
  createdAt: Date | null;
  deliveryNumber: string | null;
  errorMessage: string | null;
};

/** 删除同一发货单号的重复缓存行（保留 id 最小的一条） */
export async function dedupeMaterialCostCacheByDeliveryNumber(): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE c1 FROM MaterialCostCache c1
    INNER JOIN MaterialCostCache c2
      ON c1.delivery_number = c2.delivery_number
      AND c1.id > c2.id
      AND c1.delivery_number IS NOT NULL
      AND TRIM(c1.delivery_number) <> ''
  `;
  return Number(result) || 0;
}

/** 每次运维刷新写入一条汇总日志（delivery_number 为空表示批次任务） */
export async function insertMaterialCostCacheRefreshLog(
  errorMessage: string,
  deliveryNumber?: string | null,
): Promise<number> {
  const dn = (deliveryNumber ?? '').trim() || null;
  const row = await prisma.materialCostCacheErrorLog.create({
    data: {
      deliveryNumber: dn,
      errorMessage: errorMessage.slice(0, 65535),
    },
    select: { id: true },
  });
  return row.id;
}

export async function listMaterialCostCacheRefreshLogs(
  limit = 50,
): Promise<MaterialCostCacheRefreshLogRow[]> {
  const rows = await prisma.materialCostCacheErrorLog.findMany({
    orderBy: { id: 'desc' },
    take: Math.min(200, Math.max(1, limit)),
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    deliveryNumber: r.deliveryNumber,
    errorMessage: r.errorMessage,
  }));
}
