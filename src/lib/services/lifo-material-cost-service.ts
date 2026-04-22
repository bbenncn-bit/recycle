import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate } from './profit-service';

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
 * 原材料字段映射：从 ProcessingCostInput 表的字段名到材料名称（历史 M 列口径）
 */
const MATERIAL_FIELD_MAP: Record<string, string> = {
  M1_qty: '优质毛料M1',
  M2_qty: '重型折旧毛料M2',
  M3_qty: '重型加工毛料M3',
  M4_qty: '中型折旧毛料M4',
  M5_qty: 'M5',
  M6_qty: '小型折旧毛料M6',
  M7_qty: '小型加工毛料M7',
  M8_qty: '轻薄折旧毛料M8',
  M9_qty: '轻薄加工毛料M9',
  wireRope_qty: '钢丝绳',
  carShell_qty: '汽车小轿壳',
  pigIron_qty: '生铁毛料',
  scrap_qty: '渣钢',
  carDismantle_qty: '汽拆',
  transfer_qty: '移库',
  auxiliary_qty: '辅料',
  material1_qty: 'material1',
  material2_qty: 'material2',
  material3_qty: 'material3',
  material4_qty: 'material4',
  material5_qty: 'material5',
};

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

  for (const [qtyField, materialName] of Object.entries(MATERIAL_FIELD_MAP)) {
    const priceField = qtyField.replace('_qty', '_price');
    const qty = processDecimal((record as any)[qtyField]);
    const price = processDecimal((record as any)[priceField]);

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
  const materials = extractMaterialCosts(record);
  const totalCost = materials.reduce((sum, m) => sum + m.cost, 0);
  // 优先使用 dailyProcess_qty，如果没有则使用 product_tons
  const totalQty =
    processDecimal(record.dailyProcess_qty) ||
    processDecimal(record.dailyProcessQty) ||
    processDecimal(record.product_tons) ||
    processDecimal(record.productTons) ||
    0;
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
  saleDate: Date
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

  try {
    // 查询该成品的所有生产记录（按生产日期倒序，LIFO：后进先出）
    const whereClause: any = {
      productName: productName,
    };
    if (productWarehouse) {
      whereClause.productWarehouse = productWarehouse;
    }

    // 直接使用 raw query 查询所有字段（因为 Prisma schema 没有包含所有详细字段如 M1_qty, M1_price, dailyProcess_qty 等）
    let detailedRecords: any[] = [];
    try {
      // 尝试使用 Prisma 查询所有字段
      // 使用 $queryRawUnsafe 进行查询（需要转义参数以防止 SQL 注入）
      const escapedProductName = (productName || '').replace(/'/g, "''");
      let rawQuery = `
        SELECT 
          id,
          production_date,
          dailyProcess_qty,
          product_tons,
          material_composition,
          M1_qty, M1_price,
          M2_qty, M2_price,
          M3_qty, M3_price,
          M4_qty, M4_price,
          M5_qty, M5_price,
          M6_qty, M6_price,
          M7_qty, M7_price,
          M8_qty, M8_price,
          M9_qty, M9_price,
          wireRope_qty, wireRope_price,
          carShell_qty, carShell_price,
          pigIron_qty, pigIron_price,
          scrap_qty, scrap_price,
          carDismantle_qty, carDismantle_price,
          transfer_qty, transfer_price,
          auxiliary_qty, auxiliary_price,
          material1_qty, material1_price,
          material2_qty, material2_price,
          material3_qty, material3_price,
          material4_qty, material4_price,
          material5_qty, material5_price
        FROM ProcessingCostInput
        WHERE product_name = '${escapedProductName}'
      `;

      if (productWarehouse) {
        const escapedWarehouse = (productWarehouse || '').replace(/'/g, "''");
        rawQuery += ` AND product_warehouse = '${escapedWarehouse}'`;
      }

      rawQuery += ` AND production_date IS NOT NULL ORDER BY production_date DESC`;

      detailedRecords = await prisma.$queryRawUnsafe(rawQuery) as any[];
      
      if (!detailedRecords || detailedRecords.length === 0) {
        console.warn(`未找到 ${productName}${productWarehouse ? ` (${productWarehouse})` : ''} 的生产记录`);
        return { cost: 0, composition: [], productionRecords: [] };
      }
    } catch (error) {
      console.error('使用 raw query 查询 ProcessingCostInput 失败:', error);
      // 如果查询失败，返回空结果
      return { cost: 0, composition: [], productionRecords: [] };
    }

    // 过滤销售日期之前的生产记录，并按生产日期倒序排序（LIFO：后进先出）
    const validRecords = detailedRecords
      .map((record: any) => {
        const prodDate = parseProductionDate(record.production_date || record.productionDate);
        return { record, prodDate };
      })
      .filter((item) => {
        if (!item.prodDate) {
          console.warn(`无法解析生产日期: ${item.record.production_date || item.record.productionDate}`);
          return false;
        }
        return item.prodDate <= saleDate;
      })
      .sort((a, b) => {
        // 按生产日期倒序（最新的在前）
        if (!a.prodDate || !b.prodDate) return 0;
        return b.prodDate.getTime() - a.prodDate.getTime();
      })
      .map((item) => item.record);

    console.log(`LIFO 计算: ${productName}${productWarehouse ? ` (${productWarehouse})` : ''}, 销售数量: ${saleQuantity}吨, 销售日期: ${saleDate.toISOString().split('T')[0]}, 找到 ${validRecords.length} 条生产记录`);

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
        console.warn(`生产记录 ${record.id} 的可用数量为 0，跳过`);
        continue;
      }

      const usedQty = Math.min(remainingQuantity, availableQty);
      const usedCost = prodCost.unitCost * usedQty;
      
      console.log(`使用生产记录 ${record.id} (${record.production_date || record.productionDate}): 可用${availableQty.toFixed(2)}吨, 使用${usedQty.toFixed(2)}吨, 单位成本${prodCost.unitCost.toFixed(2)}元/吨, 成本${usedCost.toFixed(2)}元`);

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

    const totalCost = usedRecords.reduce((sum, r) => sum + r.totalCost, 0);
    const composition = Array.from(materialComposition.entries()).map(([material, tons]) => ({
      material,
      tons,
    }));

    console.log(`LIFO 计算结果: 总成本=${totalCost.toFixed(2)}元, 使用${usedRecords.length}条生产记录, 原材料种类=${composition.length}`);

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
