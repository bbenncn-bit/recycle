export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 只在服务器端运行
    const { DataSyncScheduler } = await import('./src/lib/services/data-sync-scheduler');
    
    // 启动数据同步定时任务
    // 默认每天凌晨2:00执行，可以通过环境变量配置
    const schedule = process.env.DATA_SYNC_SCHEDULE || '0 2 * * *';
    
    try {
      DataSyncScheduler.start(schedule);
      console.log('✅ 数据同步定时任务已在应用启动时初始化');
    } catch (error) {
      console.error('❌ 初始化数据同步定时任务失败:', error);
    }
  }
}

