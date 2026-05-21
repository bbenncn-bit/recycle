import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate, formatDate } from './profit-service';
import {
  calculateLIFOMaterialCost,
  resolveLifoSettlementQuantity,
} from './lifo-material-cost-service';
import { resolveSaleProductIdentity } from './lifo-match-resolve';
import {
  deriveProfitAnalysisCustomer,
  isExcludedFromProfitAnalysis,
} from './profit-analysis-warehouse-rules';
import {
  buildParamSnapshot,
  loadAllParamConfigRows,
  type ProfitParamSnapshot,
} from './profit-param-config-service';

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
    /** 品种（与加工表/LIFO 匹配的成品名） */
    productType: string;
    /** 表格「成品名称」：以 DeliverySettlement.warehouse 为主 */
    productDisplayName: string;
    warehouse: string;
    /** 发往客户：库内为空时按 warehouse/product_type 推导（吉钢/萍钢/新钢） */
    customer: string;
    settlementQuantity: number;   // 结算量（吨）
    /** 出厂净重（吨），DeliverySettlement.net_weight */
    netWeight: number;
    /** 磅差（吨），DeliverySettlement.transitloss 原值；列为空时展示 0，核算回退扣杂率 */
    transitLoss: number;
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
    /** 吨钢毛利（元/吨）= 利润(元) / 净重(吨)；净重为 0 时为 0 */
    profitPerNetTon: number;
    costParamSnapshot?: {          // 其它成本核算参数快照（用于前端核对）
      salesUnitExclTax: number;                // 销售单价（不含税，元/吨）
      materialUnitExclTax: number;             // 材料单价（不含税，元/吨）
      materialCalcQuantity: number;            // 材料成本核算数量（吨，优先出厂净重 net_weight）
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
  productComparison: {              // 当月与上月对比（按客户-成品）
    labels: string[];               // 维度：客户-成品（如 吉钢-钢筋压块）
    currentMonth: {
      quantityTons: number[];       // 当月销量（吨）
      avgUnitPriceInclTax: number[]; // 当月平均销售单价（含税，元/吨）
    };
    lastMonth: {
      quantityTons: number[];       // 上月销量（吨）
      avgUnitPriceInclTax: number[]; // 上月平均销售单价（含税，元/吨）
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

/** 将扣杂率等「比例」标准化为小数：0.5% => 0.005；仅用于 transitloss 列为空时的回退核算 */
function normalizeTransitLossRate(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  // 容错：若传入的是百分数（如 2.316 表示 2.316%），转成小数 0.02316
  if (value > 1) return value / 100;
  // 业务上途损通常远小于 1%，若大于 0.2（20%）也按百分数处理，避免口径错配
  if (value > 0.2) return value / 100;
  return value;
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
        estimatedDryBasis: {
          not: null,
        },
        totalPriceExcludingTax: {
          not: null,
        },
      },
      select: {
        warehouseDate: true,
        unitPriceExcludingTax: true,
        estimatedDryBasis: true,
        totalPriceExcludingTax: true,
      },
    });

    // 过滤日期范围并计算加权平均
    let totalWeight = 0;
    let totalCost = 0;

    for (const purchase of purchases) {
      const purchaseDate = parseWarehouseDate(purchase.warehouseDate);
      if (!purchaseDate) continue;
      if (purchaseDate < startDate || purchaseDate >= beforeDate) continue;

      const weight = processDecimal(purchase.estimatedDryBasis);
      const cost = processDecimal(purchase.totalPriceExcludingTax);
      
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
  lifoQuantity: number,
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
  if (lifoQuantity <= 0) {
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
    
    // 缓存未命中或缓存为 0：尝试实时 LIFO（支持 alias 材料列、库别与成品名解析）
    let lifoResult: Awaited<ReturnType<typeof calculateLIFOMaterialCost>> | null = null;
    try {
      const { productName, productWarehouse } = await resolveSaleProductIdentity(
        productType,
        warehouse,
      );
      if (productName) {
        lifoResult = await calculateLIFOMaterialCost(
          productName,
          productWarehouse,
          lifoQuantity,
          saleDate,
          { skipResolve: true },
        );
      }
    } catch (lifoErr) {
      console.warn(`实时 LIFO 计算失败 (${deliveryNumber}):`, lifoErr);
    }

    if (lifoResult && lifoResult.cost > 0) {
        const totalTons = lifoResult.composition.reduce((s, c) => s + (c.tons ?? 0), 0);
        const composition: Array<{ material: string; quantity: number; cost: number }> =
          totalTons > 0
            ? lifoResult.composition.map((c) => ({
                material: c.material,
                quantity: c.tons ?? 0,
                cost: ((c.tons ?? 0) / totalTons) * lifoResult.cost,
              }))
            : [];
        if (process.env.PROFIT_ANALYSIS_VERBOSE === '1') {
          console.log(
            `缓存未命中，实时 LIFO 计算材料成本: ${deliveryNumber}, ${lifoResult.cost.toFixed(2)} 元`,
          );
        }
      return {
        cost: lifoResult.cost,
        composition,
        productionRecords: lifoResult.productionRecords ?? [],
      };
    }

    if (cached && cached.materialCost > 0) {
      if (process.env.PROFIT_ANALYSIS_VERBOSE === '1') {
        console.log(`从缓存读取材料成本: ${deliveryNumber}`);
      }
      return {
        cost: cached.materialCost,
        composition: cached.materialComposition,
        productionRecords: cached.productionRecords,
      };
    }

    // 仍无结果则返回 0（建议执行材料成本缓存刷新；旧版 SP 可能未统计 alias 材料列）
    if (process.env.PROFIT_ANALYSIS_VERBOSE === '1') {
      console.warn(`缓存未命中: ${deliveryNumber}，无 LIFO 结果，材料成本显示为 0`);
    }
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
      const qty = lifoQuantity * item.ratio;
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

/** 加工费默认元/吨（ProfitParamConfig 无配置时回退；与 processing_fee_for_refund 一致） */
const DEFAULT_PROCESSING_COST_PER_TON = 70;
/** 扣杂率回退时的默认磅差率（0.5%），仅当 transitloss 列为空时用 (1+率) 核算 */
const DEFAULT_TRANSIT_LOSS_RATE = 0.005;

export type { ProfitParamSnapshot };

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
  // 业务口径固定：萍钢贴现费用=销售单价(不含税)*1.13*1.8%
  const pinggangDiscountRate = 1.8;
  return salesUnitExclTax * 1.13 * (pinggangDiscountRate / 100);
}

/**
 * 回款周期资金利息元/吨：销售单价(不含税)*1.13*年利率%/360*天数
 */
function getInterestPerTonFromSnapshot(salesUnitExclTax: number, customer: string, s: ProfitParamSnapshot): number {
  const c = (customer || '').trim();
  let days = 0;
  // 业务口径固定：萍钢回款天数=60天
  if (c === '萍钢') days = 60;
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
  labels: [],
  currentMonth: { quantityTons: [], avgUnitPriceInclTax: [] },
  lastMonth: { quantityTons: [], avgUnitPriceInclTax: [] },
};

/** 成品对比（按 吉钢/萍钢/新钢 × 成品，对比当月与上月销量和平均单价） */
async function buildProfitProductComparison(): Promise<ProfitAnalysisData['productComparison']> {
  const todayForCalc = new Date();
  todayForCalc.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayForCalc);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const currentMonthStr = formatDate(monthStart).slice(0, 7);
  const lastMonth = new Date(monthStart);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = formatDate(lastMonth).slice(0, 7);

  const targetCustomers = new Set(['吉钢', '萍钢', '新钢']);
  const customerOrder = ['吉钢', '萍钢', '新钢'];
  const rows = await prisma.deliverySettlement.findMany({
    where: {
      productType: { not: null },
      settlementQuantity: { not: null },
      totalSettlementAmount: { not: null },
      deliveryDate: { not: null },
    },
    select: {
      customer: true,
      productType: true,
      warehouse: true,
      settlementQuantity: true,
      totalSettlementAmount: true,
      deliveryDate: true,
    },
  });

  type Agg = { qty: number; revenueInclTax: number };
  type KeyAgg = { current: Agg; last: Agg; customer: string; product: string };
  const map = new Map<string, KeyAgg>();

  for (const row of rows) {
    if (isExcludedFromProfitAnalysis(row.warehouse, row.productType)) continue;
    const customer =
      deriveProfitAnalysisCustomer(row.warehouse, row.productType) ||
      (row.customer || '').trim();
    const product =
      (row.warehouse || '').trim() || (row.productType || '').trim();
    if (!customer || !product || !targetCustomers.has(customer)) continue;
    const d = parseDeliveryDate(row.deliveryDate);
    if (!d) continue;
    const monthKey = formatDate(d).slice(0, 7);
    if (monthKey !== currentMonthStr && monthKey !== lastMonthStr) continue;

    const qty = processDecimal(row.settlementQuantity);
    const revenueInclTax = processDecimal(row.totalSettlementAmount);
    const key = `${customer}__${product}`;
    const slot = map.get(key) || {
      current: { qty: 0, revenueInclTax: 0 },
      last: { qty: 0, revenueInclTax: 0 },
      customer,
      product,
    };
    if (monthKey === currentMonthStr) {
      slot.current.qty += qty;
      slot.current.revenueInclTax += revenueInclTax;
    } else {
      slot.last.qty += qty;
      slot.last.revenueInclTax += revenueInclTax;
    }
    map.set(key, slot);
  }

  const entries = Array.from(map.values())
    .filter((e) => e.current.qty > 0 || e.last.qty > 0)
    .sort((a, b) => {
      const c = customerOrder.indexOf(a.customer) - customerOrder.indexOf(b.customer);
      if (c !== 0) return c;
      return b.current.qty - a.current.qty;
    });

  const labels = entries.map((e) => `${e.customer}-${e.product}`);
  const currentQty = entries.map((e) => e.current.qty);
  const lastQty = entries.map((e) => e.last.qty);
  const currentAvg = entries.map((e) => (e.current.qty > 0 ? e.current.revenueInclTax / e.current.qty : 0));
  const lastAvg = entries.map((e) => (e.last.qty > 0 ? e.last.revenueInclTax / e.last.qty : 0));

  return {
    labels,
    currentMonth: {
      quantityTons: currentQty,
      avgUnitPriceInclTax: currentAvg,
    },
    lastMonth: {
      quantityTons: lastQty,
      avgUnitPriceInclTax: lastAvg,
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
  return buildProfitProductComparison();
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
        id: true,
        deliveryNumber: true,
        deliveryDate: true,
        productType: true,
        warehouse: true,
        customer: true,
        settlementQuantity: true,
        netWeight: true,
        deductionRate: true,
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

  // 销售明细：有效发货日期；排除汽拆类（不纳入本模块）
  const validSalesForDetails = salesData.filter((sale) => {
    if (parseDeliveryDate(sale.deliveryDate) === null) return false;
    if (isExcludedFromProfitAnalysis(sale.warehouse, sale.productType)) return false;
    return true;
  });
  // 汇总/图表仍基于 salesDetails 再按 queryStartDate/queryEndDate 过滤计算

  /** 每单 DeliverySettlement.transitloss 原值（null=列空）；未在 Prisma 声明，用原生 SQL */
  const transitLossRawBySaleId = new Map<number, unknown>();
  try {
    const transitRows = await prisma.$queryRaw<Array<{ id: number; transitLoss: unknown }>>`
      SELECT id, transitloss AS transitLoss
      FROM DeliverySettlement
      WHERE delivery_date IS NOT NULL
        AND delivery_date >= ${minDeliveryDateStr}
    `;
    for (const row of transitRows) {
      transitLossRawBySaleId.set(Number(row.id), row.transitLoss);
    }
  } catch (e) {
    console.warn('读取 DeliverySettlement.transitloss 失败，将按扣杂率/默认磅差回退:', e);
  }

  function fallbackTransitLossRate(sale: (typeof validSalesForDetails)[0]): number {
    const d = normalizeTransitLossRate(processDecimal(sale.deductionRate));
    return d > 0 ? d : DEFAULT_TRANSIT_LOSS_RATE;
  }

  /** transitloss 列有值（含 0）时返回吨数；列为 NULL 或行未返回时 null（核算走扣杂率） */
  function getTransitLossTonsFromDb(saleId: number): number | null {
    if (!transitLossRawBySaleId.has(saleId)) return null;
    const raw = transitLossRawBySaleId.get(saleId);
    if (raw === null || raw === undefined) return null;
    const n = processDecimal(raw as any);
    if (!Number.isFinite(n)) return null;
    return n;
  }

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
          const netWeightQuantity = processDecimal(sale.netWeight);
          const productType = (sale.productType || '').trim();
          const productDisplayName =
            (sale.warehouse || '').trim() || productType;
          const customer =
            deriveProfitAnalysisCustomer(sale.warehouse, sale.productType) ||
            (sale.customer || '').trim();

          const deliveryDate = parseDeliveryDate(sale.deliveryDate) || new Date();
          const saleId = Number(sale.id);
          const transitLossTonsDb = getTransitLossTonsFromDb(saleId);
          const transitLossTonsDisplay = transitLossTonsDb !== null ? transitLossTonsDb : 0;
          const lifoRateFallback = fallbackTransitLossRate(sale);
          // 材料核算量：有 transitloss(吨) 时净重/结算量 + 磅差吨；否则 (1+扣杂率) 口径
          const lifoQuantity = resolveLifoSettlementQuantity({
            settlementQuantity: quantity,
            netWeightQuantity,
            transitLossTons: transitLossTonsDb !== null ? transitLossTonsDb : null,
            transitLossRate: transitLossTonsDb === null ? lifoRateFallback : undefined,
          });
          const paramSnapshot = buildParamSnapshot(allParamRows, deliveryDate, customer);

          // 加工成本 = 加工单价(元/吨) × 净重(吨)；单价来自 ProfitParamConfig.processing_fee_for_refund
          const processingUnitPerTon = paramSnapshot.processingFeeForRefund;
          const processingWeight =
            netWeightQuantity > 0 ? netWeightQuantity : quantity;
          const processingCost = processingWeight * processingUnitPerTon;

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
              lifoQuantity,
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
          const materialUnitExclTax = lifoQuantity > 0 ? materialCost / lifoQuantity : 0;

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

          // 运输费口径：客户运价(含税) * 出厂重量；出厂重量=净重/1.03
          const transportWeightForCalc = netWeightQuantity > 0 ? netWeightQuantity : quantity;
          const transportCost =
            transportWeightForCalc > 0 && paramSnapshot.roadLossFactor > 0
              ? paramSnapshot.transportFee * (transportWeightForCalc / paramSnapshot.roadLossFactor)
              : 0;
          const transportPerSettlementTonForTax = quantity > 0 ? transportCost / quantity : 0;
          const taxMain = paramSnapshot.taxRateMain / 100;
          const taxExtra = paramSnapshot.taxRateExtra / 100;
          const taxBasePerTon =
            quantity > 0
              ? salesUnitExclTax * 0.13 -
                materialUnitExclTax * warehouseTaxRate -
                transportPerSettlementTonForTax * 0.03 -
                paramSnapshot.processingFeeForRefund * 0.09
              : 0;
          const taxPerTon =
            quantity > 0
              ? taxBasePerTon * taxMain +
                (salesUnitExclTax + materialUnitExclTax) * taxExtra
              : 0;
          const discountPerTon = getDiscountPerTonFromSnapshot(salesUnitExclTax, customer, paramSnapshot);
          const interestPerTon = getInterestPerTonFromSnapshot(salesUnitExclTax, customer, paramSnapshot);

          const taxCost = taxPerTon * quantity;
          const discountCost = discountPerTon * quantity;
          const interestCost = interestPerTon * quantity;

          const otherCosts = transportCost + taxCost + discountCost + interestCost;

          // 其它收入项：即征即退 + 政府扶持资金（参数来自 ProfitParamConfig，按发货日期取生效值）
          let immediateRefundPerTon = 0;
          let governmentSupportPerTon = 0;
          if (customer === '萍钢' || customer === '新钢' || customer === '吉钢') {
            const baseTransport = transportPerSettlementTonForTax;
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

          const revenueExclTax = revenue / 1.13;
          const profit = revenueExclTax - materialCost - processingCost - otherCosts + otherIncome;
          const profitPerNetTon =
            netWeightQuantity > 0 ? profit / netWeightQuantity : 0;

          return {
            deliveryNumber: sale.deliveryNumber || '',
            deliveryDate: sale.deliveryDate || '',
            productType,
            productDisplayName,
            warehouse: sale.warehouse || '',
            customer,
            settlementQuantity: quantity,
            netWeight: netWeightQuantity,
            transitLoss: transitLossTonsDisplay,
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
            profitPerNetTon,
            costParamSnapshot: {
              salesUnitExclTax,
              materialUnitExclTax,
              materialCalcQuantity: lifoQuantity,
              warehouseTaxRate,
              transportPerTon: transportPerSettlementTonForTax,
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
            productType: (sale.productType || '').trim(),
            productDisplayName:
              (sale.warehouse || '').trim() || (sale.productType || '').trim(),
            warehouse: sale.warehouse || '',
            customer:
              deriveProfitAnalysisCustomer(sale.warehouse, sale.productType) ||
              (sale.customer || '').trim(),
            settlementQuantity: 0,
            netWeight: 0,
            transitLoss: 0,
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
            profitPerNetTon: 0,
            costParamSnapshot: {
              salesUnitExclTax: 0,
              materialUnitExclTax: 0,
              materialCalcQuantity: 0,
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
    productComparison = await buildProfitProductComparison();
  }

  salesDetails.sort((a, b) => {
    const da = parseDeliveryDate(a.deliveryDate);
    const db = parseDeliveryDate(b.deliveryDate);
    if (da && db) {
      const diff = da.getTime() - db.getTime();
      if (diff !== 0) return diff;
    } else if (da) return -1;
    else if (db) return 1;
    return (a.deliveryNumber || '').localeCompare(b.deliveryNumber || '');
  });

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
