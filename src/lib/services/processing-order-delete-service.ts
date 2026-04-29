import { prisma } from '@/lib/prismadb';
import {
  decrementProductStockForProcessingDelete,
  incrementMaterialStorageForProcessingDelete,
} from '@/lib/services/inventory-ops-service';

/** 与云函数 mysql/index.js MATERIAL_ALIAS_COLUMN_PREFIXES 一致 */
const MATERIAL_ALIAS_PREFIXES = [
  'MSLKM4',
  'MSLKM2',
  'MSLKM',
  'MSLKM0',
  'MSLKM6',
  'MJSJM4',
  'MJSJM2',
  'MCKKM',
  'MCKKM0',
  'MGJKM0',
  'MGJKM10',
  'MLKM2',
  'MLKM',
  'MLKQ1M2',
  'MLKQ1M0',
  'MLKQ1M6',
  'FL1',
] as const;

function norm(s: unknown): string {
  return (s != null ? String(s) : '').trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const n = parseFloat(String((v as { toString(): string }).toString()));
    return Number.isNaN(n) ? null : n;
  }
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

function parseJsonField(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
    try {
      return JSON.parse(raw.toString('utf8'));
    } catch {
      return null;
    }
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw;
  return null;
}

/** 从 ProcessingCostInput 行解析毛料用量（与云函数 getProcessingCostDetail / 更新回滚一致） */
export function extractCompositionFromProcessingRow(
  row: Record<string, unknown>
): Array<{ warehouse: string; material: string; tons: number }> {
  const out: Array<{ warehouse: string; material: string; tons: number }> = [];
  const defaultWh = norm(row.product_warehouse ?? row.productWarehouse);

  let materialWarehouses: Record<string, string> = {};
  const mwRaw = parseJsonField(row.material_warehouses ?? row.materialWarehouses);
  if (mwRaw && typeof mwRaw === 'object' && !Array.isArray(mwRaw)) {
    materialWarehouses = mwRaw as Record<string, string>;
  }

  const compRaw = parseJsonField(row.material_composition ?? row.materialComposition);
  if (Array.isArray(compRaw) && compRaw.length > 0) {
    for (const it of compRaw as Array<Record<string, unknown>>) {
      const material = norm(it.material);
      const warehouse = norm(it.warehouse);
      const tons = toNum(it.tons);
      if (material && warehouse && tons != null && tons > 0) {
        out.push({ warehouse, material, tons });
      }
    }
    if (out.length > 0) return out;
  }

  for (const prefix of MATERIAL_ALIAS_PREFIXES) {
    const qtyCol = `${prefix}_qty`;
    const qty = toNum(row[qtyCol]);
    if (qty == null || qty <= 0) continue;
    const wh = norm(materialWarehouses[prefix]) || defaultWh;
    if (!wh) continue;
    out.push({ warehouse: wh, material: prefix, tons: qty });
  }

  return out;
}

/**
 * 删除一条加工单并回滚库存：毛料加回、成品扣减，再删 ProcessingCostInput。
 * - adminBypass=true：运维已校验 INVENTORY_OPS_SECRET，不校验 openid。
 * - 否则须传 openid，且与行内 openid/_openid 一致。
 */
export async function deleteProcessingOrderWithRollback(opts: {
  id: number;
  openid?: string | null;
  adminBypass: boolean;
}): Promise<{
  success: boolean;
  error?: string;
  productName?: string;
  productWarehouse?: string;
  productTons?: number;
  materialLines?: number;
}> {
  const id = Math.floor(Number(opts.id));
  if (!id || id < 1) return { success: false, error: '无效的加工单 id' };

  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT * FROM `ProcessingCostInput` WHERE `id` = ? LIMIT 1',
        id
      );
      const row = rows[0];
      if (!row) {
        return {
          success: false,
          error:
            '记录不存在（可能已在库里直接 DELETE）。若未回滚就删行，毛料会少计扣减、成品会多计入库；请根据当时单据或 MaterialStorageChangeLog 手工补调。',
        };
      }

      if (!opts.adminBypass) {
        const want = norm(opts.openid);
        if (!want) {
          return {
            success: false,
            error: '非管理员删除须传 openid（与单据录入人一致），或由管理员在配置了 INVENTORY_OPS_SECRET 的运维页操作。',
          };
        }
        const o1 = norm(row.openid);
        const o2 = norm(row._openid);
        if (want !== o1 && want !== o2) {
          return { success: false, error: 'openid 与单据不符，拒绝删除' };
        }
      }

      const composition = extractCompositionFromProcessingRow(row);
      const productName = norm(row.product_name ?? row.productName);
      const productWarehouse = norm(row.product_warehouse ?? row.productWarehouse);
      const productionDate = norm(row.production_date ?? row.productionDate);
      const productTons =
        toNum(row.daily_process_qty ?? row.dailyProcess_qty ?? row.product_tons ?? row.productTons) ?? 0;

      const materialRollback: Array<{ touched: boolean; frozen?: boolean }> = [];
      for (const item of composition) {
        const r = await incrementMaterialStorageForProcessingDelete(
          item.warehouse,
          item.material,
          item.tons,
          { recordId: id, productionDate: productionDate || null },
          tx
        );
        materialRollback.push(r);
      }
      if (composition.length > 0 && materialRollback.some((r) => !r.touched)) {
        throw new Error(
          '毛料回滚未全部生效：MaterialStorage 未匹配到对应行（加工单存的是别名编码如 MGJKM0，需与库存表 alias_name / material_type 一致）。请检查数据后重试。'
        );
      }

      if (productTons > 0 && productName) {
        await decrementProductStockForProcessingDelete(
          productName,
          productWarehouse || null,
          productTons,
          tx,
          {
            recordId: id,
            businessDate: productionDate || null,
            note: 'deleteProcessingOrder 成品回滚扣减',
          }
        );
      }

      await tx.$executeRawUnsafe('DELETE FROM `ProcessingCostInput` WHERE `id` = ?', id);

      return {
        success: true,
        productName,
        productWarehouse,
        productTons,
        materialLines: composition.length,
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg || '事务失败' };
  }
}
