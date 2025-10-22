import { NextResponse } from "next/server";
import { prisma } from "@/lib/prismadb";

export async function GET() {
  try {
    // 从数据库获取能效平衡与优化相关数据
    const [paramCards, pieChart, results, trendChart] = await Promise.all([
      prisma.eBParamCards.findMany(),
      prisma.eBPieChart.findMany(),
      prisma.eBResults.findMany(),
      prisma.eBTrendChart.findMany()
    ]);

    // 模拟能效运行参数数据（基于图示样式）
    const balanceOptimizationData = {
      timeInterval: 'day',
      startDate: '2025-06-10',
      endDate: '2025-06-10',
      kpiCards: [
        {
          id: 1,
          title: '能源消费趋势',
          todayValue: '59230.22',
          todayUnit: 'kgce',
          yearValue: '10759.13',
          yearUnit: 'tce',
          trend: 'up'
        },
        {
          id: 2,
          title: '光伏发电量',
          todayValue: '2388.23',
          todayUnit: 'kWh',
          yearValue: '432000.12',
          yearUnit: 'kWh',
          trend: 'up'
        },
        {
          id: 3,
          title: '平衡差额(一级与二级)',
          todayValue: '332.12',
          todayUnit: 'kWh',
          yearValue: '3',
          yearUnit: '%',
          trend: 'down'
        },
        {
          id: 4,
          title: '重点设施设备能耗总量',
          todayValue: '47384.12',
          todayUnit: 'kgce',
          yearValue: '8607.23',
          yearUnit: 'tce',
          trend: 'up'
        },
        {
          id: 5,
          title: '工序运行能耗总量',
          todayValue: '33168.25',
          todayUnit: 'kgce',
          yearValue: '6532.12',
          yearUnit: 'tce',
          trend: 'up'
        }
      ],
      energyConsumptionData: {
        categories: ['02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'],
        electricity: [800, 1200, 1800, 2800, 3200, 3000, 2800, 2600, 2400, 2200, 1800, 1000],
        heat: [200, 300, 400, 500, 600, 550, 500, 450, 400, 350, 300, 250],
        naturalGas: [100, 150, 200, 250, 300, 280, 260, 240, 220, 200, 180, 150]
      },
      photovoltaicData: {
        time: ['02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'],
        generation: [0, 0, 20, 80, 150, 200, 220, 200, 150, 80, 20, 0]
      },
      balanceDifferenceData: {
        time: ['02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'],
        difference: [50, 80, 120, 200, 280, 320, 300, 250, 200, 150, 100, 60]
      },
      facilityEquipmentData: {
        equipment: ['打包机', '空调机组', '送风机', '排风机', '水泵', '照明系统', '其他设备'],
        consumption: [12000, 8000, 6000, 4000, 3000, 2000, 1000]
      },
      processOperationData: {
        process: ['下料', '粗加工', '拆解抓机1', '抓机1', '打包机1', '打包机2', '精加工', '拆解抓机2', '电梯', '磅房', '检验'],
        percentage: [34.45, 28.58, 1.69, 2.55, 5.12, 8.23, 6.78, 4.56, 3.21, 2.34, 2.89],
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280', '#14B8A6']
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        paramCards: paramCards,
        pieChart: pieChart,
        results: results,
        trendChart: trendChart,
        ...balanceOptimizationData
      }
    });
  } catch (error) {
    console.error('❌ 获取能效平衡与优化数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}