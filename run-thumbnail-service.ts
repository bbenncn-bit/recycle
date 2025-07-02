#!/usr/bin/env ts-node

/**
 * 缩略图服务独立运行脚本
 * 用于在后台持续运行缩略图生成服务
 */

import { startThumbnailService } from './src/services/thumbnail-service';

async function main() {
  console.log('🎯 启动缩略图生成服务...');
  console.log('   - 服务将每30秒检查一次新任务');
  console.log('   - 使用 Ctrl+C 停止服务\n');
  
  try {
    await startThumbnailService();
    
    // 保持进程运行
    process.on('SIGINT', () => {
      console.log('\n👋 正在停止缩略图服务...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n👋 收到终止信号，停止服务...');
      process.exit(0);
    });
    
    // 防止进程退出
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ 缩略图服务启动失败:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ 服务运行异常:', error);
  process.exit(1);
}); 