import { prisma } from '@/lib/prismadb';
import { getProcessingCostMaterialQtyFieldLabels } from '@/lib/processing-cost-input-material-columns';
import {
  findBestProcessingProductName,
  resolveLifoMatchParams,
} from './lifo-match-resolve';
import { parseWarehouseDate } from './profit-service';

function getRecordField(record: Record<string, unknown>, canonical: string): unknown {
  if (canonical in record) return (record as any)[canonical];
  const lower = canonical.toLowerCase();
  for (const k of Object.keys(record)) {
    if (k.toLowerCase() === lower) return (record as any)[k];
  }
  return undefined;
}

/** ProcessingCostInput 实际列名（小写 -> information_schema 中的名字）；短 TTL 缓存 */
let pciColumnLowerToActual: Map<string, string> | null = null;
/** 已按当前表结构拼好的 SELECT 列清单（仅含存在的列） */
let pciSelectListSql: string | null = null;
let pciShapeCachedAt = 0;

/** information_schema 结果可能滞后或进程长久存活后表结构已变；过期后强制重探测 */
const PCI_SHAPE_TTL_MS = Number(process.env.PCI_SHAPE_CACHE_TTL_MS ?? '60000');

function isUnknownMysqlColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Unknown column/i.test(msg)) return true;
  const any = err as { code?: string; meta?: { code?: string } };
  if (any?.code === 'P2010') return true;
  const metaCode = any?.meta?.code;
  if (typeof metaCode === 'string' && metaCode === '1054') return true;
  return false;
}

/** 表结构变更或列探测错误后调用，避免永久缓存过时列清单（典型：Unknown column 'M1_qty'） */
export function invalidateProcessingCostInputShapeCache(): void {
  pciColumnLowerToActual = null;
  pciSelectListSql = null;
  pciShapeCachedAt = 0;
}

const lifoDebug = process.env.PROFIT_LIFO_DEBUG === '1';

/**
 * LIFO 材料核算量（吨）。
 * - 若提供 **transitLossTons**（DeliverySettlement.transitloss，磅差吨数）：在「净重」或「结算量」基准上加计吨数，不再用 (1+率)。
 * - 否则沿用 **transitLossRate**：结算量×(1+率)；净重合理时净重×(1+率)。
 * 当出厂净重明显大于结算量时，不按净重扣减（避免整车净重套在拆分结算单上）。
 */
export function resolveLifoSettlementQuantity(params: {
  settlementQuantity: number;
  netWeightQuantity?: number;
  /** 磅差（吨），有值（含 0）时优先按吨加计 */
  transitLossTons?: number | null;
  transitLossRate?: number;
  /** 净重/结算量超过该倍数时强制按结算量计 */
  maxNetToSettlementRatio?: number;
}): number {
  const qty = params.settlementQuantity;
  if (qty <= 0) return 0;
  const net = params.netWeightQuantity ?? 0;
  const maxRatio = params.maxNetToSettlementRatio ?? 1.25;

  const tonsArg = params.transitLossTons;
  const useTons =
    tonsArg !== undefined &&
    tonsArg !== null &&
    Number.isFinite(Number(tonsArg)) &&
    Number(tonsArg) >= 0;
  if (useTons) {
    const tons = Number(tonsArg);
    if (net <= 0 || net <= qty * maxRatio) {
      return net > 0 ? net + tons : qty + tons;
    }
    return qty + tons;
  }

  const transit = params.transitLossRate ?? 0;
  const withTransit = qty * (1 + transit);
  if (net <= 0 || net <= qty * maxRatio) {
    return net > 0 ? net * (1 + transit) : withTransit;
  }
  return withTransit;
}

/**
 * 单批加工：毛料用量合计相对成品产量的最大合理倍数。
 * 超过则视为把「累计领料」误录入 *_qty（如 PG34 类 MSLKM_qty≈10877、产量≈1077），
 * 按 产量/毛料合计 同比折算材料金额，使每吨成品材料成本≈加权毛料单价（约 2000 元/吨级）。
 */
const MAX_MATERIAL_QTY_TO_OUTPUT_RATIO = 3;

function normalizeMaterialsToOutputQuantity(
  materials: Array<{ material: string; qty: number; price: number; cost: number }>,
  outputQty: number,
  recordId?: number | string,
): {
  materials: Array<{ material: string; qty: number; price: number; cost: number }>;
  totalCost: number;
} {
  const totalCost = materials.reduce((sum, m) => sum + m.cost, 0);
  if (outputQty <= 0 || materials.length === 0) {
    return { materials, totalCost };
  }

  const materialQtySum = materials.reduce((sum, m) => sum + m.qty, 0);
  if (materialQtySum <= outputQty * MAX_MATERIAL_QTY_TO_OUTPUT_RATIO) {
    return { materials, totalCost };
  }

  const scale = outputQty / materialQtySum;
  const scaled = materials.map((m) => ({
    ...m,
    qty: m.qty * scale,
    cost: m.cost * scale,
  }));
  const scaledCost = totalCost * scale;

  console.warn(
    `[LIFO] 生产记录 ${recordId ?? '?'} 毛料用量合计 ${materialQtySum.toFixed(2)} 吨 > 产量 ${outputQty.toFixed(2)} 吨的 ${MAX_MATERIAL_QTY_TO_OUTPUT_RATIO} 倍，已按 ${(scale * 100).toFixed(2)}% 折算材料成本`,
  );

  return { materials: scaled, totalCost: scaledCost };
}

function quoteMysqlIdent(name: string): string {
  return '`' + name.replace(/`/g, '``') + '`';
}

/**
 * 部分库仅有 material_composition，或列名已切换为 MSLKM4_qty 等 alias 列；动态探测列，
 * 避免 SELECT 引用不存在的列触发 1054 导致整页利润明细失败。
 */
async function getProcessingCostInputSelectShape(): Promise<{
  selectListSql: string;
  hasProductionDate: boolean;
  lowerToActual: Map<string, string>;
}> {
  const cacheFresh =
    pciSelectListSql !== null &&
    pciColumnLowerToActual !== null &&
    Date.now() - pciShapeCachedAt < PCI_SHAPE_TTL_MS;

  if (cacheFresh) {
    return {
      selectListSql: pciSelectListSql!,
      hasProductionDate: pciColumnLowerToActual!.has('production_date'),
      lowerToActual: pciColumnLowerToActual!,
    };
  }

  invalidateProcessingCostInputShapeCache();

  let lowerToActual = new Map<string, string>();
  try {
    const rows = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND LOWER(TABLE_NAME) = LOWER('ProcessingCostInput')
    `;
    for (const r of rows) {
      if (r.COLUMN_NAME) lowerToActual.set(r.COLUMN_NAME.toLowerCase(), r.COLUMN_NAME);
    }
  } catch {
    lowerToActual = new Map();
  }

  pciColumnLowerToActual = lowerToActual;

  const parts: string[] = [];
  const addCanonical = (canonical: string) => {
    const actual = lowerToActual.get(canonical.toLowerCase());
    if (!actual) return;
    if (actual === canonical) {
      parts.push(quoteMysqlIdent(actual));
    } else {
      parts.push(`${quoteMysqlIdent(actual)} AS ${quoteMysqlIdent(canonical)}`);
    }
  };

  addCanonical('id');
  addCanonical('production_date');
  addCanonical('dailyProcess_qty');
  addCanonical('product_tons');
  addCanonical('material_composition');

  for (const qtyKey of Object.keys(getProcessingCostMaterialQtyFieldLabels())) {
    const priceKey = qtyKey.replace(/_qty$/i, '_price');
    addCanonical(qtyKey);
    addCanonical(priceKey);
  }

  pciSelectListSql = parts.length > 0 ? parts.join(',\n          ') : '`id`';
  pciShapeCachedAt = Date.now();

  return {
    selectListSql: pciSelectListSql,
    hasProductionDate: lowerToActual.has('production_date'),
    lowerToActual,
  };
}

/**
 * 处理数值：将 Decimal 转换为 number，处理 null 值
 */
function processDecimal(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value && typeof value.toString === 'function') {
    return parseFloat(value.toString()) || 0;
  }
  return 0;
}

/**
 * 解析生产日期字符串为 Date 对象
 * 支持格式：MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY 等
 */
export function parseProductionDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 尝试 MM/DD/YYYY 格式（用户数据格式：09/10/2025）
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match1 = trimmed.match(mmddyyyy);
  if (match1) {
    const month = parseInt(match1[1]) - 1;
    const day = parseInt(match1[2]);
    const year = parseInt(match1[3]);
    if (year >= 1900 && year <= 2100 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  // 尝试 YYYY-MM-DD 格式
  const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
  const match2 = trimmed.match(yyyymmdd);
  if (match2) {
    const year = parseInt(match2[1]);
    const month = parseInt(match2[2]) - 1;
    const day = parseInt(match2[3]);
    if (year >= 1900 && year <= 2100 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  // 尝试其他格式
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * 解析 material_composition（小程序写入的 JSON），优先于 M*_qty 列（2026-04 起多库区同类毛料并存）
 */
function extractMaterialCostsFromComposition(record: any): Array<{
  material: string;
  qty: number;
  price: number;
  cost: number;
}> | null {
  const raw =
    (record as any).material_composition ??
    (record as any).materialComposition ??
    null;
  if (raw == null) return null;
  let arr: unknown[];
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
    try {
      arr = JSON.parse(raw.toString('utf8')) as unknown[];
    } catch {
      return null;
    }
  } else if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw) as unknown[];
    } catch {
      return null;
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return null;
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const materials: Array<{ material: string; qty: number; price: number; cost: number }> = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const label =
      (o.material != null ? String(o.material) : '').trim() ||
      (o.shortName != null ? String(o.shortName) : '').trim();
    const qty = processDecimal(o.tons);
    const price = processDecimal(
      o.currentPrice ?? o.current_price ?? o.price
    );
    if (!label || qty <= 0) continue;
    materials.push({
      material: label,
      qty,
      price,
      cost: qty * price,
    });
  }
  return materials.length > 0 ? materials : null;
}

/**
 * 从 ProcessingCostInput 记录中提取原材料用量和单价
 */
function extractMaterialCosts(record: any): Array<{
  material: string;
  qty: number;
  price: number;
  cost: number;
}> {
  const fromJson = extractMaterialCostsFromComposition(record);
  if (fromJson) return fromJson;

  const materials: Array<{ material: string; qty: number; price: number; cost: number }> = [];

  const fieldLabels = getProcessingCostMaterialQtyFieldLabels();
  for (const [qtyField, materialName] of Object.entries(fieldLabels)) {
    const priceField = qtyField.replace(/_qty$/i, '_price');
    const qty = processDecimal(getRecordField(record as Record<string, unknown>, qtyField));
    const price = processDecimal(getRecordField(record as Record<string, unknown>, priceField));

    if (qty > 0 && price > 0) {
      materials.push({
        material: materialName,
        qty,
        price,
        cost: qty * price,
      });
    }
  }

  return materials;
}

/**
 * 计算单次生产的材料成本（基于 ProcessingCostInput 表的详细字段）
 */
function calculateProductionMaterialCost(record: any): {
  totalCost: number;
  totalQty: number;
  unitCost: number; // 每吨成品的材料成本（元/吨）
  materials: Array<{ material: string; qty: number; price: number; cost: number }>;
} {
  let materials = extractMaterialCosts(record);
  let totalCost = materials.reduce((sum, m) => sum + m.cost, 0);
  // 优先使用 dailyProcess_qty，如果没有则使用 product_tons
  const totalQty =
    processDecimal(record.dailyProcess_qty) ||
    processDecimal(record.dailyProcessQty) ||
    processDecimal(record.product_tons) ||
    processDecimal(record.productTons) ||
    0;
  // 仅有产量、材料列为空时，用 dailyProcess_amount 作为该批次材料总成本（录入合计）
  if (materials.length === 0 && totalQty > 0) {
    const batchAmount =
      processDecimal(getRecordField(record as Record<string, unknown>, 'dailyProcess_amount')) ||
      processDecimal(getRecordField(record as Record<string, unknown>, 'dailyProcessAmount'));
    const batchPrice =
      processDecimal(getRecordField(record as Record<string, unknown>, 'dailyProcess_price')) ||
      processDecimal(getRecordField(record as Record<string, unknown>, 'dailyProcessPrice'));
    // dailyProcess_amount 常与 dailyProcess_price 同为成品金额口径，不能当作材料成本
    const amountLooksLikeSales =
      batchPrice > 0 && batchAmount > 0 && Math.abs(batchAmount / totalQty - batchPrice) / batchPrice < 0.05;
    if (batchAmount > 0 && !amountLooksLikeSales) {
      totalCost = batchAmount;
      materials = [
        {
          material: '加工录入合计',
          qty: totalQty,
          price: batchAmount / totalQty,
          cost: batchAmount,
        },
      ];
    }
  }

  const recordIdRaw = getRecordField(record as Record<string, unknown>, 'id');
  const recordId =
    recordIdRaw != null && recordIdRaw !== '' ? String(recordIdRaw) : undefined;
  const normalized = normalizeMaterialsToOutputQuantity(materials, totalQty, recordId);
  materials = normalized.materials;
  totalCost = normalized.totalCost;

  const unitCost = totalQty > 0 ? totalCost / totalQty : 0;

  if (materials.length === 0 && totalQty > 0) {
    console.warn(`生产记录 ${record.id} 没有找到原材料数据，但产量为 ${totalQty} 吨`);
  }

  return {
    totalCost,
    totalQty,
    unitCost,
    materials,
  };
}

/**
 * 使用 LIFO（后进先出）方法计算销售的材料成本
 * 
 * @param productName 成品名称
 * @param productWarehouse 成品仓库
 * @param saleQuantity 销售数量（吨）
 * @param saleDate 销售日期
 * @returns 材料成本和明细
 */
export async function calculateLIFOMaterialCost(
  productName: string,
  productWarehouse: string | null,
  saleQuantity: number,
  saleDate: Date,
  options?: { skipResolve?: boolean }
): Promise<{
  cost: number;
  composition: Array<{ material: string; tons: number }>;
  productionRecords: Array<{
    id: number;
    productionDate: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}> {
  if (saleQuantity <= 0) {
    return { cost: 0, composition: [], productionRecords: [] };
  }

  const resolved = options?.skipResolve
    ? { productName: (productName || '').trim(), productWarehouse }
    : await resolveLifoMatchParams(productName, productWarehouse);

  const lifoProductName = resolved.productName;
  let lifoWarehouse = resolved.productWarehouse;

  try {
    // 查询该成品的所有生产记录（按生产日期倒序，LIFO：后进先出）
    // 直接使用 raw query；列清单按 information_schema 动态生成，避免库未建 M1_qty 等列时 1054 导致整页失败
    let detailedRecords: any[] = [];
    try {
      const escapedProductName = (lifoProductName || '').replace(/'/g, "''");

      queryAttempts: for (let attempt = 0; attempt < 2; attempt++) {
        const shape = await getProcessingCostInputSelectShape();
        if (!shape.hasProductionDate) {
          console.warn(
            'ProcessingCostInput 表缺少 production_date 列，无法执行 LIFO 材料成本查询',
          );
          return { cost: 0, composition: [], productionRecords: [] };
        }
        const colProductName = shape.lowerToActual.get('product_name');
        if (!colProductName) {
          console.warn('ProcessingCostInput 表缺少 product_name 列，无法执行 LIFO');
          return { cost: 0, composition: [], productionRecords: [] };
        }
        const colProductionDate = shape.lowerToActual.get('production_date')!;

        let rawQuery = `
        SELECT 
          ${shape.selectListSql}
        FROM ProcessingCostInput
        WHERE ${quoteMysqlIdent(colProductName)} = '${escapedProductName}'
      `;

        const appendWarehouseFilter = (wh: string | null) => {
          if (!wh) return;
          const whCol = shape.lowerToActual.get('product_warehouse');
          if (whCol) {
            const escapedWarehouse = wh.replace(/'/g, "''");
            rawQuery += ` AND (${quoteMysqlIdent(whCol)} = '${escapedWarehouse}' OR ${quoteMysqlIdent(whCol)} IS NULL OR TRIM(${quoteMysqlIdent(whCol)}) = '')`;
          }
        };

        appendWarehouseFilter(lifoWarehouse);

        rawQuery += ` AND ${quoteMysqlIdent(colProductionDate)} IS NOT NULL ORDER BY ${quoteMysqlIdent(colProductionDate)} DESC`;

        try {
          detailedRecords = (await prisma.$queryRawUnsafe(rawQuery)) as any[];
          break queryAttempts;
        } catch (queryErr) {
          if (attempt === 0 && isUnknownMysqlColumnError(queryErr)) {
            invalidateProcessingCostInputShapeCache();
            continue;
          }
          throw queryErr;
        }
      }

      // 库别过滤过严时重试：仅按成品名匹配（与 MySQL SP 在 warehouse 为空时一致）
      if ((!detailedRecords || detailedRecords.length === 0) && lifoWarehouse) {
        lifoWarehouse = null;
        detailedRecords = [];
        const shape = await getProcessingCostInputSelectShape();
        if (shape.hasProductionDate && shape.lowerToActual.get('product_name')) {
          const colProductName = shape.lowerToActual.get('product_name')!;
          const colProductionDate = shape.lowerToActual.get('production_date')!;
          const escapedProductName = lifoProductName.replace(/'/g, "''");
          let retryQuery = `
        SELECT 
          ${shape.selectListSql}
        FROM ProcessingCostInput
        WHERE ${quoteMysqlIdent(colProductName)} = '${escapedProductName}'
        AND ${quoteMysqlIdent(colProductionDate)} IS NOT NULL ORDER BY ${quoteMysqlIdent(colProductionDate)} DESC`;
          detailedRecords = (await prisma.$queryRawUnsafe(retryQuery)) as any[];
        }
      }

      if (!detailedRecords || detailedRecords.length === 0) {
        const altName = await findBestProcessingProductName(lifoProductName);
        if (altName && altName !== lifoProductName) {
          if (lifoDebug) {
            console.warn(
              `未找到 ${lifoProductName}，改用加工表成品名 ${altName} 重试 LIFO`,
            );
          }
          return calculateLIFOMaterialCost(
            altName,
            lifoWarehouse,
            saleQuantity,
            saleDate,
            { skipResolve: true },
          );
        }
        if (lifoDebug) {
          console.warn(
            `未找到 ${lifoProductName}${lifoWarehouse ? ` (${lifoWarehouse})` : ''} 的生产记录`,
          );
        }
        return { cost: 0, composition: [], productionRecords: [] };
      }
    } catch (error) {
      console.error('使用 raw query 查询 ProcessingCostInput 失败:', error);
      return { cost: 0, composition: [], productionRecords: [] };
    }

    const saleDay = new Date(saleDate);
    saleDay.setHours(0, 0, 0, 0);
    const saleMonthKey = `${saleDay.getFullYear()}-${String(saleDay.getMonth() + 1).padStart(2, '0')}`;

    const parsedRecords = detailedRecords
      .map((record: any) => {
        const prodDate = parseProductionDate(record.production_date || record.productionDate);
        return { record, prodDate };
      })
      .filter((item) => {
        if (!item.prodDate) {
          console.warn(`无法解析生产日期: ${item.record.production_date || item.record.productionDate}`);
          return false;
        }
        return true;
      });

    // 过滤销售日期之前的生产记录，并按生产日期倒序排序（LIFO：后进先出）
    let validRecords = parsedRecords
      .filter((item) => item.prodDate! <= saleDay)
      .sort((a, b) => b.prodDate!.getTime() - a.prodDate!.getTime())
      .map((item) => item.record);

    // 同月回退：发货日前无批次时，用当月已录入批次的加权平均材料单价（避免误用“未来日期”单批 + 毛料 qty 放大）
    if (validRecords.length === 0) {
      const sameMonthRecords = parsedRecords
        .filter((item) => {
          const d = item.prodDate!;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === saleMonthKey;
        })
        .map((item) => item.record);

      if (sameMonthRecords.length > 0) {
        let monthOutputQty = 0;
        let monthMaterialCost = 0;
        const monthMaterialTons = new Map<string, number>();

        for (const rec of sameMonthRecords) {
          const p = calculateProductionMaterialCost(rec);
          monthOutputQty += p.totalQty;
          monthMaterialCost += p.totalCost;
          for (const m of p.materials) {
            monthMaterialTons.set(m.material, (monthMaterialTons.get(m.material) || 0) + m.qty);
          }
        }

        const avgUnitCost = monthOutputQty > 0 ? monthMaterialCost / monthOutputQty : 0;
        const totalCost = avgUnitCost * saleQuantity;
        const compTotalTons = Array.from(monthMaterialTons.values()).reduce((s, t) => s + t, 0);
        const composition = Array.from(monthMaterialTons.entries()).map(([material, tons]) => ({
          material,
          tons: compTotalTons > 0 ? (tons / compTotalTons) * saleQuantity : 0,
        }));

        if (lifoDebug) {
          console.warn(
            `LIFO 同月均值回退: ${lifoProductName} 发货 ${saleDay.toISOString().slice(0, 10)} 前无批次，当月 ${sameMonthRecords.length} 批加权材料单价 ${avgUnitCost.toFixed(2)} 元/吨`,
          );
        }

        return {
          cost: totalCost,
          composition,
          productionRecords: [
            {
              id: sameMonthRecords[0].id || 0,
              productionDate:
                sameMonthRecords[0].production_date || sameMonthRecords[0].productionDate || '',
              quantity: saleQuantity,
              unitCost: avgUnitCost,
              totalCost,
            },
          ],
        };
      }
    }

    if (lifoDebug) {
      console.log(
        `LIFO 计算: ${lifoProductName}${lifoWarehouse ? ` (${lifoWarehouse})` : ''}, 销售数量: ${saleQuantity}吨, 销售日期: ${saleDate.toISOString().split('T')[0]}, 找到 ${validRecords.length} 条生产记录`,
      );
    }

    // LIFO 分配：从最新的生产记录开始消耗
    let remainingQuantity = saleQuantity;
    const usedRecords: Array<{
      id: number;
      productionDate: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }> = [];
    const materialComposition = new Map<string, number>(); // material -> total tons

    for (const record of validRecords) {
      if (remainingQuantity <= 0) break;

      const prodCost = calculateProductionMaterialCost(record);
      const availableQty = prodCost.totalQty;
      
      if (availableQty <= 0) {
        if (lifoDebug) console.warn(`生产记录 ${record.id} 的可用数量为 0，跳过`);
        continue;
      }

      const usedQty = Math.min(remainingQuantity, availableQty);
      const usedCost = prodCost.unitCost * usedQty;

      if (lifoDebug) {
        console.log(
          `使用生产记录 ${record.id} (${record.production_date || record.productionDate}): 可用${availableQty.toFixed(2)}吨, 使用${usedQty.toFixed(2)}吨, 单位成本${prodCost.unitCost.toFixed(2)}元/吨, 成本${usedCost.toFixed(2)}元`,
        );
      }

      usedRecords.push({
        id: record.id || 0,
        productionDate: record.production_date || record.productionDate || '',
        quantity: usedQty,
        unitCost: prodCost.unitCost,
        totalCost: usedCost,
      });

      // 按比例分配原材料用量
      if (availableQty > 0) {
        const ratio = usedQty / availableQty;
        for (const mat of prodCost.materials) {
          const materialTons = mat.qty * ratio;
          materialComposition.set(
            mat.material,
            (materialComposition.get(mat.material) || 0) + materialTons
          );
        }
      }

      remainingQuantity -= usedQty;
    }

    // 如果还有未分配的销售数量，使用最后一条记录的单位成本
    if (remainingQuantity > 0 && validRecords.length > 0) {
      const lastRecord = validRecords[validRecords.length - 1];
      const lastCost = calculateProductionMaterialCost(lastRecord);
      const estimatedCost = lastCost.unitCost * remainingQuantity;
      
      usedRecords.push({
        id: lastRecord.id || 0,
        productionDate: lastRecord.production_date || lastRecord.productionDate || '',
        quantity: remainingQuantity,
        unitCost: lastCost.unitCost,
        totalCost: estimatedCost,
      });

      // 按比例分配原材料用量
      if (lastCost.totalQty > 0) {
        const ratio = remainingQuantity / lastCost.totalQty;
        for (const mat of lastCost.materials) {
          const materialTons = mat.qty * ratio;
          materialComposition.set(
            mat.material,
            (materialComposition.get(mat.material) || 0) + materialTons
          );
        }
      }
    }

    // 严格 LIFO 未扣到任何批次（产量为 0 或单位成本为 0）时，回退当月加权均价
    if (usedRecords.length === 0 && saleQuantity > 0) {
      const sameMonthRecords = parsedRecords
        .filter((item) => {
          const d = item.prodDate!;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === saleMonthKey;
        })
        .map((item) => item.record);
      if (sameMonthRecords.length > 0) {
        let monthOutputQty = 0;
        let monthMaterialCost = 0;
        const monthMaterialTons = new Map<string, number>();
        for (const rec of sameMonthRecords) {
          const p = calculateProductionMaterialCost(rec);
          if (p.unitCost <= 0) continue;
          monthOutputQty += p.totalQty;
          monthMaterialCost += p.totalCost;
          for (const m of p.materials) {
            monthMaterialTons.set(m.material, (monthMaterialTons.get(m.material) || 0) + m.qty);
          }
        }
        if (monthOutputQty > 0 && monthMaterialCost > 0) {
          const avgUnitCost = monthMaterialCost / monthOutputQty;
          const totalCost = avgUnitCost * saleQuantity;
          const compTotalTons = Array.from(monthMaterialTons.values()).reduce((s, t) => s + t, 0);
          const composition = Array.from(monthMaterialTons.entries()).map(([material, tons]) => ({
            material,
            tons: compTotalTons > 0 ? (tons / compTotalTons) * saleQuantity : 0,
          }));
          return {
            cost: totalCost,
            composition,
            productionRecords: [
              {
                id: sameMonthRecords[0].id || 0,
                productionDate:
                  sameMonthRecords[0].production_date || sameMonthRecords[0].productionDate || '',
                quantity: saleQuantity,
                unitCost: avgUnitCost,
                totalCost,
              },
            ],
          };
        }
      }
    }

    const totalCost = usedRecords.reduce((sum, r) => sum + r.totalCost, 0);
    const composition = Array.from(materialComposition.entries()).map(([material, tons]) => ({
      material,
      tons,
    }));

    if (lifoDebug) {
      console.log(
        `LIFO 计算结果: 总成本=${totalCost.toFixed(2)}元, 使用${usedRecords.length}条生产记录, 原材料种类=${composition.length}`,
      );
    }

    return {
      cost: totalCost,
      composition,
      productionRecords: usedRecords,
    };
  } catch (error) {
    console.error('LIFO 材料成本计算失败:', error);
    return { cost: 0, composition: [], productionRecords: [] };
  }
}
