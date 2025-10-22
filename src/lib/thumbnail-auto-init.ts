/**
 * 缩略图自动初始化模块
 * 在应用启动时自动检查并启动缩略图生成服务
 */

// 注意：新数据库中没有缩略图相关表和字段，此功能已禁用
import { thumbnailService } from '@/services/thumbnail-service';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * 检查数据库是否已经设置了缩略图优化
 * 注意：新数据库中没有缩略图相关表和字段，此功能已禁用
 */
async function checkThumbnailOptimization(): Promise<boolean> {
  // 新数据库中没有缩略图相关表和字段，返回 false
  console.log('⚠️ 新数据库中没有缩略图相关表和字段，缩略图功能已禁用');
  return false;
}

/**
 * 自动创建缩略图任务
 * 注意：新数据库中没有缩略图相关字段，此功能已禁用
 */
async function autoCreateThumbnailTasks() {
  // 新数据库中没有缩略图相关字段，跳过创建任务
  console.log('⚠️ 新数据库中没有缩略图相关字段，无法创建缩略图任务');
  return 0;
}

/**
 * 启动缩略图后台处理服务
 */
async function startBackgroundService() {
  try {
    // 启动缩略图服务（每30秒检查一次新任务）
    await thumbnailService.start();
    console.log('🎯 缩略图后台服务已启动');
  } catch (error) {
    console.error('❌ 启动缩略图服务失败:', error);
  }
}

/**
 * 主初始化函数
 */
async function initializeThumbnailSystem(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // 如果正在初始化，返回现有的Promise
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('🚀 开始缩略图系统自动初始化...');

      // 1. 检查数据库优化是否已设置
      const isOptimized = await checkThumbnailOptimization();
      
      if (!isOptimized) {
        console.log('⚠️ 数据库缩略图优化未设置，将使用CDN压缩策略');
        console.log('💡 提示: 执行 database-optimization.sql 以启用数据库缩略图优化');
        return;
      }

      console.log('✅ 数据库缩略图优化已设置');

      // 2. 自动创建缩略图任务
      const taskCount = await autoCreateThumbnailTasks();

      // 3. 启动后台处理服务
      if (taskCount > 0) {
        await startBackgroundService();
      }

      isInitialized = true;
      console.log('🎉 缩略图系统初始化完成');

    } catch (error) {
      console.error('❌ 缩略图系统初始化失败:', error);
      // 初始化失败时不阻止应用启动
    }
  })();

  return initPromise;
}

/**
 * 手动触发缩略图处理（用于API调用）
 */
export async function triggerThumbnailProcessing(): Promise<{
  success: boolean;
  message: string;
  taskCount?: number;
  error?: string;
}> {
  try {
    const isOptimized = await checkThumbnailOptimization();
    
    if (!isOptimized) {
      return {
        success: false,
        message: '数据库缩略图优化未设置，请先执行 database-optimization.sql'
      };
    }

    const taskCount = await autoCreateThumbnailTasks();
    
    if (taskCount === 0) {
      return {
        success: true,
        message: '所有图片缩略图已处理完成',
        taskCount: 0
      };
    }

    // 确保服务正在运行
    if (!isInitialized) {
      await startBackgroundService();
      isInitialized = true;
    }

    return {
      success: true,
      message: `已创建 ${taskCount} 个缩略图任务，后台服务正在处理`,
      taskCount
    };

  } catch (error) {
    return {
      success: false,
      message: '触发缩略图处理失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 获取缩略图处理状态
 */
export async function getThumbnailStatus(): Promise<{
  isOptimized: boolean;
  isServiceRunning: boolean;
  stats?: any;
}> {
  try {
    const isOptimized = await checkThumbnailOptimization();
    const stats = isOptimized ? await thumbnailService.getStats() : null;

    return {
      isOptimized,
      isServiceRunning: isInitialized,
      stats
    };
  } catch (error) {
    console.error('❌ 获取缩略图状态失败:', error);
    return {
      isOptimized: false,
      isServiceRunning: false
    };
  }
}

// 导出主初始化函数
export { initializeThumbnailSystem };

// 在模块加载时自动初始化（可选）
if (process.env.NODE_ENV === 'production') {
  // 在生产环境中自动初始化
  initializeThumbnailSystem().catch(error => {
    console.error('❌ 自动初始化缩略图系统失败:', error);
  });
} 