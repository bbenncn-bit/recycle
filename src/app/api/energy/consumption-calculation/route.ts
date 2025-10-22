import { NextResponse } from "next/server";
import { EnergyCalculationService } from "@/lib/services/energy-service";

export async function GET() {
  try {
    const [budgetComparison, monthlyDetails, summaryCards] = await Promise.all([
      EnergyCalculationService.getBudgetComparison(),
      EnergyCalculationService.getMonthlyDetails(),
      EnergyCalculationService.getSummaryCards()
    ]);

    // 模拟能源消费量计算数据（基于图示样式）
    const energyConsumptionData = {
      timeInterval: 'day',
      startDate: '2025-06-01',
      endDate: '2025-06-10',
      energyTypes: [
        {
          id: 1,
          name: '电 (kWh)',
          originalValue: 655016.00,
          energyConsumption: 416459.17,
          percentage: 69.67,
          conversionFactor: 0.1229,
          unit: 'kWh'
        },
        {
          id: 2,
          name: '煤 (t)',
          originalValue: 0,
          energyConsumption: 0,
          percentage: 0,
          conversionFactor: 714.3,
          unit: 't'
        },
        {
          id: 3,
          name: '柴油 (kg)',
          originalValue: 120000.00,
          energyConsumption: 174000.00,
          percentage: 29.11,
          conversionFactor: 1.2094,
          unit: 'kg'
        },
        {
          id: 4,
          name: '汽油 (L)',
          originalValue: 0,
          energyConsumption: 0,
          percentage: 0,
          conversionFactor: 1.0999,
          unit: 'L'
        },
        {
          id: 5,
          name: '天然气 (m³)',
          originalValue: 6609.68,
          energyConsumption: 7270.65,
          percentage: 1.22,
          conversionFactor: 1.215,
          unit: 'm³'
        },
        {
          id: 6,
          name: '液化石油气 (kg)',
          originalValue: 0,
          energyConsumption: 0,
          percentage: 0,
          conversionFactor: 1.7143,
          unit: 'kg'
        },
        {
          id: 7,
          name: '热力 (GJ)',
          originalValue: 0,
          energyConsumption: 0,
          percentage: 0,
          conversionFactor: 0.0341,
          unit: 'GJ'
        },
        {
          id: 8,
          name: '其它 (kgce)',
          originalValue: 0,
          energyConsumption: 0,
          percentage: 0,
          conversionFactor: 1,
          unit: 'kgce'
        },
        {
          id: 9,
          name: '水 (m³)',
          originalValue: 12503.00,
          energyConsumption: 0,
          percentage: 0,
          conversionFactor: 0,
          unit: 'm³'
        }
      ],
      totalConsumption: 597729.82,
      chartData: {
        categories: ['电', '柴油', '天然气', '煤', '汽油', '液化石油气', '热力', '其它'],
        values: [416459.17, 174000.00, 7270.65, 0, 0, 0, 0, 0],
        percentages: [69.67, 29.11, 1.22, 0, 0, 0, 0, 0]
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        budgetComparison: budgetComparison,
        monthlyDetails: monthlyDetails,
        summaryCards: summaryCards,
        ...energyConsumptionData
      }
    });
  } catch (error) {
    console.error('❌ 获取能源消费量计算数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}
