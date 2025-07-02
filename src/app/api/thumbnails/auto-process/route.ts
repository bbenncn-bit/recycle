import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { thumbnailService } from '@/services/thumbnail-service';

/**
 * 自动缩略图处理API
 * 可以通过以下方式调用：
 * 1. 应用启动时自动调用
 * 2. 定时任务（cron job）
 * 3. 手动API调用
 */

export async function POST(request: NextRequest) {
  try {
    // 检查是否有新的图片需要处理
    const [unprocessedCount] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM receiptfg WHERE thumbnailProcessed = 0 AND imgUrls IS NOT NULL) +
        (SELECT COUNT(*) FROM receiptfc WHERE thumbnailProcessed = 0 AND imgUrls IS NOT NULL) as total
    `);

    const needsProcessing = (unprocessedCount as any[])[0]?.total || 0;

    if (needsProcessing === 0) {
      return NextResponse.json({
        success: true,
        message: '所有图片缩略图已处理完成',
        needsProcessing: 0
      });
    }

    // 为未处理的记录创建缩略图任务
    await thumbnailService.createBatchTasks();

    // 获取待处理任务统计
    const stats = await thumbnailService.getStats();

    return NextResponse.json({
      success: true,
      message: `发现${needsProcessing}个需要处理的图片，已创建缩略图任务`,
      needsProcessing,
      taskStats: stats
    });

  } catch (error) {
    console.error('❌ 自动缩略图处理失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // 获取缩略图处理统计信息
    const [overallStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM receiptfg WHERE thumbnailProcessed = 1) as fg_processed,
        (SELECT COUNT(*) FROM receiptfg WHERE thumbnailProcessed = 0 AND imgUrls IS NOT NULL) as fg_pending,
        (SELECT COUNT(*) FROM receiptfc WHERE thumbnailProcessed = 1) as fc_processed,
        (SELECT COUNT(*) FROM receiptfc WHERE thumbnailProcessed = 0 AND imgUrls IS NOT NULL) as fc_pending
    `);

    const taskStats = await thumbnailService.getStats();

    const stats = (overallStats as any[])[0];

    return NextResponse.json({
      success: true,
      data: {
        receiptfg: {
          processed: stats.fg_processed,
          pending: stats.fg_pending
        },
        receiptfc: {
          processed: stats.fc_processed,
          pending: stats.fc_pending
        },
        tasks: taskStats,
        totalProcessed: stats.fg_processed + stats.fc_processed,
        totalPending: stats.fg_pending + stats.fc_pending
      }
    });

  } catch (error) {
    console.error('❌ 获取缩略图统计失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 