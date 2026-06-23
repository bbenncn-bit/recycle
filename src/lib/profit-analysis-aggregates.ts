import { formatDate, parseWarehouseDate } from '@/lib/warehouse-date';
import type {
  ProfitAnalysisData,
  ProfitSalesDetailRow,
} from '@/lib/profit-analysis-types';

export type ProfitSalesDetail = ProfitSalesDetailRow;

function parseDeliveryDate(dateStr: string | null): Date | null {
  return parseWarehouseDate(dateStr);
}

/** 由已加载的销售明细汇总卡片与图表（纯函数，客户端可安全调用） */
export function buildProfitAggregatesFromSalesDetails(
  salesDetails: ProfitSalesDetail[]
): Pick<ProfitAnalysisData, 'summary' | 'dailyTrend' | 'weekBreakdown'> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayForCalc = new Date();
  todayForCalc.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayForCalc);
  todayEnd.setHours(23, 59, 59, 999);

  let maxDeliveryDate: Date | null = null;
  for (const sale of salesDetails) {
    const d = parseDeliveryDate(sale.deliveryDate);
    if (d && (!maxDeliveryDate || d > maxDeliveryDate)) maxDeliveryDate = d;
  }
  const last7DaysEnd = maxDeliveryDate ? new Date(maxDeliveryDate) : new Date(todayForCalc);
  last7DaysEnd.setHours(23, 59, 59, 999);
  const last7DaysStart = new Date(last7DaysEnd);
  last7DaysStart.setDate(last7DaysEnd.getDate() - 5);
  last7DaysStart.setHours(0, 0, 0, 0);
  const last7DaysEndPlus1 = new Date(last7DaysEnd);
  last7DaysEndPlus1.setDate(last7DaysEnd.getDate() + 1);
  last7DaysEndPlus1.setHours(23, 59, 59, 999);

  const monthStart = new Date(todayForCalc);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todaySales = salesDetails.filter((sale) => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= todayForCalc && date <= todayEnd;
  });

  const weekSales = salesDetails.filter((sale) => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= last7DaysStart && date <= last7DaysEndPlus1;
  });

  const monthSales = salesDetails.filter((sale) => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= monthStart && date <= todayEnd;
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.revenue, 0) / 10000;
  const todayMaterialCost = todaySales.reduce((sum, s) => sum + s.materialCost, 0) / 10000;
  const todayProcessingCost = todaySales.reduce((sum, s) => sum + s.processingCost, 0) / 10000;
  const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0) / 10000;
  const weekProfit = weekSales.reduce((sum, s) => sum + s.profit, 0) / 10000;
  const monthProfit = monthSales.reduce((sum, s) => sum + s.profit, 0) / 10000;

  const dailyTrendMap = new Map<
    string,
    { revenue: number; materialCost: number; processingCost: number; profit: number }
  >();
  const trendStartDate = new Date(today);
  trendStartDate.setDate(trendStartDate.getDate() - 30);
  trendStartDate.setHours(0, 0, 0, 0);

  const trendSales = salesDetails.filter((sale) => {
    const date = parseDeliveryDate(sale.deliveryDate);
    return date && date >= trendStartDate && date <= today;
  });

  for (const sale of trendSales) {
    const date = parseDeliveryDate(sale.deliveryDate);
    if (!date) continue;
    const dateKey = formatDate(date);
    const existing = dailyTrendMap.get(dateKey) || {
      revenue: 0,
      materialCost: 0,
      processingCost: 0,
      profit: 0,
    };
    dailyTrendMap.set(dateKey, {
      revenue: existing.revenue + sale.revenue / 10000,
      materialCost: existing.materialCost + sale.materialCost / 10000,
      processingCost: existing.processingCost + sale.processingCost / 10000,
      profit: existing.profit + sale.profit / 10000,
    });
  }

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
    revenue: dailyTrendDates.map((d) => dailyTrendMap.get(d)!.revenue),
    materialCost: dailyTrendDates.map((d) => dailyTrendMap.get(d)!.materialCost),
    processingCost: dailyTrendDates.map((d) => dailyTrendMap.get(d)!.processingCost),
    profit: dailyTrendDates.map((d) => dailyTrendMap.get(d)!.profit),
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
    revenue: last7DaysKeys.map((k) => weekDataByDate.get(k)!.revenue),
    materialCost: last7DaysKeys.map((k) => weekDataByDate.get(k)!.materialCost),
    processingCost: last7DaysKeys.map((k) => weekDataByDate.get(k)!.processingCost),
    profit: last7DaysKeys.map((k) => weekDataByDate.get(k)!.profit),
  };

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
  };
}

export function profitSaleMonthKey(deliveryDate: string | null | undefined): string {
  const d = parseDeliveryDate(deliveryDate ?? null);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
