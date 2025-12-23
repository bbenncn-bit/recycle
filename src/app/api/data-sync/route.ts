import { NextResponse } from "next/server";
import { DataSyncScheduler } from "@/lib/services/data-sync-scheduler";

/**
 * 数据同步 API 端点
 * 手动触发数据同步，或由定时任务调用
 */
export async function POST(request: Request) {
  try {
    // 检查是否有授权（可选：添加 API Key 验证）
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.DATA_SYNC_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        {
          success: false,
          error: "未授权访问",
        },
        { status: 401 }
      );
    }

    console.log("🔄 手动触发数据同步任务...");
    
    // 使用调度器的手动触发方法
    await DataSyncScheduler.triggerSync();

    return NextResponse.json({
      success: true,
      message: "数据同步成功",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ 数据同步失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "数据同步失败",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET 方法：获取同步状态
 */
export async function GET() {
  const status = DataSyncScheduler.getStatus();
  
  return NextResponse.json({
    message: "数据同步 API",
    endpoints: {
      POST: "触发数据同步",
      GET: "获取同步状态",
    },
    status: {
      isRunning: status.isRunning,
      isScheduled: status.isScheduled,
      initialized: status.initialized,
      pythonScriptExists: status.pythonScriptExists,
      pythonScriptPath: status.pythonScriptPath,
    },
    timestamp: new Date().toISOString(),
  });
}


