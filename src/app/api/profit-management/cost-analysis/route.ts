import { NextResponse } from "next/server";
import { getCostAnalysisData } from "@/lib/services/profit-service";

/** 解析 YYYY-MM-DD 为本地日历日，失败返回 undefined */
function parseLocalYmd(ymd: string | null): Date | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

/** 校验：所选日须在本自然月内且不大于今天 */
function normalizeCostDay(costDay: Date | undefined): Date | undefined {
  if (!costDay) return undefined;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  todayEnd.setHours(23, 59, 59, 999);
  if (costDay < monthStart || costDay > todayEnd) return undefined;
  return costDay;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phaseParam = searchParams.get('phase');
    const phase = phaseParam === 'quick' ? 'quick' : 'full';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const costDayRaw = searchParams.get("costDay");
    
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

    const parsedCostDay = parseLocalYmd(costDayRaw);
    const costSnapshotDay = normalizeCostDay(parsedCostDay);
    
    // 严格从数据库取数，不使用模拟数据
    const data = await getCostAnalysisData(startDate, endDate, phase, costSnapshotDay);
    
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


