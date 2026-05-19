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

async function main() {
  const { refreshMaterialCostCacheUsingTypeScript } = await import(
    '../src/lib/services/material-cost-cache-service'
  );
  const stats = await refreshMaterialCostCacheUsingTypeScript('2026-04-01', '2026-05-19');
  console.log('refresh stats:', stats);
  const { prisma } = await import('../src/lib/prismadb');
  const n = await prisma.materialCostCache.count();
  const withCost = await prisma.materialCostCache.count({
    where: { materialCost: { gt: 0 } },
  });
  console.log('MaterialCostCache rows:', n, 'with cost > 0:', withCost);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
