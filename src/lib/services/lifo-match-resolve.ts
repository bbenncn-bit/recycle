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

/** 从任意字符串中提取成品库代码（如 PGGJYK） */
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
 * 结算单/报表常用简称 → ProcessingCostInput.product_name（与加工录入一致）。
 * 钢厂结算常写「PG脚手架」「PG12类」，加工表为「PG脚手架压块」「PG压块（12类）」等。
 */
const SALE_TO_PROCESSING_PRODUCT_NAME: Record<string, string> = {
  PG脚手架: 'PG脚手架压块',
  PG12类: 'PG压块（12类）',
  PG34类: 'PG压块（34类）',
  PG12类压块: 'PG压块（12类）',
  PG34类压块: 'PG压块（34类）',
};

/** 结算单仅存成品库代码、未填 product_type 时，反查加工表成品名 */
const WAREHOUSE_CODE_TO_PRODUCT_NAME: Record<string, string> = {
  PGGJYK: 'PG钢筋压块',
  PGJSJYK: 'PG脚手架压块',
  PGYK12: 'PG压块（12类）',
  PGYK34: 'PG压块（34类）',
  PGSL: 'PG散料',
  JGSL: 'JG散料',
};

async function hasProcessingRowsForProductName(productName: string): Promise<boolean> {
  const n = trim(productName);
  if (!n) return false;
  const c = await prisma.processingCostInput.count({
    where: { productName: n, dailyProcessQty: { gt: 0 } },
  });
  return c > 0;
}

/** 「PG数字类」→ 加工表可能出现的成品名（全角/半角括号） */
function pgCategoryProcessingCandidates(num: string): string[] {
  return [
    `PG压块（${num}类）`,
    `PG压块(${num}类)`,
    `PG压块（${num}类)`,
    `PG压块(${num}类）`,
  ];
}

/**
 * 将结算展示名解析为加工表 product_name（优先别名与规则，再模糊匹配）。
 */
export async function findBestProcessingProductName(candidate: string): Promise<string> {
  const name = trim(candidate);
  if (!name) return '';

  const compact = name.replace(/\s+/g, '');
  const aliasHit =
    SALE_TO_PROCESSING_PRODUCT_NAME[name] ?? SALE_TO_PROCESSING_PRODUCT_NAME[compact];
  if (aliasHit && (await hasProcessingRowsForProductName(aliasHit))) {
    return aliasHit;
  }

  const cat = /^pg(\d+)类$/i.exec(compact);
  if (cat) {
    for (const cn of pgCategoryProcessingCandidates(cat[1])) {
      if (await hasProcessingRowsForProductName(cn)) return cn;
    }
  }

  if (name.includes('脚手架') && !name.includes('压块')) {
    if (await hasProcessingRowsForProductName('PG脚手架压块')) {
      return 'PG脚手架压块';
    }
  }

  if (await hasProcessingRowsForProductName(name)) {
    return name;
  }

  const likePattern = `%${name.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
  const contains = await prisma.$queryRaw<Array<{ product_name: string | null }>>`
    SELECT DISTINCT product_name
    FROM ProcessingCostInput
    WHERE product_name IS NOT NULL
      AND TRIM(product_name) <> ''
      AND COALESCE(dailyProcess_qty, 0) > 0
      AND (
        product_name LIKE ${likePattern}
        OR INSTR(${name}, product_name) > 0
      )
    LIMIT 8
  `;
  const names = [
    ...new Set(contains.map((r) => trim(r.product_name)).filter(Boolean)),
  ] as string[];
  if (names.length === 1) return names[0];
  if (names.length > 1) {
    const exactCi = names.find((n) => n.toLowerCase() === name.toLowerCase());
    if (exactCi) return exactCi;
    return names.sort((a, b) => b.length - a.length)[0];
  }

  return name;
}

/**
 * 销售单成品名：与利润页展示一致，warehouse 常存展示名而 product_type 为空。
 */
export function resolveSaleProductName(
  productType: string | null | undefined,
  warehouse: string | null | undefined,
): string {
  const pt = trim(productType);
  const wh = trim(warehouse);
  if (pt && !extractProductWarehouseCode(pt)) return pt;
  if (wh && !extractProductWarehouseCode(wh)) return wh;
  const whCode = extractProductWarehouseCode(wh) || extractProductWarehouseCode(pt);
  if (whCode && WAREHOUSE_CODE_TO_PRODUCT_NAME[whCode]) {
    return WAREHOUSE_CODE_TO_PRODUCT_NAME[whCode];
  }
  return pt || wh || '';
}

/**
 * 将 DeliverySettlement 的 product_type + warehouse 解析为 LIFO 所需的成品名与成品库代码。
 */
export async function resolveLifoMatchParams(
  productType: string | null | undefined,
  warehouse: string | null | undefined,
): Promise<{ productName: string; productWarehouse: string | null }> {
  let productName = resolveSaleProductName(productType, warehouse);
  if (!productName) return { productName: '', productWarehouse: null };

  productName = await findBestProcessingProductName(productName);

  let wh = trim(warehouse);
  if (wh === productName || wh === trim(productType)) wh = '';

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

  return { productName, productWarehouse: null };
}

/** 结算单 → LIFO 成品名 + 库别（供利润分析与缓存刷新共用） */
export async function resolveSaleProductIdentity(
  productType: string | null | undefined,
  warehouse: string | null | undefined,
): Promise<{ productName: string; productWarehouse: string | null }> {
  return resolveLifoMatchParams(productType, warehouse);
}
