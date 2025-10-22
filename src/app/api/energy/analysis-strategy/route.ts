import { NextResponse } from "next/server";
import { EnergyAnalysisService } from "@/lib/services/energy-service";

export async function GET() {
  try {
    const strategies = await EnergyAnalysisService.getStrategies();
    
    // 模拟能源成本数据（基于图示样式）
    const energyCostData = {
      totalCost: 1268958.17,
      energyBreakdown: {
        water: { cost: 31452, percentage: 2.48 },
        electricity: { cost: 416459.17, percentage: 32.82 },
        coal: { cost: 0, percentage: 0 },
        diesel: { cost: 798350, percentage: 62.91 },
        heating: { cost: 0, percentage: 0 },
        naturalGas: { cost: 22697, percentage: 1.79 },
        other: { cost: 0, percentage: 0 }
      },
      monthlyData: [
        { month: '2025-01', electricity: 83000, water: 11232, naturalGas: 5622, diesel: 213333 },
        { month: '2025-02', electricity: 85000, water: 12000, naturalGas: 5800, diesel: 220000 },
        { month: '2025-03', electricity: 82000, water: 11000, naturalGas: 5500, diesel: 200000 },
        { month: '2025-04', electricity: 78000, water: 10500, naturalGas: 5200, diesel: 180000 },
        { month: '2025-05', electricity: 80000, water: 10800, naturalGas: 5400, diesel: 190000 },
        { month: '2025-06', electricity: 75000, water: 10000, naturalGas: 5000, diesel: 170000 }
      ],
      peakValleyUsage: {
        deepValley: 14.76,
        valley: 13.85,
        peak: 25.38,
        flat: 17.64,
        sharp: 28.37
      },
      peakValleyCost: {
        deepValley: 15,
        valley: 25,
        peak: 20,
        flat: 10,
        sharp: 30
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        strategies: strategies,
        ...energyCostData
      }
    });
  } catch (error) {
    console.error('❌ 获取能源分析与策略数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}
