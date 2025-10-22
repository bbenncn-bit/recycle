import { NextResponse } from "next/server";
import { EnergyEfficiencyService } from "@/lib/services/energy-service";

export async function GET() {
  try {
    const [benchmarkCards, gaugeMetrics, rankingList, trendData] = await Promise.all([
      EnergyEfficiencyService.getBenchmarkRankCards(),
      EnergyEfficiencyService.getGaugeMetrics(),
      EnergyEfficiencyService.getRankingList(),
      EnergyEfficiencyService.getTrendChartData()
    ]);

    // 模拟能效对标数据（基于图示样式）
    const benchmarkData = {
      indicatorName: '单位面积电耗',
      managementLevel: '二级区域',
      timeInterval: 'month',
      startDate: '2025-01',
      endDate: '2025-06',
      rankCards: [
        {
          id: 1,
          rank: 1,
          name: '2号厂区',
          efficiency: 9.5,
          unit: 'kWh',
          trend: '+3'
        }
      ],
      complianceRate: {
        rate: 88,
        compliant: 88,
        nonCompliant: 12,
        monthOverMonth: 16.46
      },
      rankingList: [
        {
          id: 1,
          enterprise: '2号厂区',
          rank: 1,
          efficiency: 9.5,
          benchmark: 10.0,
          delta: 0.5,
          status: '合格'
        },
        {
          id: 2,
          enterprise: '办公楼',
          rank: 2,
          efficiency: 12.3,
          benchmark: 10.0,
          delta: -2.3,
          status: '不合格'
        },
        {
          id: 3,
          enterprise: '配电房',
          rank: 3,
          efficiency: 15.8,
          benchmark: 10.0,
          delta: -5.8,
          status: '不合格'
        },
        {
          id: 4,
          enterprise: '生产车间',
          rank: 4,
          efficiency: 18.2,
          benchmark: 10.0,
          delta: -8.2,
          status: '不合格'
        },
        {
          id: 5,
          enterprise: '仓库',
          rank: 5,
          efficiency: 22.1,
          benchmark: 10.0,
          delta: -12.1,
          status: '不合格'
        }
      ],
      trendData: [
        { month: '2025-01', value: 25.46, benchmark: 10.0 },
        { month: '2025-02', value: 22.3, benchmark: 10.0 },
        { month: '2025-03', value: 18.7, benchmark: 10.0 },
        { month: '2025-04', value: 15.2, benchmark: 10.0 },
        { month: '2025-05', value: 12.8, benchmark: 10.0 },
        { month: '2025-06', value: 9.5, benchmark: 10.0 }
      ],
      detailedData: [
        { id: 1, date: '2025-01', efficiency: 25.46 },
        { id: 2, date: '2025-02', efficiency: 22.3 },
        { id: 3, date: '2025-03', efficiency: 18.7 },
        { id: 4, date: '2025-04', efficiency: 15.2 },
        { id: 5, date: '2025-05', efficiency: 12.8 },
        { id: 6, date: '2025-06', efficiency: 9.5 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: {
        benchmarkCards: benchmarkCards,
        gaugeMetrics: gaugeMetrics,
        rankingList: rankingList,
        trendData: trendData,
        ...benchmarkData
      }
    });
  } catch (error) {
    console.error('❌ 获取能效对标数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}
