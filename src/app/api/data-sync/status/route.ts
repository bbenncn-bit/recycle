import { NextResponse } from "next/server";
import { DataSyncScheduler } from "@/lib/services/data-sync-scheduler";

/**
 * 获取数据同步状态
 */
export async function GET() {
  try {
    const status = DataSyncScheduler.getStatus();
    
    return NextResponse.json({
      success: true,
      status: {
        isRunning: status.isRunning,
        isScheduled: status.isScheduled,
        initialized: status.initialized,
        pythonScriptExists: status.pythonScriptExists,
        pythonScriptPath: status.pythonScriptPath,
      },
      message: status.initialized 
        ? "数据同步定时任务已启动" 
        : "数据同步定时任务未初始化",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取状态失败",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

