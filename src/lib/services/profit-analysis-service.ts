import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate, formatDate } from './profit-service';
import { calculateLIFOMaterialCost } from './lifo-material-cost-service';

export interface ProfitAnalysisData {
  summary: {
    todayProfit: number;           // 今日利润（万元）
    weekProfit: number;            // 本周利润（万元）
    monthProfit: number;           // 本月利润（万元）
    todayRevenue: number;          // 今日销售收入（万元）
    todayMaterialCost: number;     // 今日材料成本（万元）
    todayProcessingCost: number;   // 今日加工成本（万元）
  };
  dailyTrend: {
    dates: string[];
    revenue: number[];            // 销售收入（万元）
    materialCost: number[];        // 材料成本（万元）
    processingCost: number[];      // 加工成本（万元）
    profit: number[];              // 利润（万元）
  };
  weekBreakdown: {
    days: string[];                // 周一到周日
    revenue: number[];
    materialCost: number[];
    processingCost: number[];
    profit: number[];
  };
  salesDetails: Array<{            // 销售明细
    deliveryNumber: string;
    deliveryDate: string;
    productType: string;
    warehouse: string;
    customer: string;              // 发往客户
    settlementQuantity: number;   // 结算量（吨）
    revenue: number;               // 销售收入（元）
    materialCost: number;          // 材料成本（元）
    processingCost: number;        // 加工成本（元）
    otherCosts: number;            // 其它成本项：运输费+税费+贴现费用+回款周期资金利息（元）
    otherIncome: number;           // 其它收入项：即征即退+政府扶持资金（元）
    // 细项拆分（用于前端悬浮查看明细）
    transportCost: number;         // 运输费（元）
    taxCost: number;               // 税费（元）
    discountCost: number;          // 贴现费用（元）
    interestCost: number;          // 回款周期资金利息（元）
    immediateRefund: number;       // 即征即退（元）
    governmentSupport: number;     // 政府扶持资金（元）
    profit: number;                // 利润（元）
    costParamSnapshot?: {          // 其它成本核算参数快照（用于前端核对）
      salesUnitExclTax: number;                // 销售单价（不含税，元/吨）
      materialUnitExclTax: number;             // 材料单价（不含税，元/吨）
      warehouseTaxRate: number;                // 入库单加权税率（小数，如 0.13 表示 13%）
      transportPerTon: number;                 // 运输费（元/吨）
      processingFeeForRefundPerTon: number;    // 加工费参数（元/吨）
      taxMainRate: number;                     // 主税率（小数，如 0.10）
      taxExtraRate: number;                    // 附加税率（小数，如 0.0005）
      taxBasePerTon: number;                   // 税费基数（元/吨）
      taxPerTon: number;                       // 税费（元/吨）
      instantRefundRate: number;               // 即征即退比例（小数）
      govSubsidyRate41: number;                // 政府扶持比例 41%（小数）
      govSubsidyRate70: number;                // 政府扶持比例 70%（小数）
      govSubsidyRate38: number;                // 政府扶持比例 38%（小数）
      govSubsidyRate10: number;                // 政府扶持比例 10%（小数）
      govSubsidyRate80: number;                // 政府扶持比例 80%（小数）
      govSubsidyRate003: number;               // 政府扶持比例 0.03%（小数）
      govSubsidyRate100: number;               // 政府扶持比例 100%（小数）
    };
    materialComposition: Array<{   // 原材料构成（与 MaterialCostCache 一致：quantity 吨, cost 元）
      material: string;
      quantity: number;
      cost: number;
    }>;
    productionRecords?: Array<{    // LIFO 使用的生产记录（用于 tooltip 显示）
      id: number;
      productionDate: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
  }>;
  productComparison: {              // 当月与上月对比
    products: string[];            // 成品名称列表
    currentMonth: {
      materialUsagePerTon: number[];  // 当月每吨成品原材料使用量（吨）
      processingCostPerTon: number[]; // 当月每吨成品加工成本（元/吨）
    };
    lastMonth: {
      materialUsagePerTon: number[];  // 上月每吨成品原材料使用量（吨）
      processingCostPerTon: number[]; // 上月每吨成品加工成本（元/吨）
    };
  };
  /** 首屏粗算：仅收入与默认加工费，材料/LIFO 未算，利润等置 0 */
  provisional?: boolean;
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
 * 解析销售日期字符串为 Date 对象
 */
function parseDeliveryDate(dateStr: string | null): Date | null {
  return parseWarehouseDate(dateStr);
}

/**
 * 获取指定日期之前30天的原材料平均采购单价
 */
async function getMaterialAvgPrice(material: string, beforeDate: Date): Promise<number> {
  const startDate = new Date(beforeDate);
  startDate.setDate(startDate.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);

  try {
    const purchases = await prisma.purchaseWarehouse.findMany({
      where: {
        material: material,
        warehouseDate: {
          not: null,
        },
        unitPriceIncludingTax: {
          not: null,
        },
        netWeight: {
          not: null,
        },
        totalPriceIncludingTax: {
          not: null,
        },
      },
      select: {
        warehouseDate: true,
        unitPriceIncludingTax: true,
        netWeight: true,
        totalPriceIncludingTax: true,
      },
    });

    // 过滤日期范围并计算加权平均
    let totalWeight = 0;
    let totalCost = 0;

    for (const purchase of purchases) {
      const purchaseDate = parseWarehouseDate(purchase.warehouseDate);
      if (!purchaseDate) continue;
      if (purchaseDate < startDate || purchaseDate >= beforeDate) continue;

      const weight = processDecimal(purchase.netWeight);
      const cost = processDecimal(purchase.totalPriceIncludingTax);
      
      if (weight > 0) {
        totalWeight += weight;
        totalCost += cost;
      }
    }

    if (totalWeight > 0) {
      return totalCost / totalWeight; // 元/吨
    }
    return 0;
  } catch (error) {
    console.error(`获取原材料 ${material} 的平均价格失败:`, error);
    return 0;
  }
}

/**
 * 获取成品的原材料构成比例（按月汇总）
 */
async function getProductMaterialComposition(
  productName: string,
  month: string // 格式：YYYY-MM
): Promise<Array<{ material: string; ratio: number }>> {
  try {
    // 查询生产记录（Prisma 的 JSON 字段不能直接使用 not: null，需要查询所有记录后过滤）
    const productionRecords = await prisma.processingCostInput.findMany({
      where: {
        productName: productName,
        productionDate: {
          startsWith: month,
        },
      },
      select: {
        productTons: true,
        materialComposition: true,
      },
    });

    // 汇总所有原材料的用量
    const materialMap = new Map<string, number>();
    let totalProductTons = 0;

    for (const record of productionRecords) {
      const productTons = processDecimal(record.productTons);
      if (productTons <= 0) continue;

      // 过滤掉 materialComposition 为 null 的记录
      if (!record.materialComposition) continue;

      totalProductTons += productTons;

      const composition = record.materialComposition as Array<{ material: string; tons: number }> | null;
      if (!composition || !Array.isArray(composition)) continue;

      for (const item of composition) {
        const material = item.material || '';
        const tons = typeof item.tons === 'number' ? item.tons : parseFloat(String(item.tons)) || 0;
        if (material && tons > 0) {
          materialMap.set(material, (materialMap.get(material) || 0) + tons);
        }
      }
    }

    // 计算比例
    const result: Array<{ material: string; ratio: number }> = [];
    if (totalProductTons > 0) {
      for (const [material, totalTons] of materialMap.entries()) {
        result.push({
          material,
          ratio: totalTons / totalProductTons, // 每吨成品需要多少吨该原材料
        });
      }
    }

    return result;
  } catch (error) {
    // 表不存在时返回空数组，不抛出错误
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('doesn\'t exist'))) {
      console.warn(`ProcessingCostInput表不存在，返回空原材料构成`);
      return [];
    }
    console.error(`获取成品 ${productName} 的原材料构成失败:`, error);
    return [];
  }
}

/**
 * 获取成品的单位加工成本
 */
async function getProductUnitProcessingCost(productName: string): Promise<number> {
  try {
    const config = await prisma.processingCostConfig.findUnique({
      where: {
        productName: productName,
      },
      select: {
        unitProcessingCost: true,
      },
    });

    return config ? processDecimal(config.unitProcessingCost) : 0;
  } catch (error) {
    // 表不存在时返回0，不抛出错误
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('doesn\'t exist'))) {
      console.warn(`ProcessingCostConfig表不存在，返回默认加工成本0`);
      return 0;
    }
    console.error(`获取成品 ${productName} 的单位加工成本失败:`, error);
    return 0;
  }
}

/**
 * 计算单笔销售的材料成本（使用 LIFO 方法，基于 ProcessingCostInput 表的详细数据）
 */
async function calculateMaterialCost(
  deliveryNumber: string,
  productType: string,
  settlementQuantity: number,
  deliveryDate: string,
  warehouse?: string | null
): Promise<{ 
  cost: number; 
  composition: Array<{ material: string; quantity: number; cost: number }>;
  productionRecords?: Array<{
    id: number;
    productionDate: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}> {
  if (settlementQuantity <= 0) {
    return { cost: 0, composition: [], productionRecords: [] };
  }

  // 解析销售日期
  const saleDate = parseDeliveryDate(deliveryDate);
  if (!saleDate) {
    return { cost: 0, composition: [], productionRecords: [] };
  }

  try {
    // 从缓存读取（缓存由 MySQL 事件自动更新）
    const { getMaterialCostFromCache } = await import('./material-cost-cache-service');
    const cached = await getMaterialCostFromCache(deliveryNumber);
    
    if (cached) {
      console.log(`从缓存读取材料成本: ${deliveryNumber}`);
      return {
        cost: cached.materialCost,
        composition: cached.materialComposition,
        productionRecords: cached.productionRecords,
      };
    }

    // 缓存未命中：尝试实时 LIFO 计算（依赖 ProcessingCostInput），避免新导入数据长期为 0
    try {
      const lifoResult = await calculateLIFOMaterialCost(
        productType,
        warehouse || null,
        settlementQuantity,
        saleDate
      );
      if (lifoResult.cost > 0) {
        const totalTons = lifoResult.composition.reduce((s, c) => s + (c.tons ?? 0), 0);
        const composition: Array<{ material: string; quantity: number; cost: number }> =
          totalTons > 0
            ? lifoResult.composition.map((c) => ({
                material: c.material,
                quantity: c.tons ?? 0,
                cost: ((c.tons ?? 0) / totalTons) * lifoResult.cost,
              }))
            : [];
        console.log(`缓存未命中，实时 LIFO 计算材料成本: ${deliveryNumber}, ${lifoResult.cost.toFixed(2)} 元`);
        return {
          cost: lifoResult.cost,
          composition,
          productionRecords: lifoResult.productionRecords ?? [],
        };
      }
    } catch (lifoErr) {
      console.warn(`实时 LIFO 计算失败 (${deliveryNumber}):`, lifoErr);
    }

    // 仍无结果则返回 0（建议执行 CALL sp_update_material_cost_cache 更新缓存）
    console.warn(`缓存未命中: ${deliveryNumber}，无 LIFO 结果，材料成本显示为 0`);
    return {
      cost: 0,
      composition: [],
      productionRecords: [],
    };
  } catch (error) {
    console.error(`LIFO 材料成本计算失败 (${productType}):`, error);
    
    // 如果 LIFO 计算失败，回退到原来的方法
    const saleMonth = formatDate(saleDate).substring(0, 7); // YYYY-MM
    const composition = await getProductMaterialComposition(productType, saleMonth);

    if (composition.length === 0) {
      // 如果没有生产记录，尝试使用上个月的数据
      const lastMonth = new Date(saleDate);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = formatDate(lastMonth).substring(0, 7);
      const lastMonthComposition = await getProductMaterialComposition(productType, lastMonthStr);
      if (lastMonthComposition.length > 0) {
        composition.push(...lastMonthComposition);
      }
    }

    let totalCost = 0;
    const materialDetails: Array<{ material: string; quantity: number; cost: number }> = [];

    for (const item of composition) {
      const qty = settlementQuantity * item.ratio;
      const avgPrice = await getMaterialAvgPrice(item.material, saleDate);
      const cost = qty * avgPrice;
      totalCost += cost;
      materialDetails.push({ material: item.material, quantity: qty, cost });
    }

    return { cost: totalCost, composition: materialDetails, productionRecords: [] };
  }
}

/**
 * 计算单笔销售的加工成本
 */
async function calculateProcessingCost(
  productType: string,
  settlementQuantity: number
): Promise<number> {
  if (settlementQuantity <= 0) return 0;

  const unitCost = await getProductUnitProcessingCost(productType);
  return settlementQuantity * unitCost;
}

/** 加工费默认元/吨（用于税费公式，仅当 ProfitParamConfig 无配置时回退） */
const DEFAULT_PROCESSING_COST_PER_TON = 70;

/** ProfitParamConfig 单行（用于按发货日期取生效参数） */
type ParamConfigRow = {
  paramKey: string;
  steelMill: string | null;
  effectiveDate: Date;
  value: number;
  previousValue: number | null;
};

/**
 * 按发货日期与钢厂取生效参数值：变动日期起用 value，变动日期前用 previous_value（若为空则用上一版本 value）
 */
function getEffectiveParamValue(
  rows: ParamConfigRow[],
  paramKey: string,
  steelMill: string | null,
  deliveryDate: Date
): number {
  const normalized = new Date(deliveryDate);
  normalized.setHours(0, 0, 0, 0);
  const list = rows.filter(
    (r) =>
      r.paramKey === paramKey &&
      (r.steelMill === null || r.steelMill === steelMill)
  );
  if (list.length === 0) return 0;
  list.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  const after = list.find((r) => {
    const d = new Date(r.effectiveDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > normalized.getTime();
  });
  if (after && after.previousValue != null) return after.previousValue;
  const onOrBefore = list.find((r) => {
    const d = new Date(r.effectiveDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() <= normalized.getTime();
  });
  return onOrBefore ? onOrBefore.value : 0;
}

/** 某发货日期+钢厂下的可调参数快照（来自 ProfitParamConfig） */
export interface ProfitParamSnapshot {
  transportFee: number;           // 运输费元/吨（已按钢厂）
  roadLossFactor: number;        // 路损系数
  taxRateMain: number;            // 税费主税率 %
  taxRateExtra: number;           // 税费附加 %
  processingFeeForRefund: number; // 即征即退/政府扶持用加工费 元/吨
  instantRefundRate: number;      // 即征即退比例 %
  govSubsidyRate41: number;
  govSubsidyRate10: number;
  govSubsidyRate80: number;
  govSubsidyRate003: number;
  govSubsidyRate100: number;
  govSubsidyRate70: number;
  govSubsidyRate38: number;
  discountRatePinggang: number;   // 贴现率 % 仅萍钢
  collectionDaysPinggang: number;
  collectionDaysJigang: number;
  collectionDaysXingang: number;
  interestRateAnnual: number;     // 年利率 %
}

/**
 * 从 ProfitParamConfig 表按发货日期、钢厂生成参数快照（变动日期起用 value，之前用 previous_value）
 */
function buildParamSnapshot(
  allRows: ParamConfigRow[],
  deliveryDate: Date,
  steelMill: string | null
): ProfitParamSnapshot {
  const mill = steelMill || '';
  const v = (key: string) => getEffectiveParamValue(allRows, key, null, deliveryDate);
  const vMill = (key: string) => getEffectiveParamValue(allRows, key, mill, deliveryDate);
  const transportFee =
    mill === '萍钢' ? vMill('transport_fee_pinggang')
    : mill === '吉钢' ? vMill('transport_fee_jigang')
    : mill === '新钢' ? vMill('transport_fee_xingang')
    : 0;
  const roadLoss = v('road_loss_factor') || 1.03;
  return {
    transportFee,
    roadLossFactor: roadLoss,
    taxRateMain: v('tax_rate_main') || 10,
    taxRateExtra: v('tax_rate_extra') || 0.05,
    processingFeeForRefund: v('processing_fee_for_refund') || DEFAULT_PROCESSING_COST_PER_TON,
    instantRefundRate: v('instant_refund_rate') || 30,
    // getEffectiveParamValue 未命中时返回 0，这里用 || 回退默认值，避免关键参数被 0 覆盖
    govSubsidyRate41: v('gov_subsidy_rate_41') || 41,
    govSubsidyRate10: v('gov_subsidy_rate_10') || 10,
    govSubsidyRate80: v('gov_subsidy_rate_80') || 80,
    govSubsidyRate003: v('gov_subsidy_rate_003') || 0.03,
    govSubsidyRate100: v('gov_subsidy_rate_100') || 100,
    govSubsidyRate70: v('gov_subsidy_rate_70') || 70,
    govSubsidyRate38: v('gov_subsidy_rate_38') || 38,
    discountRatePinggang: vMill('discount_rate_pinggang') || 2.175,
    collectionDaysPinggang: vMill('collection_days_pinggang') || 18,
    collectionDaysJigang: vMill('collection_days_jigang') || 12,
    collectionDaysXingang: vMill('collection_days_xingang') || 37,
    interestRateAnnual: v('interest_rate_annual') || 3,
  };
}

/**
 * 加载全部 ProfitParamConfig 并转为 ParamConfigRow[]（供按日期取生效值）
 */
async function loadAllParamConfigRows(): Promise<ParamConfigRow[]> {
  try {
    const rows = await prisma.profitParamConfig.findMany({
      select: {
        paramKey: true,
        steelMill: true,
        effectiveDate: true,
        value: true,
        previousValue: true,
      },
    });
    return rows.map((r) => ({
      paramKey: r.paramKey,
      steelMill: r.steelMill,
      effectiveDate: new Date(r.effectiveDate),
      value: processDecimal(r.value),
      previousValue: r.previousValue != null ? processDecimal(r.previousValue) : null,
    }));
  } catch (e) {
    console.warn('加载 ProfitParamConfig 失败，将使用默认常量:', e);
    return [];
  }
}

/**
 * 归一化入库税率到「小数比率」：
 * - 13   -> 0.13（13%）
 * - 1    -> 0.01（1%）
 * - 0.13 -> 0.13（13%，部分来源直接存小数）
 */
function normalizeWarehouseTaxRate(raw: number): number {
  const v = Number.isFinite(raw) ? raw : 0;
  if (v <= 0) return 0;
  if (v > 1) return v / 100;
  if (v === 1) return 0.01;
  return v;
}

/**
 * 根据材料构成与生产记录，计算加权平均「入库单税率」（从 PurchaseWarehouse.tax_rate 取数）
 * 按生产日期找到各毛料当时的采购税率，再按材料用量加权
 */
async function getWeightedAvgTaxRate(
  materialComposition: Array<{ material: string; quantity: number }>,
  productionRecords: Array<{ productionDate: string; quantity: number }>
): Promise<number> {
  if (!materialComposition?.length || !productionRecords?.length) return 0;
  const totalProdQty = productionRecords.reduce((s, r) => s + (r.quantity ?? 0), 0);
  if (totalProdQty <= 0) return 0;
  // 加权平均生产日期（时间戳）
  let sumT = 0;
  for (const r of productionRecords) {
    const d = parseWarehouseDate(r.productionDate);
    if (d) sumT += (r.quantity ?? 0) * d.getTime();
  }
  const avgDate = new Date(sumT / totalProdQty);
  const materials = [...new Set(materialComposition.map(m => m.material).filter(Boolean))];
  const taxRates = new Map<string, number>();
  for (const mat of materials) {
    try {
      const rows = await prisma.purchaseWarehouse.findMany({
        where: {
          material: mat,
          warehouseDate: { not: null },
          taxRate: { not: null },
        },
        select: { warehouseDate: true, taxRate: true },
        take: 200,
      });
      let bestRate: number | null = null;
      let bestDate: Date | null = null;
      for (const row of rows) {
        const whDate = parseWarehouseDate(row.warehouseDate);
        if (!whDate || whDate > avgDate) continue;
        if (row.taxRate == null) continue;
        if (!bestDate || whDate.getTime() > bestDate.getTime()) {
          bestDate = whDate;
          bestRate = normalizeWarehouseTaxRate(processDecimal(row.taxRate));
        }
      }
      if (bestRate != null) taxRates.set(mat, bestRate);
    } catch {
      // 忽略单料查询失败
    }
  }
  const totalQty = materialComposition.reduce((s, m) => s + (m.quantity ?? 0), 0);
  if (totalQty <= 0) return 0;
  let weighted = 0;
  for (const m of materialComposition) {
    const rate = taxRates.get(m.material) ?? 0;
    weighted += (m.quantity ?? 0) * rate;
  }
  return weighted / totalQty;
}

/**
 * 运输费元/吨（含税价/路损系数）：从参数快照取
 */
function getTransportPerTonFromSnapshot(s: ProfitParamSnapshot, _customer: string): number {
  if (s.roadLossFactor <= 0) return s.transportFee;
  return s.transportFee / s.roadLossFactor;
}

/**
 * 贴现费用元/吨：仅萍钢，销售单价(不含税)*1.13*贴现率%
 */
function getDiscountPerTonFromSnapshot(salesUnitExclTax: number, customer: string, s: ProfitParamSnapshot): number {
  if ((customer || '').trim() !== '萍钢') return 0;
  return salesUnitExclTax * 1.13 * (s.discountRatePinggang / 100);
}

/**
 * 回款周期资金利息元/吨：销售单价(不含税)*1.13*年利率%/360*天数
 */
function getInterestPerTonFromSnapshot(salesUnitExclTax: number, customer: string, s: ProfitParamSnapshot): number {
  const c = (customer || '').trim();
  let days = 0;
  if (c === '萍钢') days = s.collectionDaysPinggang;
  else if (c === '吉钢') days = s.collectionDaysJigang;
  else if (c === '新钢') days = s.collectionDaysXingang;
  if (days === 0) return 0;
  return salesUnitExclTax * 1.13 * (s.interestRateAnnual / 100 / 360) * days;
}

function getProfitSalesMinDeliveryDateStr(): string {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const lookbackYears = Math.min(
    30,
    Math.max(1, parseInt(process.env.PROFIT_SALES_LOOKBACK_YEARS || '10', 10) || 10)
  );
  const salesScanStart = new Date(today);
  salesScanStart.setFullYear(salesScanStart.getFullYear() - lookbackYears);
  salesScanStart.setHours(0, 0, 0, 0);
  return formatDate(salesScanStart);
}

const EMPTY_PRODUCT_COMPARISON: ProfitAnalysisData['productComparison'] = {
  products: [],
  currentMonth: { materialUsagePerTon: [], processingCostPerTon: [] },
  lastMonth: { materialUsagePerTon: [], processingCostPerTon: [] },
};

/** 成品对比（多库表查询，可延后加载） */
async function buildProfitProductComparisonForProducts(
  products: string[]
): Promise<ProfitAnalysisData['productComparison']> {
  const todayForCalc = new Date();
  todayForCalc.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayForCalc);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const currentMonthStr = formatDate(monthStart).substring(0, 7);
  const lastMonth = new Date(monthStart);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = formatDate(lastMonth).substring(0, 7);

  const currentMonthMaterialUsage: number[] = [];
  const currentMonthProcessingCost: number[] = [];
  const lastMonthMaterialUsage: number[] = [];
  const lastMonthProcessingCost: number[] = [];

  for (const product of products) {
    const currentMonthComposition = await getProductMaterialComposition(product, currentMonthStr);
    const currentMonthTotalTons = currentMonthComposition.reduce((sum, c) => sum + c.ratio, 0);
    currentMonthMaterialUsage.push(currentMonthTotalTons);
    const currentMonthUnitCost = await getProductUnitProcessingCost(product);
    currentMonthProcessingCost.push(currentMonthUnitCost);

    const lastMonthComposition = await getProductMaterialComposition(product, lastMonthStr);
    const lastMonthTotalTons = lastMonthComposition.reduce((sum, c) => sum + c.ratio, 0);
    lastMonthMaterialUsage.push(lastMonthTotalTons);
    lastMonthProcessingCost.push(currentMonthUnitCost);
  }

  return {
    products,
    currentMonth: {
      materialUsagePerTon: currentMonthMaterialUsage,
      processingCostPerTon: currentMonthProcessingCost,
    },
    lastMonth: {
      materialUsagePerTon: lastMonthMaterialUsage,
      processingCostPerTon: lastMonthProcessingCost,
    },
  };
}

/**
 * 极速首屏（供 phase=shell）：一次发货表查询 + 内存按日汇总，不算材料成本与 LIFO。
 * 成品对比见 getProfitAnalysisProductComparisonOnly。
 */
export async function getProfitAnalysisShellData(): Promise<ProfitAnalysisData> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayForCalc = new Date();
  todayForCalc.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayForCalc);
  todayEnd.setHours(23, 59, 59, 999);

  const minDeliveryDateStr = getProfitSalesMinDeliveryDateStr();

  const salesData = await prisma.deliverySettlement.findMany({
    where: {
      totalSettlementAmount: { not: null },
      settlementQuantity: { not: null },
      deliveryDate: { not: null, gte: minDeliveryDateStr },
    },
    select: {
      deliveryDate: true,
      totalSettlementAmount: true,
      settlementQuantity: true,
    },
  });

  type Row = { date: Date; revenue: number; qty: number };
  const rows: Row[] = [];
  for (const s of salesData) {
    const d = parseDeliveryDate(s.deliveryDate);
    if (!d) continue;
    rows.push({
      date: d,
      revenue: processDecimal(s.totalSettlementAmount),
      qty: processDecimal(s.settlementQuantity),
    });
  }

  let maxDeliveryDate: Date | null = null;
  for (const r of rows) {
    if (!maxDeliveryDate || r.date > maxDeliveryDate) maxDeliveryDate = r.date;
  }
  const last7DaysEnd = maxDeliveryDate ? new Date(maxDeliveryDate) : new Date(todayForCalc);
  last7DaysEnd.setHours(23, 59, 59, 999);
  const last7DaysStart = new Date(last7DaysEnd);
  last7DaysStart.setDate(last7DaysEnd.getDate() - 5);
  last7DaysStart.setHours(0, 0, 0, 0);

  const sumRevWan = (arr: Row[]) => arr.reduce((s, r) => s + r.revenue, 0) / 10000;
  const sumProcWan = (arr: Row[]) =>
    arr.reduce((s, r) => s + r.qty * DEFAULT_PROCESSING_COST_PER_TON, 0) / 10000;

  const todayRows = rows.filter((r) => r.date >= todayForCalc && r.date <= todayEnd);

  const todayRevenue = sumRevWan(todayRows);
  const todayProcessingCost = sumProcWan(todayRows);

  const trendStartDate = new Date(today);
  trendStartDate.setDate(trendStartDate.getDate() - 30);
  trendStartDate.setHours(0, 0, 0, 0);

  const dailyTrendMap = new Map<
    string,
    { revenue: number; materialCost: number; processingCost: number; profit: number }
  >();
  for (const r of rows) {
    if (r.date < trendStartDate || r.date > today) continue;
    const key = formatDate(r.date);
    const slot = dailyTrendMap.get(key) || {
      revenue: 0,
      materialCost: 0,
      processingCost: 0,
      profit: 0,
    };
    slot.revenue += r.revenue / 10000;
    slot.processingCost += (r.qty * DEFAULT_PROCESSING_COST_PER_TON) / 10000;
    dailyTrendMap.set(key, slot);
  }
  const cur = new Date(trendStartDate);
  while (cur <= today) {
    const key = formatDate(cur);
    if (!dailyTrendMap.has(key)) {
      dailyTrendMap.set(key, { revenue: 0, materialCost: 0, processingCost: 0, profit: 0 });
    }
    cur.setDate(cur.getDate() + 1);
  }
  const dailyTrendDates = Array.from(dailyTrendMap.keys()).sort();
  const dailyTrend = {
    dates: dailyTrendDates,
    revenue: dailyTrendDates.map((d) => dailyTrendMap.get(d)!.revenue),
    materialCost: dailyTrendDates.map(() => 0),
    processingCost: dailyTrendDates.map((d) => dailyTrendMap.get(d)!.processingCost),
    profit: dailyTrendDates.map(() => 0),
  };

  const last7DaysLabels: string[] = [];
  const last7DaysKeys: string[] = [];
  const weekDataByDate = new Map<
    string,
    { revenue: number; materialCost: number; processingCost: number; profit: number }
  >();
  const weekStart = new Date(last7DaysStart);
  weekStart.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = formatDate(d);
    last7DaysKeys.push(key);
    const parts = key.split('-');
    last7DaysLabels.push(`${parts[1]}-${parts[2]}`);
    weekDataByDate.set(key, { revenue: 0, materialCost: 0, processingCost: 0, profit: 0 });
  }
  for (const r of rows) {
    const key = formatDate(r.date);
    const slot = weekDataByDate.get(key);
    if (slot) {
      slot.revenue += r.revenue / 10000;
      slot.processingCost += (r.qty * DEFAULT_PROCESSING_COST_PER_TON) / 10000;
    }
  }
  const weekBreakdown = {
    days: last7DaysLabels,
    revenue: last7DaysKeys.map((k) => weekDataByDate.get(k)!.revenue),
    materialCost: last7DaysKeys.map(() => 0),
    processingCost: last7DaysKeys.map((k) => weekDataByDate.get(k)!.processingCost),
    profit: last7DaysKeys.map(() => 0),
  };

  return {
    summary: {
      todayProfit: 0,
      weekProfit: 0,
      monthProfit: 0,
      todayRevenue,
      todayMaterialCost: 0,
      todayProcessingCost,
    },
    dailyTrend,
    weekBreakdown,
    salesDetails: [],
    productComparison: { ...EMPTY_PRODUCT_COMPARISON },
    provisional: true,
  };
}

export async function getProfitAnalysisProductComparisonOnly(): Promise<
  ProfitAnalysisData['productComparison']
> {
  const minDeliveryDateStr = getProfitSalesMinDeliveryDateStr();
  const rows = await prisma.deliverySettlement.findMany({
    where: {
      productType: { not: null },
      deliveryDate: { not: null, gte: minDeliveryDateStr },
    },
    select: { productType: true },
  });
  const productSet = new Set<string>();
  for (const r of rows) {
    if (r.productType) productSet.add(r.productType);
  }
  const products = Array.from(productSet).sort();
  if (products.length === 0) return EMPTY_PRODUCT_COMPARISON;
  return buildProfitProductComparisonForProducts(products);
}

/**
 * 获取利润分析数据
 * @param options.includeProductComparison 为 false 时跳过成品对比（加快首屏，可后续单独请求）
 */
export async function getProfitAnalysisData(
  startDate?: Date,
  endDate?: Date,
  options?: { includeProductComparison?: boolean }
): Promise<ProfitAnalysisData> {
  const includeProductComparison = options?.includeProductComparison !== false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const queryStartDate = startDate || defaultStartDate;
  const queryEndDate = endDate || today;

  const minDeliveryDateStr = getProfitSalesMinDeliveryDateStr();

  // 查询销售数据
  let salesData;
  try {
    salesData = await prisma.deliverySettlement.findMany({
      where: {
        totalSettlementAmount: {
          not: null,
        },
        settlementQuantity: {
          not: null,
        },
        deliveryDate: {
          not: null,
          gte: minDeliveryDateStr,
        },
      },
      select: {
        deliveryNumber: true,
        deliveryDate: true,
        productType: true,
        warehouse: true,
        customer: true,
        settlementQuantity: true,
        totalSettlementAmount: true,
      },
    });
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ 销售数据 ${salesData.length} 条（delivery_date >= ${minDeliveryDateStr}）`
      );
    }
  } catch (error) {
    console.error('查询销售数据失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 检查是否是模型不存在的错误
    if (errorMessage.includes('deliverySettlement') || errorMessage.includes('Unknown model') || errorMessage.includes('does not exist')) {
      throw new Error(
        'DeliverySettlement模型未找到。请运行以下命令：\n' +
        '1. npx prisma generate\n' +
        '2. npx prisma db push\n' +
        '错误详情: ' + errorMessage
      );
    }
    
    // 检查是否是表不存在的错误
    if (errorMessage.includes('Table') && (errorMessage.includes('doesn\'t exist') || errorMessage.includes('does not exist'))) {
      throw new Error(
        'DeliverySettlement表不存在。请确保数据库中存在该表，或运行：\n' +
        'npx prisma db push\n' +
        '错误详情: ' + errorMessage
      );
    }
    
    throw new Error(`查询销售数据失败: ${errorMessage}`);
  }
  
  // 如果没有数据，返回空结果而不是抛出错误
  if (!salesData || salesData.length === 0) {
    console.log('⚠️ 未查询到销售数据，返回空结果');
  }

  // 销售明细：在发货日期下界之后、有有效日期的数据（明细表仍展示窗口内全部单）
  const validSalesForDetails = salesData.filter(sale => parseDeliveryDate(sale.deliveryDate) !== null);
  // 汇总/图表仍基于 salesDetails 再按 queryStartDate/queryEndDate 过滤计算

  // 加载利润可调参数（按发货日期取生效值：变动日期起用 value，之前用 previous_value）
  const allParamRows = await loadAllParamConfigRows();

  // 计算每笔销售的利润（按全部明细数据批量处理）
  const salesDetails: ProfitAnalysisData['salesDetails'] = [];
  
  // 批量获取所有需要的材料价格和加工成本配置
  const productTypes = [...new Set(validSalesForDetails.map(s => s.productType).filter((p): p is string => !!p))];
  const materialPriceCache = new Map<string, Map<string, number>>(); // productType -> material -> price
  const processingCostCache = new Map<string, number>(); // productType -> cost
  
  // 批量获取加工成本配置
  try {
    const configs = await prisma.processingCostConfig.findMany({
      where: {
        productName: {
          in: productTypes.length > 0 ? productTypes : undefined,
        },
      },
      select: {
        productName: true,
        unitProcessingCost: true,
      },
    });
    
    for (const config of configs) {
      if (config.productName) {
        processingCostCache.set(config.productName, processDecimal(config.unitProcessingCost));
      }
    }
  } catch (error) {
    console.warn('获取加工成本配置失败（表可能不存在）:', error);
  }

  // 批量处理销售数据（适当提高并发，减轻总耗时）
  const BATCH_SIZE = 24;
  for (let i = 0; i < validSalesForDetails.length; i += BATCH_SIZE) {
    const batch = validSalesForDetails.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (sale) => {
        try {
          const revenue = processDecimal(sale.totalSettlementAmount);
          const quantity = processDecimal(sale.settlementQuantity);
          const productType = sale.productType || '';
          const customer = (sale.customer || '').trim();

          const deliveryDate = parseDeliveryDate(sale.deliveryDate) || new Date();
          const paramSnapshot = buildParamSnapshot(allParamRows, deliveryDate, customer);

          const unitProcessingCost = DEFAULT_PROCESSING_COST_PER_TON;
          const processingCost = quantity * unitProcessingCost;

          let materialCost = 0;
          let composition: Array<{ material: string; quantity: number; cost: number }> = [];
          let productionRecords: Array<{
            id: number;
            productionDate: string;
            quantity: number;
            unitCost: number;
            totalCost: number;
          }> = [];

          try {
            const result = await calculateMaterialCost(
              sale.deliveryNumber || '',
              productType,
              quantity,
              sale.deliveryDate || '',
              sale.warehouse || null
            );
            materialCost = result.cost;
            composition = result.composition;
            productionRecords = result.productionRecords || [];
          } catch (error) {
            console.warn(`计算材料成本失败 (${productType}):`, error);
          }

          // 销售单价(不含税)、材料单价(不含税)
          const salesUnitExclTax = quantity > 0 ? revenue / quantity / 1.13 : 0;
          const materialUnitExclTax = quantity > 0 ? materialCost / quantity : 0;

          // 入库单加权平均税率（用于税费公式）
          let warehouseTaxRate = 0;
          try {
            const compForTax = composition.map(c => ({ material: c.material, quantity: c.quantity }));
            const recsForTax = productionRecords.map(r => ({ productionDate: r.productionDate, quantity: r.quantity }));
            warehouseTaxRate = await getWeightedAvgTaxRate(compForTax, recsForTax);
          } catch {
            // 默认 13%
            warehouseTaxRate = 0.13;
          }

          const transportPerTon = getTransportPerTonFromSnapshot(paramSnapshot, customer);
          const taxMain = paramSnapshot.taxRateMain / 100;
          const taxExtra = paramSnapshot.taxRateExtra / 100;
          const taxBasePerTon =
            quantity > 0
              ? salesUnitExclTax * 0.13 -
                materialUnitExclTax * warehouseTaxRate -
                transportPerTon * 0.03 -
                paramSnapshot.processingFeeForRefund * 0.09
              : 0;
          const taxPerTon =
            quantity > 0
              ? taxBasePerTon * taxMain +
                (salesUnitExclTax + materialUnitExclTax) * taxExtra
              : 0;
          const discountPerTon = getDiscountPerTonFromSnapshot(salesUnitExclTax, customer, paramSnapshot);
          const interestPerTon = getInterestPerTonFromSnapshot(salesUnitExclTax, customer, paramSnapshot);

          const transportCost = transportPerTon * quantity;
          const taxCost = taxPerTon * quantity;
          const discountCost = discountPerTon * quantity;
          const interestCost = interestPerTon * quantity;

          const otherCosts = transportCost + taxCost + discountCost + interestCost;

          // 其它收入项：即征即退 + 政府扶持资金（参数来自 ProfitParamConfig，按发货日期取生效值）
          let immediateRefundPerTon = 0;
          let governmentSupportPerTon = 0;
          if (customer === '萍钢' || customer === '新钢' || customer === '吉钢') {
            const baseTransport = getTransportPerTonFromSnapshot(paramSnapshot, customer);
            const taxBasePerTon =
              salesUnitExclTax * 0.13 -
              materialUnitExclTax * warehouseTaxRate -
              baseTransport * 0.03 -
              paramSnapshot.processingFeeForRefund * 0.09;

            const r70 = paramSnapshot.govSubsidyRate70 / 100;
            const r38 = paramSnapshot.govSubsidyRate38 / 100;
            const r41 = paramSnapshot.govSubsidyRate41 / 100;
            const r10 = paramSnapshot.govSubsidyRate10 / 100;
            const r80 = paramSnapshot.govSubsidyRate80 / 100;
            const r003 = paramSnapshot.govSubsidyRate003 / 100;
            const r100 = paramSnapshot.govSubsidyRate100 / 100;
            const commonSupportPerTon =
              taxBasePerTon * r10 * r80 +
              (salesUnitExclTax + materialUnitExclTax) * r003 * r100;

            if (customer === '吉钢') {
              // 吉钢：无即征即退；政府扶持按「税费基数×41% + 税费基数×10%×80% + (销+材)×0.03%×100%」
              immediateRefundPerTon = 0;
              governmentSupportPerTon = taxBasePerTon * r41 + commonSupportPerTon;
            } else {
              // 萍钢/新钢：含即征即退；政府扶持按「税费基数×70%×38% + 税费基数×10%×80% + (销+材)×0.03%×100%」
              const irRate = paramSnapshot.instantRefundRate / 100;
              immediateRefundPerTon = taxBasePerTon * irRate;
              governmentSupportPerTon = taxBasePerTon * r70 * r38 + commonSupportPerTon;
            }
          }

          const immediateRefund = immediateRefundPerTon * quantity;
          const governmentSupport = governmentSupportPerTon * quantity;
          const otherIncome = immediateRefund + governmentSupport;

          const profit = revenue - materialCost - processingCost - otherCosts + otherIncome;

          return {
            deliveryNumber: sale.deliveryNumber || '',
            deliveryDate: sale.deliveryDate || '',
            productType: productType,
            warehouse: sale.warehouse || '',
            customer: sale.customer || '',
            settlementQuantity: quantity,
            revenue,
            materialCost,
            processingCost,
            otherCosts,
            otherIncome,
            transportCost,
            taxCost,
            discountCost,
            interestCost,
            immediateRefund,
            governmentSupport,
            profit,
            costParamSnapshot: {
              salesUnitExclTax,
              materialUnitExclTax,
              warehouseTaxRate,
              transportPerTon,
              processingFeeForRefundPerTon: paramSnapshot.processingFeeForRefund,
              taxMainRate: taxMain,
              taxExtraRate: taxExtra,
              taxBasePerTon,
              taxPerTon,
              instantRefundRate: paramSnapshot.instantRefundRate / 100,
              govSubsidyRate41: paramSnapshot.govSubsidyRate41 / 100,
              govSubsidyRate70: paramSnapshot.govSubsidyRate70 / 100,
              govSubsidyRate38: paramSnapshot.govSubsidyRate38 / 100,
              govSubsidyRate10: paramSnapshot.govSubsidyRate10 / 100,
              govSubsidyRate80: paramSnapshot.govSubsidyRate80 / 100,
              govSubsidyRate003: paramSnapshot.govSubsidyRate003 / 100,
              govSubsidyRate100: paramSnapshot.govSubsidyRate100 / 100,
            },
            materialComposition: composition,
            productionRecords,
          };
        } catch (error) {
          console.error('处理销售数据失败:', error);
          return {
            deliveryNumber: sale.deliveryNumber || '',
            deliveryDate: sale.deliveryDate || '',
            productType: sale.productType || '',
            warehouse: sale.warehouse || '',
            customer: sale.customer || '',
            settlementQuantity: 0,
            revenue: 0,
            materialCost: 0,
            processingCost: 0,
            otherCosts: 0,
            otherIncome: 0,
            transportCost: 0,
            taxCost: 0,
            discountCost: 0,
            interestCost: 0,
            immediateRefund: 0,
            governmentSupport: 0,
            profit: 0,
            costParamSnapshot: {
              salesUnitExclTax: 0,
              materialUnitExclTax: 0,
              warehouseTaxRate: 0,
              transportPerTon: 0,
              processingFeeForRefundPerTon: 0,
              taxMainRate: 0,
              taxExtraRate: 0,
              taxBasePerTon: 0,
              taxPerTon: 0,
              instantRefundRate: 0,
              govSubsidyRate41: 0,
              govSubsidyRate70: 0,
              govSubsidyRate38: 0,
              govSubsidyRate10: 0,
              govSubsidyRate80: 0,
              govSubsidyRate003: 0,
              govSubsidyRate100: 0,
            },
            materialComposition: [],
            productionRecords: [],
          };
        }
      })
    );

    salesDetails.push(...batchResults);
  }

  // 计算汇总数据
  const todayForCalc = new Date();
  todayForCalc.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayForCalc);
  todayEnd.setHours(23, 59, 59, 999);

  // 最近一周：以「销售明细中最大发货日期」为基准的 7 天（若明细只到 1/17，则显示 12～18 日：1/12～1/18），避免柱状图为空
  let maxDeliveryDate: Date | null = null;
  for (const sale of salesDetails) {
    const d = parseDeliveryDate(sale.deliveryDate);
    if (d && (!maxDeliveryDate || d > maxDeliveryDate)) maxDeliveryDate = d;
  }
  const last7DaysEnd = maxDeliveryDate ? new Date(maxDeliveryDate) : new Date(todayForCalc);
  last7DaysEnd.setHours(23, 59, 59, 999);
  const last7DaysStart = new Date(last7DaysEnd);
  last7DaysStart.setDate(last7DaysEnd.getDate() - 5); // 7 天：结束日-5 到 结束日+1（如 17 日结束则 12～18 日）
  last7DaysStart.setHours(0, 0, 0, 0);
  const last7DaysEndPlus1 = new Date(last7DaysEnd);
  last7DaysEndPlus1.setDate(last7DaysEnd.getDate() + 1);
  last7DaysEndPlus1.setHours(23, 59, 59, 999);

  const monthStart = new Date(todayForCalc);
  monthStart.setDate(1); // 本月1号
  monthStart.setHours(0, 0, 0, 0);

  const todaySales = salesDetails.filter(sale => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= todayForCalc && date <= todayEnd;
  });

  const weekSales = salesDetails.filter(sale => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= last7DaysStart && date <= last7DaysEndPlus1;
  });

  const monthSales = salesDetails.filter(sale => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= monthStart && date <= todayEnd;
  });

  // 计算今日汇总
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.revenue, 0) / 10000;
  const todayMaterialCost = todaySales.reduce((sum, s) => sum + s.materialCost, 0) / 10000;
  const todayProcessingCost = todaySales.reduce((sum, s) => sum + s.processingCost, 0) / 10000;
  const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0) / 10000;

  // 计算本周汇总
  const weekProfit = weekSales.reduce((sum, s) => sum + s.profit, 0) / 10000;

  // 计算本月汇总
  const monthProfit = monthSales.reduce((sum, s) => sum + s.profit, 0) / 10000;

  // 计算日趋势（最近30天）
  const dailyTrendMap = new Map<string, { revenue: number; materialCost: number; processingCost: number; profit: number }>();
  const trendStartDate = new Date(today);
  trendStartDate.setDate(trendStartDate.getDate() - 30);
  trendStartDate.setHours(0, 0, 0, 0);

  const trendSales = salesDetails.filter(sale => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= trendStartDate && date <= today;
  });

  for (const sale of trendSales) {
    const date = parseDeliveryDate(sale.deliveryDate);
    if (!date) continue;
    const dateKey = formatDate(date);
    const existing = dailyTrendMap.get(dateKey) || { revenue: 0, materialCost: 0, processingCost: 0, profit: 0 };
    dailyTrendMap.set(dateKey, {
      revenue: existing.revenue + sale.revenue / 10000,
      materialCost: existing.materialCost + sale.materialCost / 10000,
      processingCost: existing.processingCost + sale.processingCost / 10000,
      profit: existing.profit + sale.profit / 10000,
    });
  }

  // 初始化所有日期
  const currentDate = new Date(trendStartDate);
  while (currentDate <= today) {
    const dateKey = formatDate(currentDate);
    if (!dailyTrendMap.has(dateKey)) {
      dailyTrendMap.set(dateKey, { revenue: 0, materialCost: 0, processingCost: 0, profit: 0 });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const dailyTrendDates = Array.from(dailyTrendMap.keys()).sort();
  const dailyTrend = {
    dates: dailyTrendDates,
    revenue: dailyTrendDates.map(d => dailyTrendMap.get(d)!.revenue),
    materialCost: dailyTrendDates.map(d => dailyTrendMap.get(d)!.materialCost),
    processingCost: dailyTrendDates.map(d => dailyTrendMap.get(d)!.processingCost),
    profit: dailyTrendDates.map(d => dailyTrendMap.get(d)!.profit),
  };

  // 最近一周分解：7 天为 12～18 日区间（如最大日期 1/17 则 1/12～1/18）
  const last7DaysLabels: string[] = [];
  const last7DaysKeys: string[] = [];
  const weekDataByDate = new Map<string, { revenue: number; materialCost: number; processingCost: number; profit: number }>();
  const weekStart = new Date(last7DaysStart);
  weekStart.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = formatDate(d);
    last7DaysKeys.push(key);
    const parts = key.split('-');
    last7DaysLabels.push(`${parts[1]}-${parts[2]}`);
    weekDataByDate.set(key, { revenue: 0, materialCost: 0, processingCost: 0, profit: 0 });
  }
  for (const sale of weekSales) {
    const date = parseDeliveryDate(sale.deliveryDate);
    if (!date) continue;
    const key = formatDate(date);
    const slot = weekDataByDate.get(key);
    if (slot) {
      slot.revenue += sale.revenue / 10000;
      slot.materialCost += sale.materialCost / 10000;
      slot.processingCost += sale.processingCost / 10000;
      slot.profit += sale.profit / 10000;
    }
  }
  const weekBreakdown = {
    days: last7DaysLabels,
    revenue: last7DaysKeys.map(k => weekDataByDate.get(k)!.revenue),
    materialCost: last7DaysKeys.map(k => weekDataByDate.get(k)!.materialCost),
    processingCost: last7DaysKeys.map(k => weekDataByDate.get(k)!.processingCost),
    profit: last7DaysKeys.map(k => weekDataByDate.get(k)!.profit),
  };

  let productComparison: ProfitAnalysisData['productComparison'] = EMPTY_PRODUCT_COMPARISON;
  if (includeProductComparison) {
    const productSet = new Set<string>();
    for (const sale of salesDetails) {
      if (sale.productType) {
        productSet.add(sale.productType);
      }
    }
    const products = Array.from(productSet);
    if (products.length > 0) {
      productComparison = await buildProfitProductComparisonForProducts(products);
    }
  }

  return {
    summary: {
      todayProfit,
      weekProfit,
      monthProfit,
      todayRevenue,
      todayMaterialCost,
      todayProcessingCost,
    },
    dailyTrend,
    weekBreakdown,
    salesDetails,
    productComparison,
  };
}
