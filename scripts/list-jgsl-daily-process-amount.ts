/**
 * 列出 ProcessingCostInput 中 JG散料/JGSL 行，并按投料列重算应填的 dailyProcess_amount。
 * 用法：npx tsx scripts/list-jgsl-daily-process-amount.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const { prisma } = await import('../src/lib/prismadb');

  const cols = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ProcessingCostInput'
        AND (COLUMN_NAME LIKE '%\\_qty' OR COLUMN_NAME LIKE '%\\_price')
      ORDER BY ORDINAL_POSITION`
  );
  const colSet = new Set(cols.map((c) => c.COLUMN_NAME));
  const qtyCols = [...colSet].filter((c) => c.endsWith('_qty') && c !== 'dailyProcess_qty');
  const materialPairs: Array<[string, string]> = [];
  for (const q of qtyCols) {
    const p = q.replace(/_qty$/i, '_price');
    if (colSet.has(p)) materialPairs.push([q, p]);
  }
  const selectExtra = materialPairs.flatMap(([q, p]) => [q, p]).join(', ');

  const rows = await prisma.$queryRawUnsafe<
    Array<Record<string, unknown> & { id: number }>
  >(
    `SELECT id, product_name, product_warehouse, production_date,
            dailyProcess_qty, product_tons, dailyProcess_amount, dailyProcess_price
            ${selectExtra ? `, ${selectExtra}` : ''}
       FROM ProcessingCostInput
      WHERE TRIM(COALESCE(product_name,'')) = 'JG散料'
         OR TRIM(COALESCE(product_warehouse,'')) = 'JGSL'
      ORDER BY id`
  );

  console.log('id\tproduction_date\tqty\tcurrent_amount\tsuggested_amount\tsuggested_price');
  const updates: Array<{ id: number; amount: number; price: number }> = [];

  for (const r of rows) {
    let materialCost = 0;
    for (const [qKey, pKey] of materialPairs) {
      const q = toNum(r[qKey]);
      const p = toNum(r[pKey]);
      if (q > 0 && p > 0) materialCost += q * p;
    }
    const qty = toNum(r.dailyProcess_qty) || toNum(r.product_tons);
    const suggestedAmount = materialCost > 0 ? materialCost : 0;
    const suggestedPrice = qty > 0 && suggestedAmount > 0 ? suggestedAmount / qty : 0;
    const current = r.dailyProcess_amount;
    console.log(
      `${r.id}\t${r.production_date ?? ''}\t${qty}\t${current ?? 'NULL'}\t${suggestedAmount.toFixed(4)}\t${suggestedPrice.toFixed(4)}`
    );
    if (suggestedAmount > 0) {
      updates.push({ id: r.id, amount: suggestedAmount, price: suggestedPrice });
    }
  }

  console.log('\n-- SQL 补丁（按投料成本回填，可直接执行）--');
  for (const u of updates) {
    console.log(
      `UPDATE ProcessingCostInput SET dailyProcess_amount = ${u.amount.toFixed(4)}, dailyProcess_price = ${u.price.toFixed(4)} WHERE id = ${u.id};`
    );
  }
  console.log(`\n共 ${rows.length} 行，可回填 ${updates.length} 行。`);

  const stock = await prisma.productStock.findMany({
    where: {
      OR: [{ productName: 'JG散料' }, { warehouseCode: 'JGSL' }],
    },
    select: { productName: true, warehouseCode: true, currentPrice: true, stockQty: true },
  });
  console.log('\nProductStock JG散料/JGSL:', JSON.stringify(stock, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
