import { NextResponse } from "next/server";
import { prisma } from "@/lib/prismadb";

export async function GET() {
  try {
    // 从数据库获取碳资产管理相关数据
    const [caHoldings, caMarketCards, caPieChart, caPriceChart] = await Promise.all([
      prisma.cAHoldings.findMany(),
      prisma.cAMarketCards.findMany(),
      prisma.cAPieChart.findMany(),
      prisma.cAPriceChart.findMany()
    ]);

    // 模拟碳资产管理数据（基于图示样式）
    const carbonAssetData = {
      totalAssets: {
        quantity: {
          total: 7700000,
          allowance: 7500000,
          ccer: 200000
        },
        value: {
          total: 529226000,
          allowance: 510000000,
          ccer: 19226000
        }
      },
      allowanceStats: {
        total: 7500000,
        latestPrice: 68.00,
        priceUpdateTime: '2025-06-04',
        issued: 8000000,
        bought: 500000,
        sold: 1000000,
        compliance: 0
      },
      ccerStats: {
        total: 200000,
        latestPrice: 96.13,
        priceUpdateTime: '2025-04-30',
        previousYearBalance: 100000,
        bought: 230000,
        sold: 40000,
        issued: 10000,
        offset: 100000
      },
      priceChart: {
        dates: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'],
        prices: [65.5, 66.2, 67.8, 68.5, 67.9, 68.0],
        volumes: [1200000, 1350000, 1420000, 1380000, 1450000, 1500000]
      },
      holdings: [
        { id: 1, asset: '配额总量', quantity: 7500000, value: 510000000, status: '持有' },
        { id: 2, asset: 'CCER', quantity: 200000, value: 19226000, status: '持有' },
        { id: 3, asset: '配额买入', quantity: 500000, value: 34000000, status: '交易中' },
        { id: 4, asset: '配额卖出', quantity: 1000000, value: 68000000, status: '已售出' }
      ]
    };

    return NextResponse.json({
      success: true,
      data: {
        caHoldings: caHoldings,
        caMarketCards: caMarketCards,
        caPieChart: caPieChart,
        caPriceChart: caPriceChart,
        ...carbonAssetData
      }
    });
  } catch (error) {
    console.error('❌ 获取碳资产管理数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}
