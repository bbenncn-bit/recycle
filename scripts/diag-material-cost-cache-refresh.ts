/**
 * 诊断 MaterialCostCache 刷新为何无写入
 * 用法: npx tsx scripts/diag-material-cost-cache-refresh.ts
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

for (const name of ['.env.local', '.env']) {
  const p = resolve(process.cwd(), name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
  break;
}

function parseDeliveryDateForCache(
  dateStr: string | null,
  parseProductionDate: (s: string | null) => Date | null,
  parseWarehouseDate: (s: string | null) => Date | null,
): Date | null {
  return parseProductionDate(dateStr) ?? parseWarehouseDate(dateStr);
}

async function main() {
  const { prisma } = await import('../src/lib/prismadb');
  const { parseProductionDate } = await import('../src/lib/services/lifo-material-cost-service');
  const { parseWarehouseDate, isDateInLocalYmdRange, formatDate } = await import(
    '../src/lib/services/profit-service'
  );
  const { resolveSaleProductIdentity } = await import('../src/lib/services/lifo-match-resolve');
  const parseDate = (s: string | null) =>
    parseDeliveryDateForCache(s, parseProductionDate, parseWarehouseDate);
  const startYmd = '2026-04-01';
  const endYmd = '2026-05-19';

  const cacheCount = await prisma.materialCostCache.count();
  console.log('MaterialCostCache 当前行数:', cacheCount);

  const one = await prisma.deliverySettlement.findFirst();
  console.log('findFirst keys:', one ? Object.keys(one) : []);
  console.log('findFirst sample:', one);

  const rawCount = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*) AS c FROM DeliverySettlement`;
  console.log('DeliverySettlement 总行数:', String(rawCount[0]?.c ?? 0));

  const rawSample = await prisma.$queryRaw<
    Array<{ delivery_number: string; product_type: string; warehouse: string; delivery_date: string }>
  >`
    SELECT delivery_number, product_type, warehouse, delivery_date
    FROM DeliverySettlement
    WHERE settlement_quantity IS NOT NULL AND settlement_quantity > 0
    LIMIT 5`;
  console.log('SQL 原始样例:', rawSample);

  const sales = await prisma.deliverySettlement.findMany({
    where: {
      deliveryNumber: { not: null },
      productType: { not: null },
      deliveryDate: { not: null },
      settlementQuantity: { not: null, gt: 0 },
    },
    select: {
      id: true,
      deliveryNumber: true,
      productType: true,
      warehouse: true,
      deliveryDate: true,
      settlementQuantity: true,
    },
    take: 5,
  });
  console.log('Prisma select 样例:', sales);

  const all = await prisma.deliverySettlement.findMany({
    where: {
      deliveryNumber: { not: null },
      deliveryDate: { not: null },
      settlementQuantity: { not: null, gt: 0 },
      OR: [{ productType: { not: null } }, { warehouse: { not: null } }],
    },
    select: {
      deliveryNumber: true,
      productType: true,
      warehouse: true,
      deliveryDate: true,
    },
  });

  let inRange = 0;
  let unparsed = 0;
  const unparsedSamples: string[] = [];
  for (const s of all) {
    const d = parseDate(s.deliveryDate);
    if (!d) {
      unparsed += 1;
      if (unparsedSamples.length < 8 && s.deliveryDate) {
        unparsedSamples.push(String(s.deliveryDate));
      }
      continue;
    }
    if (isDateInLocalYmdRange(d, startYmd, endYmd)) inRange += 1;
  }

  console.log(`结算单总数(有发货号/品种/日期/结算量): ${all.length}`);
  console.log(`日期无法解析: ${unparsed}`, unparsedSamples.length ? unparsedSamples : '');
  console.log(`落在 ${startYmd}~${endYmd}: ${inRange}`);

  let wouldUpsert = 0;
  let noProduct = 0;
  const sampleNoProduct: string[] = [];
  for (const s of all) {
    const d = parseDate(s.deliveryDate);
    if (!d || !isDateInLocalYmdRange(d, startYmd, endYmd)) continue;
    const { productName } = await resolveSaleProductIdentity(s.productType, s.warehouse);
    if (!productName) {
      noProduct += 1;
      if (sampleNoProduct.length < 5) {
        sampleNoProduct.push(`${s.deliveryDate} pt=${s.productType} wh=${s.warehouse}`);
      }
      continue;
    }
    wouldUpsert += 1;
    if (wouldUpsert <= 3) {
      console.log('  可写入样例:', s.deliveryNumber, productName, formatDate(d));
    }
  }
  console.log(`可 resolve 成品名并应 upsert: ${wouldUpsert}`);
  console.log(`在范围内但无成品名: ${noProduct}`, sampleNoProduct);

  try {
    await prisma.materialCostCache.create({
      data: {
        deliveryNumber: `__diag_test_${Date.now()}`,
        productName: 'test',
        materialCost: 1,
        materialComposition: [],
        productionRecords: [],
      },
    });
    console.log('MaterialCostCache create 测试: OK');
    await prisma.materialCostCache.deleteMany({
      where: { deliveryNumber: { startsWith: '__diag_test_' } },
    });
  } catch (e) {
    console.error('MaterialCostCache create 测试失败:', e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../src/lib/prismadb');
    await prisma.$disconnect();
  });
