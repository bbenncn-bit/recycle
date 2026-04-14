import { prisma } from '@/lib/prismadb';
import { normalizeMaterialCategoryLabel } from '@/lib/material-label';

export interface CostAnalysisData {
  summary: {
    todayCost: number;
    weekCost: number;
    monthCost: number;
    avgDailyCost: number;
    todayBaseSelfCost: number;
    todayBaseSelfQty: number;
    todayBasePurchaseCost: number;
    todayBasePurchaseQty: number;
    weekBaseSelfCost: number;
    weekBaseSelfQty: number;
    weekBasePurchaseCost: number;
    weekBasePurchaseQty: number;
    monthBaseSelfCost: number;
    monthBaseSelfQty: number;
    monthBasePurchaseCost: number;
    monthBasePurchaseQty: number;
  };
  weekCostBreakdown: {
    days: string[]; // 周一到周日
    baseSelf: number[]; // 基地自采（SH）
    basePurchase: number[]; // 基地买货（TH）
    collaboration: number[]; // 协同业务（其他）
    dailyCategoryData?: Array<{ // 每日的详细分类数据（按料型分类）
      date: string; // 日期（YYYY-MM-DD格式）
      baseSelfCategories: { // 基地收货的料型分类
        categories: string[]; // 料型名称
        costs: number[]; // 成本（万元）
        avgPrices: number[]; // 平均单价（元/吨）
        quantities: number[]; // 数量（吨）
      };
    }>;
  };
  dailyTrend: {
    dates: string[];
    baseSelf: number[]; // 基地收货（SH）
    basePurchase: number[]; // 基地买货（TH）
    collaboration: number[]; // 协同业务（其他）
    baseSelfQty: number[]; // 基地收货吨数（吨）
    basePurchaseQty: number[]; // 基地买货吨数（吨）
    collaborationQty: number[]; // 协同业务吨数（吨）
  };
  // 基地收货（SH）的物料类型分布
  categoryDistributionBaseSelf: {
    categories: string[];
    costs: number[];
    percentages: number[];
    avgPrices: number[]; // 平均单价（元/吨）
    quantities: number[]; // 数量（吨）
  };
  // 基地买货（TH）的物料类型分布
  categoryDistributionBasePurchase: {
    categories: string[];
    costs: number[];
    percentages: number[];
    avgPrices: number[]; // 平均单价（元/吨）
    quantities: number[]; // 数量（吨）
  };
  // 上月基地收货（SH）的物料类型分布（用于成本对比）
  lastMonthCategoryDistributionBaseSelf: {
    categories: string[];
    avgPrices: number[]; // 平均单价（元/吨）
  };
  // 上月基地买货（TH）的物料类型分布（用于成本对比）
  lastMonthCategoryDistributionBasePurchase: {
    categories: string[];
    avgPrices: number[]; // 平均单价（元/吨）
  };
  weeklyComparison?: {
    weeks: string[];
    costs: number[];
  };
  monthlyComparison?: {
    months: string[];
    costs: number[];
  };
}

/**
 * 解析入库日期字符串为 Date 对象
 * 支持多种日期格式：'2024-01-15'、'2024/01/15'、'2024-1-5' 等
 */
export function parseWarehouseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  // 去除首尾空格
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  
  // 尝试多种日期格式
  const formats = [
    // 标准格式：2024-01-15, 2024-1-5
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+\d{1,2}:\d{1,2}:\d{1,2})?$/,
    // 斜杠格式：2024/01/15, 2024/1/5
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+\d{1,2}:\d{1,2}:\d{1,2})?$/,
    // 紧凑格式：20240115
    /^(\d{4})(\d{2})(\d{2})$/,
    // 中文格式：2024年1月15日
    /^(\d{4})年(\d{1,2})月(\d{1,2})日?$/,
    // 点分隔：2024.01.15
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
  ];
  
  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // 月份从0开始
      const day = parseInt(match[3]);
      
      // 验证日期有效性
      if (year < 1900 || year > 2100) continue;
      if (month < 0 || month > 11) continue;
      if (day < 1 || day > 31) continue;
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }
  }
  
  // 如果都不匹配，尝试直接解析（ISO格式等）
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    // 验证解析出的日期是否合理（年份在合理范围内）
    const year = date.getFullYear();
    if (year >= 1900 && year <= 2100) {
      return date;
    }
  }
  
  return null;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 处理成本数据：将 Decimal 转换为 number，处理 null 值
 */
function processCostData(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  // Prisma Decimal 类型
  if (value && typeof value.toString === 'function') {
    return parseFloat(value.toString()) || 0;
  }
  return 0;
}

/**
 * 计算日成本（严格从数据库取数，不包含未来日期）
 * 按 receiptNo 分类：基地收货（SH）、基地买货（TH）、协同业务（其他）
 */
function calculateDailyCost(
  data: Array<{ warehouseDate: string | null; totalPriceIncludingTax: any; receiptNo: string | null; netWeight: any }>,
  startDate: Date,
  endDate: Date
): {
  dates: string[];
  baseSelf: number[];
  basePurchase: number[];
  collaboration: number[];
  baseSelfQty: number[];
  basePurchaseQty: number[];
  collaborationQty: number[];
} {
  const dateMap = new Map<string, {
    baseSelf: number;
    basePurchase: number;
    collaboration: number;
    baseSelfQty: number;
    basePurchaseQty: number;
    collaborationQty: number;
  }>();
  
  // 获取今天日期，确保不包含未来日期
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const actualEndDate = endDate > today ? today : endDate;
  
  // 初始化日期范围内的所有日期（只到今天）
  const currentDate = new Date(startDate);
  while (currentDate <= actualEndDate) {
    const dateKey = formatDate(currentDate);
    dateMap.set(dateKey, {
      baseSelf: 0,
      basePurchase: 0,
      collaboration: 0,
      baseSelfQty: 0,
      basePurchaseQty: 0,
      collaborationQty: 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // 汇总每日成本（严格从数据库取数）
  for (const item of data) {
    const date = parseWarehouseDate(item.warehouseDate);
    if (!date) continue;
    
    // 严格限制：日期不能超过今天
    if (date > today) continue;
    
    if (date >= startDate && date <= actualEndDate) {
      const dateKey = formatDate(date);
      const cost = processCostData(item.totalPriceIncludingTax);
      const qty = processCostData(item.netWeight);
      const dayData = dateMap.get(dateKey) || {
        baseSelf: 0,
        basePurchase: 0,
        collaboration: 0,
        baseSelfQty: 0,
        basePurchaseQty: 0,
        collaborationQty: 0,
      };
      
      // 根据 receiptNo 前两个字母分类
      const receiptNo = (item.receiptNo || '').toUpperCase();
      if (receiptNo.startsWith('SH')) {
        dayData.baseSelf += cost;
        dayData.baseSelfQty += qty;
      } else if (receiptNo.startsWith('TH')) {
        dayData.basePurchase += cost;
        dayData.basePurchaseQty += qty;
      } else {
        dayData.collaboration += cost;
        dayData.collaborationQty += qty;
      }
      
      dateMap.set(dateKey, dayData);
    }
  }
  
  // 转换为数组，按日期排序
  const sortedEntries = Array.from(dateMap.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );
  
  return {
    dates: sortedEntries.map(([date]) => date),
    baseSelf: sortedEntries.map(([, data]) => parseFloat((data.baseSelf / 10000).toFixed(2))), // 转换为万元，保留2位小数
    basePurchase: sortedEntries.map(([, data]) => parseFloat((data.basePurchase / 10000).toFixed(2))),
    collaboration: sortedEntries.map(([, data]) => parseFloat((data.collaboration / 10000).toFixed(2))),
    baseSelfQty: sortedEntries.map(([, data]) => parseFloat(data.baseSelfQty.toFixed(2))),
    basePurchaseQty: sortedEntries.map(([, data]) => parseFloat(data.basePurchaseQty.toFixed(2))),
    collaborationQty: sortedEntries.map(([, data]) => parseFloat(data.collaborationQty.toFixed(2))),
  };
}

/**
 * 按物料类型计算成本（从 PurchaseWarehouse 表的 material 字段分类汇总）
 * 包含平均单价和数量
 */
function calculateCategoryCost(
  data: Array<{ 
    material: string | null; 
    totalPriceIncludingTax: any; 
    warehouseDate: string | null;
    unitPriceIncludingTax: any; // 单价（含税）
    netWeight: any; // 净重
  }>
): { 
  categories: string[]; 
  costs: number[]; 
  percentages: number[];
  avgPrices: number[]; // 平均单价（元/吨）
  quantities: number[]; // 数量（吨）
} {
  const categoryMap = new Map<string, {
    totalCost: number;
    totalQuantity: number;
    totalPrice: number; // 用于计算加权平均单价
    count: number;
  }>();
  
  // 获取今天日期，确保不包含未来日期的数据
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  // 汇总各类型成本、数量和单价（严格从数据库取数，排除未来日期）
  for (const item of data) {
    // 检查日期，排除未来日期
    const date = parseWarehouseDate(item.warehouseDate);
    if (date && date > today) continue;
    
    // 使用 material 字段进行分类（规范化后跨月份可对齐同一料型）
    const category = normalizeMaterialCategoryLabel(item.material);
    const cost = processCostData(item.totalPriceIncludingTax);
    const quantity = processCostData(item.netWeight); // 净重（吨）
    const unitPrice = processCostData(item.unitPriceIncludingTax); // 单价（含税，元/吨）
    
    const existing = categoryMap.get(category) || {
      totalCost: 0,
      totalQuantity: 0,
      totalPrice: 0,
      count: 0,
    };
    
    existing.totalCost += cost;
    existing.totalQuantity += quantity;
    existing.totalPrice += cost; // 总价用于计算加权平均
    existing.count += 1;
    
    categoryMap.set(category, existing);
  }
  
  // 转换为数组并按成本从高到低排序
  const sortedEntries = Array.from(categoryMap.entries())
    .map(([category, stats]) => {
      // 计算加权平均单价：总价 / 总数量
      const avgPrice = stats.totalQuantity > 0 
        ? stats.totalPrice / stats.totalQuantity 
        : 0;
      
      return {
        category,
        cost: parseFloat((stats.totalCost / 10000).toFixed(2)), // 转换为万元，保留2位小数
        quantity: parseFloat(stats.totalQuantity.toFixed(2)), // 数量（吨），保留2位小数
        avgPrice: parseFloat(avgPrice.toFixed(2)), // 平均单价（元/吨），保留2位小数
      };
    })
    .sort((a, b) => b.cost - a.cost);
  
  const totalCost = sortedEntries.reduce((sum, item) => sum + item.cost, 0);
  
  return {
    categories: sortedEntries.map(item => item.category),
    costs: sortedEntries.map(item => parseFloat(item.cost.toFixed(2))),
    percentages: sortedEntries.map(item => 
      totalCost > 0 ? parseFloat(((item.cost / totalCost) * 100).toFixed(2)) : 0
    ),
    avgPrices: sortedEntries.map(item => parseFloat(item.avgPrice.toFixed(2))),
    quantities: sortedEntries.map(item => parseFloat(item.quantity.toFixed(2))),
  };
}

/**
 * 获取成本分析数据
 */
export async function getCostAnalysisData(
  startDate?: Date,
  endDate?: Date
): Promise<CostAnalysisData> {
  const devLog = process.env.NODE_ENV === 'development';

  // 设置默认日期范围（最近30天）
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);

  const queryStartDate = startDate || defaultStartDate;
  const queryEndDate = endDate || today;

  const todayForCalc = new Date();
  todayForCalc.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayForCalc);
  todayEnd.setHours(23, 59, 59, 999);

  const lastMonthStart = new Date(todayForCalc);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);
  lastMonthStart.setHours(0, 0, 0, 0);

  const trendStartDate = new Date(todayForCalc);
  trendStartDate.setDate(trendStartDate.getDate() - 29);
  trendStartDate.setHours(0, 0, 0, 0);

  // 库内字符串日期多为 YYYY-MM-DD，用下界缩小全表扫描（上月起 + 趋势窗 + 自定义起期，再留 7 天缓冲）
  const scanStart = new Date(
    Math.min(
      lastMonthStart.getTime(),
      trendStartDate.getTime(),
      queryStartDate.getTime()
    )
  );
  scanStart.setDate(scanStart.getDate() - 7);
  const minWarehouseDateStr = formatDate(scanStart);

  // 查询数据（带日期下界；status 仍在内存过滤）
  let allData;
  try {
    allData = await prisma.purchaseWarehouse.findMany({
      where: {
        totalPriceIncludingTax: {
          not: null,
        },
        warehouseDate: {
          not: null,
          gte: minWarehouseDateStr,
        },
      },
      select: {
        warehouseDate: true,
        material: true,
        totalPriceIncludingTax: true,
        status: true,
        receiptNo: true, // 添加 receiptNo 用于分类
        unitPriceIncludingTax: true, // 单价（含税）
        netWeight: true, // 净重
      },
    });
    if (devLog) {
      console.log(
        `✅ PurchaseWarehouse 查询 ${allData.length} 条（warehouse_date >= ${minWarehouseDateStr}）`
      );
      if (allData.length > 0) {
        console.log('📊 前3条数据示例:', allData.slice(0, 3));
      }
    }
  } catch (dbError) {
    console.error('❌ 查询 PurchaseWarehouse 表失败:', dbError);
    console.error('错误详情:', {
      message: dbError instanceof Error ? dbError.message : String(dbError),
      stack: dbError instanceof Error ? dbError.stack : undefined,
    });
    
    // 检查是否是 Prisma 错误
    if (dbError && typeof dbError === 'object' && 'code' in dbError) {
      const prismaError = dbError as any;
      // P2022: 列不存在
      if (prismaError.code === 'P2022') {
        throw new Error(
          `数据库表 PurchaseWarehouse 的列名与 schema 不匹配。\n` +
          `错误: ${prismaError.message}\n` +
          `请检查数据库表结构，确保列名与 schema 中的字段名匹配。\n` +
          `如果列名不同（如 warehouse_date vs warehouseDate），请在 schema 中使用 @map 映射。\n` +
          `或者运行: npx prisma db push --accept-data-loss 同步 schema 到数据库。`
        );
      }
      // P1001: 无法连接到数据库
      if (prismaError.code === 'P1001') {
        throw new Error(`无法连接到数据库。请检查 DATABASE_URL 配置。`);
      }
    }
    
    // 检查是否是表不存在的错误
    if (dbError instanceof Error) {
      const errorMsg = dbError.message.toLowerCase();
      // 检查各种可能的错误消息
      if (
        errorMsg.includes('unknown model') || 
        (errorMsg.includes('table') && errorMsg.includes('does not exist')) ||
        (errorMsg.includes('table') && errorMsg.includes('not found')) ||
        (errorMsg.includes('table') && errorMsg.includes('doesn\'t exist')) ||
        errorMsg.includes('1146') // MySQL 错误代码 1146: Table doesn't exist
      ) {
        throw new Error(
          `数据库表 PurchaseWarehouse 不存在。请运行以下命令创建表:\n` +
          `npx prisma db push\n` +
          `或者如果表已存在但结构不匹配，请运行:\n` +
          `npx prisma db push --accept-data-loss`
        );
      }
      // 检查是否是列不存在的错误
      if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
        throw new Error(
          `数据库表 PurchaseWarehouse 的列名与 schema 不匹配。\n` +
          `错误: ${dbError.message}\n` +
          `请检查数据库表结构，确保列名与 schema 中的字段名匹配。\n` +
          `如果列名不同（如 warehouse_date vs warehouseDate），请在 schema 中使用 @map 映射。\n` +
          `或者运行: npx prisma db push --accept-data-loss 同步 schema 到数据库。`
        );
      }
      // 检查是否是 Prisma Client 未生成的错误
      if (errorMsg.includes('prisma') && (errorMsg.includes('not found') || errorMsg.includes('undefined'))) {
        throw new Error(`Prisma Client 未正确生成。请运行: npx prisma generate`);
      }
      throw new Error(`数据库查询失败: ${dbError.message}`);
    }
    throw dbError;
  }
  
  // 在内存中过滤有效状态（排除红冲、撤销等无效状态）
  const validData = allData.filter(item => {
    const status = item.status || '';
    if (status.includes('红冲') || status.includes('撤销')) return false;
    return true;
  });
  
  if (devLog) console.log(`📋 过滤后有效数据: ${validData.length} 条`);

  // 调试：检查日期解析情况
  const dateParseStats = {
    total: validData.length,
    parsed: 0,
    null: 0,
    invalid: 0,
    sampleDates: [] as string[],
  };
  
  validData.slice(0, 10).forEach(item => {
    const parsed = parseWarehouseDate(item.warehouseDate);
    if (!item.warehouseDate) {
      dateParseStats.null++;
    } else if (!parsed) {
      dateParseStats.invalid++;
      if (dateParseStats.sampleDates.length < 5) {
        dateParseStats.sampleDates.push(item.warehouseDate);
      }
    } else {
      dateParseStats.parsed++;
    }
  });
  
  if (devLog) {
    console.log('📅 日期解析统计:', {
      ...dateParseStats,
      sampleInvalidDates: dateParseStats.sampleDates,
    });
  }

  // 调试：检查价格数据
  const priceStats = {
    total: validData.length,
    hasPrice: 0,
    nullPrice: 0,
    zeroPrice: 0,
    samplePrices: [] as any[],
  };
  
  validData.slice(0, 10).forEach(item => {
    const price = processCostData(item.totalPriceIncludingTax);
    if (item.totalPriceIncludingTax === null || item.totalPriceIncludingTax === undefined) {
      priceStats.nullPrice++;
    } else if (price === 0) {
      priceStats.zeroPrice++;
    } else {
      priceStats.hasPrice++;
      if (priceStats.samplePrices.length < 5) {
        priceStats.samplePrices.push({
          original: item.totalPriceIncludingTax,
          processed: price,
        });
      }
    }
  });
  
  if (devLog) console.log('💰 价格数据统计:', priceStats);

  // 计算今日、本周、本月成本（使用所有有效数据，不受查询日期范围限制）
  const last7DaysStart = new Date(todayForCalc);
  last7DaysStart.setDate(todayForCalc.getDate() - 6);
  last7DaysStart.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(todayForCalc);
  monthStart.setDate(1); // 本月1号
  monthStart.setHours(0, 0, 0, 0);
  
  const todayData = validData.filter(item => {
    const date = parseWarehouseDate(item.warehouseDate);
    return date && date >= todayForCalc && date <= todayEnd;
  });
  
  const weekData = validData.filter(item => {
    const date = parseWarehouseDate(item.warehouseDate);
    return date && date >= last7DaysStart && date <= todayEnd;
  });
  
  const monthData = validData.filter(item => {
    const date = parseWarehouseDate(item.warehouseDate);
    return date && date >= monthStart && date <= todayEnd;
  });
  
  // 调试：检查所有有效数据的日期范围
  const allParsedDates = validData
    .map(item => {
      const date = parseWarehouseDate(item.warehouseDate);
      return date ? formatDate(date) : null;
    })
    .filter(d => d !== null)
    .sort();
  
  if (devLog) {
    console.log('📊 日期过滤结果:', {
      todayData: todayData.length,
      weekData: weekData.length,
      monthData: monthData.length,
      todayRange: `${formatDate(todayForCalc)} ~ ${formatDate(todayEnd)}`,
      weekRange: `${formatDate(last7DaysStart)} ~ ${formatDate(todayEnd)}`,
      monthRange: `${formatDate(monthStart)} ~ ${formatDate(todayEnd)}`,
      allDatesRange:
        allParsedDates.length > 0
          ? `${allParsedDates[0]} ~ ${allParsedDates[allParsedDates.length - 1]}`
          : '无有效日期',
      sampleDates: allParsedDates.slice(0, 5),
    });
  }
  
  if (devLog && todayData.length > 0) {
    console.log(
      '💰 今日数据示例:',
      todayData.slice(0, 3).map((item) => ({
        warehouseDate: item.warehouseDate,
        totalPriceIncludingTax: item.totalPriceIncludingTax,
        processed: processCostData(item.totalPriceIncludingTax),
      }))
    );
  }

  if (devLog && weekData.length > 0) {
    console.log(
      '💰 本周数据示例:',
      weekData.slice(0, 3).map((item) => ({
        warehouseDate: item.warehouseDate,
        totalPriceIncludingTax: item.totalPriceIncludingTax,
        processed: processCostData(item.totalPriceIncludingTax),
      }))
    );
  }
  
  // 过滤日期范围用于趋势图（使用查询的日期范围）
  const filteredData = validData.filter(item => {
    const date = parseWarehouseDate(item.warehouseDate);
    if (!date) return false;
    // 过滤日期范围
    if (date < queryStartDate || date > queryEndDate) return false;
    return true;
  });
  
  const todayCost = parseFloat((todayData.reduce(
    (sum, item) => sum + processCostData(item.totalPriceIncludingTax),
    0
  ) / 10000).toFixed(2)); // 转换为万元，保留2位小数
  
  const weekCost = parseFloat((weekData.reduce(
    (sum, item) => sum + processCostData(item.totalPriceIncludingTax),
    0
  ) / 10000).toFixed(2));
  
  const monthCost = parseFloat((monthData.reduce(
    (sum, item) => sum + processCostData(item.totalPriceIncludingTax),
    0
  ) / 10000).toFixed(2));

  const summarizeBaseSelfAndPurchase = (
    rows: Array<{ receiptNo: string | null; totalPriceIncludingTax: any; netWeight: any }>
  ) => {
    let baseSelfCost = 0;
    let baseSelfQty = 0;
    let basePurchaseCost = 0;
    let basePurchaseQty = 0;
    for (const row of rows) {
      const receiptNo = (row.receiptNo || '').toUpperCase();
      const cost = processCostData(row.totalPriceIncludingTax);
      const qty = processCostData(row.netWeight);
      if (receiptNo.startsWith('SH')) {
        baseSelfCost += cost;
        baseSelfQty += qty;
      } else if (receiptNo.startsWith('TH')) {
        basePurchaseCost += cost;
        basePurchaseQty += qty;
      }
    }
    return {
      baseSelfCost: parseFloat((baseSelfCost / 10000).toFixed(2)),
      baseSelfQty: parseFloat(baseSelfQty.toFixed(2)),
      basePurchaseCost: parseFloat((basePurchaseCost / 10000).toFixed(2)),
      basePurchaseQty: parseFloat(basePurchaseQty.toFixed(2)),
    };
  };

  const todaySplit = summarizeBaseSelfAndPurchase(todayData);
  const weekSplit = summarizeBaseSelfAndPurchase(weekData);
  const monthSplit = summarizeBaseSelfAndPurchase(monthData);
  
  // 计算当月平均日成本（从当月1日到当前日期）
  const currentMonthStart = new Date(todayForCalc);
  currentMonthStart.setDate(1); // 当月1号
  currentMonthStart.setHours(0, 0, 0, 0);
  
  const currentMonthData = validData.filter(item => {
    const date = parseWarehouseDate(item.warehouseDate);
    if (!date) return false;
    return date >= currentMonthStart && date <= todayEnd;
  });
  
  const currentMonthTotal = parseFloat((currentMonthData.reduce(
    (sum, item) => sum + processCostData(item.totalPriceIncludingTax),
    0
  ) / 10000).toFixed(2));
  
  // 计算当月已过天数
  const daysInCurrentMonth = Math.max(1, Math.floor((todayEnd.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailyCost = parseFloat((currentMonthTotal / daysInCurrentMonth).toFixed(2));
  
  // 计算日成本趋势（滚动最近30天，trendStartDate 已在查询下界处计算）
  const dailyTrend = calculateDailyCost(
    filteredData,
    trendStartDate,
    todayEnd
  );
  
  // 计算物料类型成本分布（从 PurchaseWarehouse 表的 material 字段分类汇总）
  // 只取当月数据（从当月1日到当前日期）
  const currentMonthStartForCategory = new Date(todayForCalc);
  currentMonthStartForCategory.setDate(1); // 当月1号
  currentMonthStartForCategory.setHours(0, 0, 0, 0);
  const todayForCategory = new Date();
  todayForCategory.setHours(23, 59, 59, 999);
  
  const categoryData = validData.filter(item => {
    const date = parseWarehouseDate(item.warehouseDate);
    if (!date) return false;
    return date >= currentMonthStartForCategory && date <= todayForCategory;
  });
  
  // 分别计算基地收货（SH）和基地买货（TH）的物料类型分布
  const baseSelfData = categoryData.filter(item => {
    const receiptNo = (item.receiptNo || '').toUpperCase();
    return receiptNo.startsWith('SH');
  });
  
  const basePurchaseData = categoryData.filter(item => {
    const receiptNo = (item.receiptNo || '').toUpperCase();
    return receiptNo.startsWith('TH');
  });
  
  const categoryDistributionBaseSelf = calculateCategoryCost(baseSelfData);
  const categoryDistributionBasePurchase = calculateCategoryCost(basePurchaseData);
  
  // 计算上月数据用于成本对比图（lastMonthStart 与查询下界处一致）
  const lastMonthEnd = new Date(todayForCalc);
  lastMonthEnd.setDate(0); // 上个月最后一天
  lastMonthEnd.setHours(23, 59, 59, 999);
  
  const lastMonthData = validData.filter(item => {
    const date = parseWarehouseDate(item.warehouseDate);
    if (!date) return false;
    return date >= lastMonthStart && date <= lastMonthEnd;
  });
  
  // 分别计算上月基地收货（SH）和基地买货（TH）的物料类型分布
  const lastMonthBaseSelfData = lastMonthData.filter(item => {
    const receiptNo = (item.receiptNo || '').toUpperCase();
    return receiptNo.startsWith('SH');
  });
  
  const lastMonthBasePurchaseData = lastMonthData.filter(item => {
    const receiptNo = (item.receiptNo || '').toUpperCase();
    return receiptNo.startsWith('TH');
  });
  
  const lastMonthCategoryDistributionBaseSelf = calculateCategoryCost(lastMonthBaseSelfData);
  const lastMonthCategoryDistributionBasePurchase = calculateCategoryCost(lastMonthBasePurchaseData);
  
  // 计算本周成本构成（按 receiptNo 分类）
  const weekCostBreakdown = calculateWeekCostBreakdown(weekData);
  
  // 确保所有数据都有默认值，避免前端报错
  return {
    summary: {
      todayCost: todayCost || 0,
      weekCost: weekCost || 0,
      monthCost: monthCost || 0,
      avgDailyCost: avgDailyCost || 0,
      todayBaseSelfCost: todaySplit.baseSelfCost,
      todayBaseSelfQty: todaySplit.baseSelfQty,
      todayBasePurchaseCost: todaySplit.basePurchaseCost,
      todayBasePurchaseQty: todaySplit.basePurchaseQty,
      weekBaseSelfCost: weekSplit.baseSelfCost,
      weekBaseSelfQty: weekSplit.baseSelfQty,
      weekBasePurchaseCost: weekSplit.basePurchaseCost,
      weekBasePurchaseQty: weekSplit.basePurchaseQty,
      monthBaseSelfCost: monthSplit.baseSelfCost,
      monthBaseSelfQty: monthSplit.baseSelfQty,
      monthBasePurchaseCost: monthSplit.basePurchaseCost,
      monthBasePurchaseQty: monthSplit.basePurchaseQty,
    },
    weekCostBreakdown: {
      days: weekCostBreakdown.days.length > 0 ? weekCostBreakdown.days : ['周一\n--', '周二\n--', '周三\n--', '周四\n--', '周五\n--', '周六\n--', '周日\n--'],
      baseSelf: weekCostBreakdown.baseSelf.length > 0 ? weekCostBreakdown.baseSelf : [0, 0, 0, 0, 0, 0, 0],
      basePurchase: weekCostBreakdown.basePurchase.length > 0 ? weekCostBreakdown.basePurchase : [0, 0, 0, 0, 0, 0, 0],
      collaboration: weekCostBreakdown.collaboration.length > 0 ? weekCostBreakdown.collaboration : [0, 0, 0, 0, 0, 0, 0],
      dailyCategoryData: weekCostBreakdown.dailyCategoryData || [],
    },
    dailyTrend: {
      dates: dailyTrend.dates.length > 0 ? dailyTrend.dates : [],
      baseSelf: dailyTrend.baseSelf.length > 0 ? dailyTrend.baseSelf : [],
      basePurchase: dailyTrend.basePurchase.length > 0 ? dailyTrend.basePurchase : [],
      collaboration: dailyTrend.collaboration.length > 0 ? dailyTrend.collaboration : [],
      baseSelfQty: dailyTrend.baseSelfQty.length > 0 ? dailyTrend.baseSelfQty : [],
      basePurchaseQty: dailyTrend.basePurchaseQty.length > 0 ? dailyTrend.basePurchaseQty : [],
      collaborationQty: dailyTrend.collaborationQty.length > 0 ? dailyTrend.collaborationQty : [],
    },
    categoryDistributionBaseSelf: {
      categories: categoryDistributionBaseSelf.categories.length > 0 ? categoryDistributionBaseSelf.categories : [],
      costs: categoryDistributionBaseSelf.costs.length > 0 ? categoryDistributionBaseSelf.costs : [],
      percentages: categoryDistributionBaseSelf.percentages.length > 0 ? categoryDistributionBaseSelf.percentages : [],
      avgPrices: categoryDistributionBaseSelf.avgPrices.length > 0 ? categoryDistributionBaseSelf.avgPrices : [],
      quantities: categoryDistributionBaseSelf.quantities.length > 0 ? categoryDistributionBaseSelf.quantities : [],
    },
    categoryDistributionBasePurchase: {
      categories: categoryDistributionBasePurchase.categories.length > 0 ? categoryDistributionBasePurchase.categories : [],
      costs: categoryDistributionBasePurchase.costs.length > 0 ? categoryDistributionBasePurchase.costs : [],
      percentages: categoryDistributionBasePurchase.percentages.length > 0 ? categoryDistributionBasePurchase.percentages : [],
      avgPrices: categoryDistributionBasePurchase.avgPrices.length > 0 ? categoryDistributionBasePurchase.avgPrices : [],
      quantities: categoryDistributionBasePurchase.quantities.length > 0 ? categoryDistributionBasePurchase.quantities : [],
    },
    lastMonthCategoryDistributionBaseSelf: {
      categories: lastMonthCategoryDistributionBaseSelf.categories.length > 0 ? lastMonthCategoryDistributionBaseSelf.categories : [],
      avgPrices: lastMonthCategoryDistributionBaseSelf.avgPrices.length > 0 ? lastMonthCategoryDistributionBaseSelf.avgPrices : [],
    },
    lastMonthCategoryDistributionBasePurchase: {
      categories: lastMonthCategoryDistributionBasePurchase.categories.length > 0 ? lastMonthCategoryDistributionBasePurchase.categories : [],
      avgPrices: lastMonthCategoryDistributionBasePurchase.avgPrices.length > 0 ? lastMonthCategoryDistributionBasePurchase.avgPrices : [],
    },
  };
}

/**
 * 计算本周成本构成（按 receiptNo 分类）
 * SH = 基地自采
 * TH = 基地买货
 * 其他 = 协同业务
 */
function calculateWeekCostBreakdown(
  weekData: Array<{ 
    warehouseDate: string | null; 
    totalPriceIncludingTax: any; 
    receiptNo: string | null;
    material: string | null;
    unitPriceIncludingTax: any;
    netWeight: any;
  }>
): { 
  days: string[]; 
  baseSelf: number[]; 
  basePurchase: number[]; 
  collaboration: number[];
  dailyCategoryData: Array<{
    date: string;
    baseSelfCategories: {
      categories: string[];
      costs: number[];
      avgPrices: number[];
      quantities: number[];
    };
  }>;
} {
  // 最近一周：最近 7 个自然日（避免周一或本周无数据时柱状图为空）
  const todayForCalc = new Date();
  todayForCalc.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayForCalc);
  todayEnd.setHours(23, 59, 59, 999);
  
  const last7DaysStart = new Date(todayForCalc);
  last7DaysStart.setDate(todayForCalc.getDate() - 6);
  last7DaysStart.setHours(0, 0, 0, 0);
  
  const days: string[] = [];
  const dayData: Array<{ baseSelf: number; basePurchase: number; collaboration: number }> = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(last7DaysStart);
    date.setDate(last7DaysStart.getDate() + i);
    days.push(formatDate(date));
    dayData.push({ baseSelf: 0, basePurchase: 0, collaboration: 0 });
  }
  
  // 按日期和 receiptNo 分类汇总，同时收集每日的详细分类数据
  const dailyCategoryMap = new Map<string, Array<{
    material: string | null;
    totalPriceIncludingTax: any;
    unitPriceIncludingTax: any;
    netWeight: any;
  }>>();
  
  for (const item of weekData) {
    const date = parseWarehouseDate(item.warehouseDate);
    if (!date) continue;
    
    // 严格限制：日期不能超过今天
    if (date > todayEnd) continue;
    
    // 找到对应的日期索引
    const dateKey = formatDate(date);
    const dayIndex = days.indexOf(dateKey);
    if (dayIndex === -1) continue;
    
    // 注意：这里不转换为万元，保持原始值（元），最后统一转换
    const cost = processCostData(item.totalPriceIncludingTax);
    
    // 根据 receiptNo 前两个字母分类
    const receiptNo = (item.receiptNo || '').toUpperCase();
    if (receiptNo.startsWith('SH')) {
      dayData[dayIndex].baseSelf += cost;
      // 收集基地收货的详细数据用于分类
      if (!dailyCategoryMap.has(dateKey)) {
        dailyCategoryMap.set(dateKey, []);
      }
      dailyCategoryMap.get(dateKey)!.push({
        material: item.material,
        totalPriceIncludingTax: item.totalPriceIncludingTax,
        unitPriceIncludingTax: item.unitPriceIncludingTax,
        netWeight: item.netWeight,
      });
    } else if (receiptNo.startsWith('TH')) {
      dayData[dayIndex].basePurchase += cost;
    } else {
      dayData[dayIndex].collaboration += cost;
    }
  }
  
  // 计算每日的详细分类数据
  const dailyCategoryData = days.map(dateKey => {
    const dayItems = dailyCategoryMap.get(dateKey) || [];
    const categoryData = calculateCategoryCost(dayItems.map(item => ({
      material: item.material,
      totalPriceIncludingTax: item.totalPriceIncludingTax,
      warehouseDate: dateKey,
      unitPriceIncludingTax: item.unitPriceIncludingTax,
      netWeight: item.netWeight,
    })));
    
    return {
      date: dateKey,
      baseSelfCategories: {
        categories: categoryData.categories,
        costs: categoryData.costs,
        avgPrices: categoryData.avgPrices,
        quantities: categoryData.quantities,
      },
    };
  });
  
  // 格式化日期显示（只显示月-日，最近一周不再用周一~周日避免歧义）
  const finalDays = days.map(date => {
    const parts = date.split('-');
    return `${parts[1]}-${parts[2]}`;
  });
  
  return {
    days: finalDays,
    // 转换为万元，保留2位小数（注意：cost已经是元，这里只需要除以10000一次）
    baseSelf: dayData.map(d => parseFloat((d.baseSelf / 10000).toFixed(2))),
    basePurchase: dayData.map(d => parseFloat((d.basePurchase / 10000).toFixed(2))),
    collaboration: dayData.map(d => parseFloat((d.collaboration / 10000).toFixed(2))),
    dailyCategoryData,
  };
}

