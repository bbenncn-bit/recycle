/** 利润分析共享类型（无 Prisma/DB 依赖，客户端可安全 import type） */

export interface ProfitAnalysisSummary {
  todayProfit: number;
  weekProfit: number;
  monthProfit: number;
  todayRevenue: number;
  todayMaterialCost: number;
  todayProcessingCost: number;
}

export interface ProfitAnalysisTrend {
  dates: string[];
  revenue: number[];
  materialCost: number[];
  processingCost: number[];
  profit: number[];
}

export interface ProfitAnalysisWeekBreakdown {
  days: string[];
  revenue: number[];
  materialCost: number[];
  processingCost: number[];
  profit: number[];
}

export interface ProfitSalesDetailRow {
  deliveryNumber: string;
  deliveryDate: string;
  productType: string;
  productDisplayName: string;
  warehouse: string;
  customer: string;
  settlementQuantity: number;
  netWeight: number;
  transitLoss: number;
  revenue: number;
  materialCost: number;
  processingCost: number;
  otherCosts: number;
  otherIncome: number;
  transportCost: number;
  taxCost: number;
  discountCost: number;
  interestCost: number;
  immediateRefund: number;
  governmentSupport: number;
  profit: number;
  profitPerNetTon: number;
  costParamSnapshot?: Record<string, number | boolean | undefined>;
  materialComposition: Array<{ material: string; quantity: number; cost: number }>;
  productionRecords?: Array<{
    id: number;
    productionDate: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    materials?: Array<{ material: string; qty: number; price: number; cost: number }>;
  }>;
}

export interface ProfitAnalysisData {
  summary: ProfitAnalysisSummary;
  dailyTrend: ProfitAnalysisTrend;
  weekBreakdown: ProfitAnalysisWeekBreakdown;
  salesDetails: ProfitSalesDetailRow[];
  productComparison: {
    labels: string[];
    currentMonth: { quantityTons: number[]; avgUnitPriceInclTax: number[] };
    lastMonth: { quantityTons: number[]; avgUnitPriceInclTax: number[] };
  };
  provisional?: boolean;
}
