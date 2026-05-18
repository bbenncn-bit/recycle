import { prisma } from '@/lib/prismadb';

/** 成品库代码（与 ProcessingCostInput.product_warehouse / ProductStock.warehouse_code 一致） */
const EMBEDDED_WAREHOUSE_CODES = [
  'PGGJYK',
  'PGYK12',
  'PGYK34',
  'PGJSJYK',
  'PGSL',
  'JGSL',
  'A1',
  'B1',
  'C1',
  'D2',
] as const;

function trim(s: string | null | undefined): string {
  return (s ?? '').trim();
}

/** 从任意字符串中提取成品库代码（如「PG钢筋压块」旁的 PGGJYK） */
export function extractProductWarehouseCode(raw: string | null | undefined): string | null {
  const t = trim(raw);
  if (!t) return null;
  const upper = t.toUpperCase();
  for (const code of EMBEDDED_WAREHOUSE_CODES) {
    if (upper.includes(code)) return code;
  }
  if (/^[A-Z]\d{1,2}$/i.test(t)) return t.toUpperCase();
  return null;
}

/**
 * 将 DeliverySettlement 的 product_type + warehouse 解析为 LIFO 所需的成品名与成品库代码。
 * 常见情况：warehouse 误存为成品展示名（如「PG钢筋压块」），而加工单使用 PGGJYK。
 */
export async function resolveLifoMatchParams(
  productType: string | null | undefined,
  warehouse: string | null | undefined,
): Promise<{ productName: string; productWarehouse: string | null }> {
  const productName = trim(productType);
  if (!productName) return { productName: '', productWarehouse: null };

  let wh = trim(warehouse);
  if (wh === productName) wh = '';

  const fromWh = extractProductWarehouseCode(wh);
  if (fromWh) return { productName, productWarehouse: fromWh };

  const pciRows = await prisma.$queryRaw<Array<{ w: string | null }>>`
    SELECT DISTINCT product_warehouse AS w
    FROM ProcessingCostInput
    WHERE product_name = ${productName}
      AND product_warehouse IS NOT NULL
      AND TRIM(product_warehouse) <> ''
      AND COALESCE(dailyProcess_qty, 0) > 0
  `;
  const pciCodes = [
    ...new Set(pciRows.map((r) => trim(r.w)).filter(Boolean)),
  ] as string[];

  if (pciCodes.length === 1) {
    return { productName, productWarehouse: pciCodes[0] };
  }
  if (wh && pciCodes.includes(wh)) {
    return { productName, productWarehouse: wh };
  }

  const stocks = await prisma.productStock.findMany({
    where: { productName },
    select: { warehouseCode: true },
  });
  const stockCodes = [
    ...new Set(stocks.map((s) => trim(s.warehouseCode)).filter(Boolean)),
  ] as string[];
  if (stockCodes.length === 1) {
    return { productName, productWarehouse: stockCodes[0] };
  }
  if (wh && stockCodes.includes(wh)) {
    return { productName, productWarehouse: wh };
  }

  // 无法识别库代码时不按 warehouse 过滤（与 SP 传入 NULL 时 OR product_warehouse = '' 行为接近）
  return { productName, productWarehouse: null };
}
