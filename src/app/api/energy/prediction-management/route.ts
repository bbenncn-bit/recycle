import { NextResponse } from "next/server";
import { prisma } from "@/lib/prismadb";

export async function GET() {
  try {
    // 从数据库获取用能与碳排放预算管理相关数据
    const [comparisonChart, monthlyDetails, summaryCards] = await Promise.all([
      prisma.cBComparisonChart.findMany(),
      prisma.cBMonthlyDetails.findMany(),
      prisma.cBSummaryCards.findMany()
    ]);

    // 模拟能源消耗量预测数据（基于图示样式）
    const predictionData = {
      predictionType: 'short',
      electricityData: {
        actual: [
          { period: '2025-5', value: 1950000 },
          { period: '2025-6', value: 1885658 }
        ],
        predicted: [
          { period: '2025-7', value: 1893245 },
          { period: '2025-8', value: 1956082 },
          { period: '2025-9', value: 1893333 }
        ]
      },
      photovoltaicData: {
        actual: [
          { period: '2025-5', value: 234000 },
          { period: '2025-6', value: 213232 }
        ],
        predicted: [
          { period: '2025-7', value: 192312 },
          { period: '2025-8', value: 231316 },
          { period: '2025-9', value: 223113 }
        ]
      },
      naturalGasData: {
        actual: [
          { period: '2025-5', value: 19800 },
          { period: '2025-6', value: 16342 }
        ],
        predicted: [
          { period: '2025-7', value: 13121 },
          { period: '2025-8', value: 18765 },
          { period: '2025-9', value: 19454 }
        ]
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        comparisonChart: comparisonChart,
        monthlyDetails: monthlyDetails,
        summaryCards: summaryCards,
        ...predictionData
      }
    });
  } catch (error) {
    console.error('❌ 获取能碳预测管理数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}
