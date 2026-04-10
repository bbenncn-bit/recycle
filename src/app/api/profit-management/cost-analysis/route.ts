import { NextResponse } from "next/server";
import { getCostAnalysisData } from "@/lib/services/profit-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
    }
    
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // 严格从数据库取数，不使用模拟数据
    const data = await getCostAnalysisData(startDate, endDate);
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('❌ 获取成本分析数据失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取数据失败';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('错误详情:', { errorMessage, errorStack });
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}


