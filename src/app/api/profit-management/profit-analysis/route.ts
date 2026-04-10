import { NextResponse } from 'next/server';
import { getProfitAnalysisData } from '@/lib/services/profit-analysis-service';

// 设置较长的超时时间（5分钟）
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) {
      startDate = new Date(startDateStr);
    }

    if (endDateStr) {
      endDate = new Date(endDateStr);
    }

    console.log('开始获取利润分析数据...');
    const startTime = Date.now();
    
    const data = await getProfitAnalysisData(startDate, endDate);
    
    const endTime = Date.now();
    console.log(`利润分析数据获取完成，耗时: ${(endTime - startTime) / 1000}秒`);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取利润分析数据失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取利润分析数据失败';
    
    // 返回更详细的错误信息
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
