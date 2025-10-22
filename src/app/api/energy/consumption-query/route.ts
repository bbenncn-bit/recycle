import { NextResponse } from "next/server";
import { EnergyConsumptionService } from "@/lib/services/energy-service";

export async function GET() {
  try {
    const [trendData, monthSummary, typeComparison] = await Promise.all([
      EnergyConsumptionService.getConsumptionTrend(),
      EnergyConsumptionService.getMonthSummary(),
      EnergyConsumptionService.getTypeComparison()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        trend: trendData,
        monthSummary: monthSummary,
        typeComparison: typeComparison
      }
    });
  } catch (error) {
    console.error('❌ 获取能耗查询数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}
