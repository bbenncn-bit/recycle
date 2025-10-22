import { NextRequest, NextResponse } from 'next/server';
import { thumbnailService } from '@/services/thumbnail-service';

/**
 * 自动缩略图处理API
 * 注意：新数据库中没有缩略图相关字段，此功能已禁用
 */

export async function POST(request: NextRequest) {
  try {
    // 新数据库中没有缩略图相关字段，返回禁用信息
    return NextResponse.json({
      success: false,
      message: '新数据库中没有缩略图相关字段，缩略图功能已禁用',
      needsProcessing: 0
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
    // 新数据库中没有缩略图相关字段，返回禁用信息
    return NextResponse.json({
      success: false,
      message: '新数据库中没有缩略图相关字段，缩略图功能已禁用',
      data: {
        receiptfg: {
          processed: 0,
          pending: 0
        },
        receiptfc: {
          processed: 0,
          pending: 0
        },
        tasks: [],
        totalProcessed: 0,
        totalPending: 0
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