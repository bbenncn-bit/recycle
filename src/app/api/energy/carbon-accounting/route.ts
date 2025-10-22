import { NextResponse } from "next/server";
import { prisma } from "@/lib/prismadb";

export async function GET() {
  try {
    // 从数据库获取碳足迹及排放核算相关数据
    const [cfDetails, cfPieChart, cfTrendChart] = await Promise.all([
      prisma.cFDetails.findMany(),
      prisma.cFPieChart.findMany(),
      prisma.cFTrendChart.findMany()
    ]);

    // 模拟碳排放核算数据（基于图示样式）
    const carbonAccountingData = {
      year: '2025年',
      standard: 'GB/T 32150',
      annualStats: {
        netEmissions: {
          value: 13897.8659,
          unit: 'tCO₂e',
          change: 0,
          trend: 'stable'
        },
        energyConsumption: {
          value: 5950.7096,
          unit: 'tce',
          change: 0,
          trend: 'stable'
        }
      },
      monthlyEmissions: {
        months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        fuelCombustion: [400, 350, 420, 380, 450, 400, 480, 460, 420, 400, 380, 350],
        purchasedElectricity: [300, 280, 320, 300, 350, 320, 380, 360, 330, 310, 290, 270],
        processEmissions: [200, 180, 220, 200, 240, 220, 260, 250, 230, 210, 190, 180],
        energyConsumption: [450, 410, 480, 440, 520, 470, 550, 530, 490, 460, 430, 400]
      },
      carbonFlow: {
        nodes: [
          { id: 'company', name: '江苏大博智能电气有限公司', value: 1000, level: 0 },
          { id: 'fuel', name: '化石燃料燃烧排放', value: 500, level: 1 },
          { id: 'purchased', name: '净购入电力和热力排放', value: 500, level: 1 },
          { id: 'naturalGas', name: '天然气', value: 200, level: 2 },
          { id: 'electricity', name: '净购入电力', value: 300, level: 2 },
          { id: 'coal', name: '燃煤', value: 150, level: 2 },
          { id: 'diesel', name: '柴油', value: 100, level: 2 },
          { id: 'steam', name: '蒸汽', value: 50, level: 2 }
        ],
        links: [
          { source: 'company', target: 'fuel', value: 500 },
          { source: 'company', target: 'purchased', value: 500 },
          { source: 'fuel', target: 'naturalGas', value: 200 },
          { source: 'fuel', target: 'coal', value: 150 },
          { source: 'fuel', target: 'diesel', value: 100 },
          { source: 'fuel', target: 'steam', value: 50 },
          { source: 'purchased', target: 'electricity', value: 300 }
        ]
      },
      emissionReduction: {
        categories: ['自发电', '外购绿电(购电协议)', '碳证'],
        quantity: [40000, 0, 180000],
        equivalentReduction: [35000, 0, 90000]
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        cfDetails: cfDetails,
        cfPieChart: cfPieChart,
        cfTrendChart: cfTrendChart,
        ...carbonAccountingData
      }
    });
  } catch (error) {
    console.error('❌ 获取碳排放核算数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}