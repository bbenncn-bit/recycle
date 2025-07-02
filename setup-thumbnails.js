/**
 * 缩略图系统设置脚本
 * 用于一键设置数据库和启动缩略图生成服务
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// 数据库配置 - 请根据实际情况修改
const DB_CONFIG = {
  host: '118.89.111.78',
  user: 'remote_user',        // 替换为您的数据库用户名
  password: 'Monica00',    // 替换为您的数据库密码
  database: 'pls',              // 替换为您的数据库名
  multipleStatements: true     // 允许执行多条SQL语句
};

// 添加用户输入功能
function askUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// 修改setupDatabase函数以支持选择表
async function setupDatabase(targetTable = 'both') {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    console.log('📖 读取数据库优化脚本...');
    let sqlScript;
    
    // 优先使用简化版本的SQL脚本
    try {
      sqlScript = await fs.readFile('database-optimization-simple.sql', 'utf8');
      console.log('✅ 使用简化版本的SQL脚本');
    } catch (error) {
      try {
        sqlScript = await fs.readFile('database-optimization-fixed.sql', 'utf8');
        console.log('✅ 使用修复版本的SQL脚本');
      } catch (error2) {
        console.log('⚠️ 简化和修复版本脚本不存在，使用原版本');
        sqlScript = await fs.readFile('database-optimization.sql', 'utf8');
      }
    }
    
    console.log('🚀 执行数据库优化脚本...');
    
    // 将脚本分割成多个语句逐个执行，避免语法问题
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          console.log(`📝 执行语句 ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
          successCount++;
        } catch (stmtError) {
          // 某些语句失败是可以接受的（比如字段已存在）
          if (stmtError.message.includes('Duplicate column name') || 
              stmtError.message.includes('already exists') ||
              stmtError.message.includes('Duplicate key name') ||
              stmtError.code === 'ER_DUP_FIELDNAME' ||
              stmtError.code === 'ER_DUP_KEYNAME' ||
              stmtError.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠️ 语句 ${i + 1} 跳过 (已存在):`, stmtError.message.substring(0, 80) + '...');
            skipCount++;
          } else {
            console.error(`❌ 语句 ${i + 1} 执行失败:`, stmtError.message);
            throw stmtError;
          }
        }
      }
    }
    
    console.log(`✅ 数据库优化脚本执行完成！成功: ${successCount}, 跳过: ${skipCount}`);
    console.log('📊 检查设置结果...');
    
    // 检查表结构是否创建成功
    const [tables] = await connection.execute(`
      SELECT table_name, table_comment 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name IN ('thumbnail_tasks')
    `, [DB_CONFIG.database]);
    
    // 检查字段是否添加成功
    const [columns] = await connection.execute(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = ? AND column_name IN ('thumbnailProcessed', 'tinyThumbnail')
    `, [DB_CONFIG.database]);
    
    console.log('📋 创建的表:', tables.map(t => t.table_name));
    console.log('🏗️ 添加的字段:', columns.map(c => `${c.table_name}.${c.column_name}`));
    
    // 生成初始缩略图任务（如果存储过程存在）
    console.log('🔄 生成历史数据的缩略图任务...');
    try {
      let totalTasks = 0;
      
      // 根据用户选择处理不同的表
      if (targetTable === 'both' || targetTable === 'receiptfg' || targetTable === 'g') {
        // 直接插入任务，不依赖存储过程
        const [fgTasks] = await connection.execute(`
          INSERT INTO thumbnail_tasks (table_name, record_id, original_urls)
          SELECT 'receiptfg', id, imgUrls 
          FROM receiptfg 
          WHERE imgUrls IS NOT NULL 
          AND imgUrls != ''
          AND imgUrls != '[]'
          AND imgUrls != 'null'
          AND JSON_LENGTH(imgUrls) > 0
          AND (thumbnailProcessed = 0 OR thumbnailProcessed IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM thumbnail_tasks 
            WHERE table_name = 'receiptfg' AND record_id = receiptfg.id
          )
        `);
        
        console.log(`📝 为 receiptfg 创建了 ${fgTasks.affectedRows} 个任务`);
        totalTasks += fgTasks.affectedRows;
      }
      
      if (targetTable === 'both' || targetTable === 'receiptfc' || targetTable === 'c') {
        const [fcTasks] = await connection.execute(`
          INSERT INTO thumbnail_tasks (table_name, record_id, original_urls)
          SELECT 'receiptfc', id, imgUrls 
          FROM receiptfc 
          WHERE imgUrls IS NOT NULL 
          AND imgUrls != ''
          AND imgUrls != '[]'
          AND imgUrls != 'null'
          AND JSON_LENGTH(imgUrls) > 0
          AND (thumbnailProcessed = 0 OR thumbnailProcessed IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM thumbnail_tasks 
            WHERE table_name = 'receiptfc' AND record_id = receiptfc.id
          )
        `);
        
        console.log(`📝 为 receiptfc 创建了 ${fcTasks.affectedRows} 个任务`);
        totalTasks += fcTasks.affectedRows;
      }
      
      console.log(`📝 总共创建了 ${totalTasks} 个缩略图任务`);
      
    } catch (taskError) {
      console.log('⚠️ 生成任务时遇到问题，可能是表结构不完整:', taskError.message);
    }
    
    // 检查任务数量
    try {
      const [taskCount] = await connection.execute(`
        SELECT COUNT(*) as total, status 
        FROM thumbnail_tasks 
        GROUP BY status
      `);
      
      console.log('📝 缩略图任务统计:', taskCount);
    } catch (countError) {
      console.log('⚠️ 无法获取任务统计，可能任务表未创建成功');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 数据库设置失败:', error.message);
    console.error('💡 请检查:');
    console.error('   1. 数据库连接配置是否正确');
    console.error('   2. 数据库用户是否有足够权限 (CREATE, ALTER, INSERT, UPDATE)');
    console.error('   3. MySQL版本是否支持JSON数据类型 (5.7+)');
    console.error('   4. database-optimization.sql 或 database-optimization-fixed.sql 文件是否存在');
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 数据库连接已关闭');
    }
  }
}

async function checkThumbnailTasks() {
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 检查待处理任务
    const [pendingTasks] = await connection.execute(`
      SELECT COUNT(*) as count FROM thumbnail_tasks WHERE status = 'pending'
    `);
    
    const [processedTasks] = await connection.execute(`
      SELECT COUNT(*) as count FROM thumbnail_tasks WHERE status = 'completed'
    `);
    
    console.log(`📊 缩略图任务状态:`);
    console.log(`   待处理: ${pendingTasks[0].count}个`);
    console.log(`   已完成: ${processedTasks[0].count}个`);
    
    return pendingTasks[0].count;
    
  } catch (error) {
    console.error('❌ 检查任务失败:', error.message);
    return 0;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function startThumbnailProcessor() {
  console.log('🎯 启动缩略图处理服务...');
  
  try {
    // 使用 ts-node 运行独立的缩略图服务脚本
    const { spawn } = require('child_process');
    
    console.log('🚀 缩略图服务正在启动...');
    
    // 启动缩略图服务，使用专用配置文件和路径映射
    const serviceProcess = spawn('npx', [
      'ts-node', 
      '--project', 
      'tsconfig.node.json',
      '-r',
      'tsconfig-paths/register',
      'run-thumbnail-service.ts'
    ], {
      stdio: 'inherit',
      shell: true
    });
    
    serviceProcess.on('error', (error) => {
      console.error('❌ 启动失败:', error.message);
    });
    
    serviceProcess.on('exit', (code) => {
      console.log(`🔄 服务退出，代码: ${code}`);
    });
    
    // 保持进程运行
    await new Promise((resolve) => {
      process.on('SIGINT', () => {
        console.log('\n👋 正在停止缩略图服务...');
        serviceProcess.kill();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ 启动缩略图服务失败:', error.message);
    console.error('💡 请确保:');
    console.error('   1. sharp 包已安装: npm install sharp');
    console.error('   2. ts-node 已安装: npm install --save-dev ts-node');
    console.error('   3. tsconfig-paths 已安装: npm install --save-dev tsconfig-paths');
    console.error('   4. 数据库连接配置正确');
  }
}

// 主函数
async function main() {
  console.log('🎨 =================================');
  console.log('🎨 缩略图系统自动设置工具');
  console.log('🎨 =================================\n');
  
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';
  
  switch (command) {
    case 'setup':
      console.log('📋 执行完整设置...\n');
      
      // 询问用户要处理哪个表
      console.log('请选择要处理的表:');
      console.log('  输入 g - 只处理 receiptfg 表');
      console.log('  输入 c - 只处理 receiptfc 表'); 
      console.log('  输入 both - 处理两个表 (默认)');
      console.log('  直接按回车 - 处理两个表\n');
      
      const tableChoice = await askUser('请输入您的选择 (g/c/both): ');
      let targetTable = 'both';
      
      if (tableChoice === 'g') {
        targetTable = 'receiptfg';
        console.log('✅ 将只处理 receiptfg 表\n');
      } else if (tableChoice === 'c') {
        targetTable = 'receiptfc';
        console.log('✅ 将只处理 receiptfc 表\n');
      } else {
        console.log('✅ 将处理 receiptfg 和 receiptfc 两个表\n');
      }
      
      const setupSuccess = await setupDatabase(targetTable);
      if (setupSuccess) {
        console.log('\n✅ 数据库设置完成！');
        console.log('💡 下一步: 运行 node setup-thumbnails.js start 启动缩略图生成服务');
      }
      break;
      
    case 'start':
      console.log('🚀 启动缩略图处理服务...\n');
      const taskCount = await checkThumbnailTasks();
      if (taskCount > 0) {
        await startThumbnailProcessor();
      } else {
        console.log('📋 暂无待处理的缩略图任务');
        console.log('💡 请先运行 node setup-thumbnails.js setup 设置数据库');
      }
      break;
      
    case 'status':
      console.log('📊 检查缩略图任务状态...\n');
      await checkThumbnailTasks();
      break;
      
    default:
      console.log('📖 使用说明:');
      console.log('   node setup-thumbnails.js setup  - 设置数据库和生成任务 (可选择处理的表)');
      console.log('   node setup-thumbnails.js start  - 启动缩略图生成服务');
      console.log('   node setup-thumbnails.js status - 查看任务状态');
      console.log('\n表选择说明:');
      console.log('   在 setup 过程中，您可以选择:');
      console.log('   • g - 只处理 receiptfg 表的图片');
      console.log('   • c - 只处理 receiptfc 表的图片');
      console.log('   • both - 同时处理两个表的图片');
  }
}

// 处理程序退出
process.on('SIGINT', () => {
  console.log('\n👋 缩略图服务已停止');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  process.exit(1);
});

// 执行主函数
main().catch(error => {
  console.error('❌ 程序执行失败:', error.message);
  process.exit(1);
}); 