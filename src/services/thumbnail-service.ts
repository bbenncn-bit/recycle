// 注意：新数据库中没有缩略图相关表和字段，此功能已禁用
import sharp from 'sharp';

interface ThumbnailTask {
  id: number;
  table_name: string;
  record_id: number;
  original_urls: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class ThumbnailService {
  private isProcessing = false;
  private readonly BATCH_SIZE = 5;
  private readonly MAX_RETRIES = 3;

  /**
   * 开始缩略图生成服务
   */
  async start() {
    console.log('🎯 缩略图生成服务已启动');
    
    // 立即执行一次
    await this.processTasks();
    
    // 每30秒检查一次新任务
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processTasks();
      }
    }, 30000);
  }

  /**
   * 处理待生成的缩略图任务
   */
  private async processTasks() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // 获取待处理任务
      const tasks = await this.getPendingTasks();
      
      if (tasks.length === 0) {
        console.log('📋 暂无待处理的缩略图任务');
        return;
      }

      console.log(`🔄 开始处理 ${tasks.length} 个缩略图任务`);
      
      // 批量处理任务
      for (const task of tasks) {
        await this.processTask(task);
        
        // 防止过度占用资源
        await this.sleep(100);
      }
      
    } catch (error) {
      console.error('❌ 处理缩略图任务失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 获取待处理任务
   * 注意：新数据库中没有 thumbnail_tasks 表，此功能已禁用
   */
  private async getPendingTasks(): Promise<ThumbnailTask[]> {
    // 新数据库中没有 thumbnail_tasks 表，返回空数组
    console.log('⚠️ 新数据库中没有 thumbnail_tasks 表，缩略图功能已禁用');
    return [];
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: ThumbnailTask) {
    try {
      // 标记为处理中
      await this.updateTaskStatus(task.id, 'processing');
      
      console.log(`🖼️  处理任务 ${task.id}: ${task.table_name}#${task.record_id}`);
      
      // 获取第一张图片URL
      const firstImageUrl = this.getFirstImageUrl(task.original_urls);
      if (!firstImageUrl) {
        throw new Error('未找到有效的图片URL');
      }

      // 生成三种尺寸的缩略图
      const thumbnails = await this.generateThumbnails(firstImageUrl);
      
      // 保存到数据库
      await this.saveThumbnails(task.table_name, task.record_id, thumbnails);
      
      // 标记为完成
      await this.updateTaskStatus(task.id, 'completed');
      
      console.log(`✅ 任务 ${task.id} 处理完成`);
      
    } catch (error) {
      console.error(`❌ 任务 ${task.id} 处理失败:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.updateTaskStatus(task.id, 'failed', errorMessage);
    }
  }

  /**
   * 从URL数组中获取第一个有效URL
   */
  private getFirstImageUrl(urls: string[]): string | null {
    if (!Array.isArray(urls) || urls.length === 0) return null;
    
    return urls[0] || null;
  }

  /**
   * 生成多尺寸缩略图
   */
  private async generateThumbnails(imageUrl: string) {
    console.log(`📥 下载图片: ${imageUrl}`);
    
    // 下载原图
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`图片下载失败: ${response.status}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // 使用 Sharp 生成三种尺寸的缩略图
    const [tinyBuffer, smallBuffer, mediumBuffer] = await Promise.all([
      // 2% 极小缩略图 (48x48, 质量10%)
      sharp(imageBuffer)
        .resize(48, 48, { fit: 'cover' })
        .jpeg({ quality: 10 })
        .toBuffer(),
      
      // 5% 小缩略图 (80x80, 质量25%)  
      sharp(imageBuffer)
        .resize(80, 80, { fit: 'cover' })
        .jpeg({ quality: 25 })
        .toBuffer(),
      
      // 15% 中等缩略图 (120x120, 质量40%)
      sharp(imageBuffer)
        .resize(120, 120, { fit: 'cover' })
        .jpeg({ quality: 40 })
        .toBuffer()
    ]);

    // 转换为 Base64（针对极小图）或上传到CDN（针对较大图）
    return {
      tiny: `data:image/jpeg;base64,${tinyBuffer.toString('base64')}`, // Base64内嵌
      small: await this.uploadToCDN(smallBuffer, 'small'), // 上传到CDN
      medium: await this.uploadToCDN(mediumBuffer, 'medium') // 上传到CDN
    };
  }

  /**
   * 上传缩略图到CDN（模拟实现，需要根据实际CDN配置）
   */
  private async uploadToCDN(buffer: Buffer, size: 'small' | 'medium'): Promise<string> {
    // 这里需要根据实际的CDN服务实现
    // 示例：上传到阿里云OSS、腾讯云COS等
    
    // 临时方案：将图片转换为base64 data URL
    // 生产环境应该上传到CDN并返回URL
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
    
    // 真实CDN上传示例：
    /*
    const fileName = `thumbnails/${size}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const uploadResult = await ossClient.put(fileName, buffer);
    return uploadResult.url;
    */
  }

  /**
   * 保存缩略图到数据库
   * 注意：新数据库中没有缩略图字段，此功能已禁用
   */
  private async saveThumbnails(tableName: string, recordId: number, thumbnails: any) {
    // 新数据库中没有缩略图字段，跳过保存
    console.log(`⚠️ 新数据库中没有缩略图字段，无法保存缩略图到 ${tableName}#${recordId}`);
  }

  /**
   * 更新任务状态
   * 注意：新数据库中没有 thumbnail_tasks 表，此功能已禁用
   */
  private async updateTaskStatus(taskId: number, status: string, errorMessage?: string) {
    // 新数据库中没有 thumbnail_tasks 表，跳过更新
    console.log(`⚠️ 新数据库中没有 thumbnail_tasks 表，无法更新任务状态`);
  }

  /**
   * 为新记录创建缩略图任务
   * 注意：新数据库中没有 thumbnail_tasks 表，此功能已禁用
   */
  async createThumbnailTask(tableName: string, recordId: number, imgUrls: string[]) {
    // 新数据库中没有 thumbnail_tasks 表，跳过创建任务
    console.log(`⚠️ 新数据库中没有 thumbnail_tasks 表，无法创建缩略图任务: ${tableName}#${recordId}`);
  }

  /**
   * 批量创建历史数据的缩略图任务
   * 注意：新数据库中没有 thumbnail_tasks 表，此功能已禁用
   */
  async createBatchTasks() {
    // 新数据库中没有 thumbnail_tasks 表，跳过批量创建
    console.log('⚠️ 新数据库中没有 thumbnail_tasks 表，无法创建批量缩略图任务');
  }

  /**
   * 获取处理统计
   * 注意：新数据库中没有 thumbnail_tasks 表，此功能已禁用
   */
  async getStats() {
    // 新数据库中没有 thumbnail_tasks 表，返回空统计
    console.log('⚠️ 新数据库中没有 thumbnail_tasks 表，无法获取缩略图统计');
    return [];
  }

  /**
   * 工具方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
export const thumbnailService = new ThumbnailService();

// 启动服务（在应用启动时调用）
export async function startThumbnailService() {
  await thumbnailService.start();
}

// 导出类型
export type { ThumbnailTask }; 