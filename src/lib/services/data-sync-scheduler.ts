import cron from "node-cron";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

/**
 * 数据同步定时任务服务
 * 每天自动执行数据同步
 */
export class DataSyncScheduler {
  private static task: cron.ScheduledTask | null = null;
  private static isRunning = false;
  private static initialized = false;

  /**
   * 启动定时任务
   * @param schedule Cron 表达式，默认为每天凌晨 2:00 执行
   */
  static start(schedule: string = "0 2 * * *") {
    if (this.task) {
      console.log("⚠️ 定时任务已在运行中");
      return;
    }

    // 验证Python脚本路径
    const pythonScriptPath = this.getPythonScriptPath();
    if (!fs.existsSync(pythonScriptPath)) {
      console.error(`❌ Python脚本不存在: ${pythonScriptPath}`);
      console.error("⚠️ 数据同步定时任务未启动，请检查Python脚本路径");
      return;
    }

    console.log(`🕐 启动数据同步定时任务，计划: ${schedule} (每天执行)`);
    console.log(`📁 Python脚本路径: ${pythonScriptPath}`);
    
    this.task = cron.schedule(schedule, async () => {
      if (this.isRunning) {
        console.log("⏸️ 上次同步任务仍在运行中，跳过本次执行");
        return;
      }

      this.isRunning = true;
      console.log(`\n${"=".repeat(50)}`);
      console.log(`🔄 [${new Date().toLocaleString("zh-CN")}] 开始自动数据同步`);
      console.log("=".repeat(50));

      try {
        await this.executeSync();
        console.log(`✅ [${new Date().toLocaleString("zh-CN")}] 自动数据同步完成`);
      } catch (error: any) {
        console.error(`❌ [${new Date().toLocaleString("zh-CN")}] 自动数据同步失败:`, error);
      } finally {
        this.isRunning = false;
        console.log("=".repeat(50) + "\n");
      }
    }, {
      scheduled: true,
      timezone: "Asia/Shanghai", // 使用中国时区
    });

    this.initialized = true;
    console.log("✅ 数据同步定时任务已启动");
  }

  /**
   * 获取Python脚本路径
   */
  private static getPythonScriptPath(): string {
    // 尝试多种可能的路径
    const possiblePaths = [
      // 从pxrecycle项目根目录到python项目
      path.join(process.cwd(), "..", "python", "getdata.py"),
      // 从当前工作目录
      path.join(process.cwd(), "python", "getdata.py"),
      // 绝对路径（如果python项目在F盘）
      path.join("F:", "python", "getdata.py"),
      // 如果workspace在E盘，python在F盘
      path.join("F:", "python", "getdata.py"),
    ];

    for (const scriptPath of possiblePaths) {
      if (fs.existsSync(scriptPath)) {
        return scriptPath;
      }
    }

    // 返回默认路径（第一个）
    return possiblePaths[0];
  }

  /**
   * 停止定时任务
   */
  static stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log("⏹️ 数据同步定时任务已停止");
    }
  }

  /**
   * 执行数据同步
   */
  private static async executeSync(): Promise<void> {
    const pythonScriptPath = this.getPythonScriptPath();

    if (!fs.existsSync(pythonScriptPath)) {
      throw new Error(`Python脚本不存在: ${pythonScriptPath}`);
    }

    // 检测Python命令
    const pythonCommand = await this.detectPythonCommand();
    
    try {
      console.log(`🐍 执行命令: ${pythonCommand} "${pythonScriptPath}"`);
      const { stdout, stderr } = await execAsync(
        `${pythonCommand} "${pythonScriptPath}"`,
        {
          cwd: path.dirname(pythonScriptPath),
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          env: {
            ...process.env,
            PYTHONUNBUFFERED: "1", // 确保Python输出实时显示
          },
        }
      );

      if (stdout) {
        console.log("📊 同步输出:", stdout);
      }

      if (stderr && !stderr.includes("Warning") && !stderr.trim().includes("DeprecationWarning")) {
        console.warn("⚠️ 同步警告:", stderr);
      }
    } catch (error: any) {
      console.error("❌ 执行 Python 脚本失败:", error);
      if (error.stdout) {
        console.error("标准输出:", error.stdout);
      }
      if (error.stderr) {
        console.error("错误输出:", error.stderr);
      }
      throw error;
    }
  }

  /**
   * 检测可用的Python命令
   */
  private static async detectPythonCommand(): Promise<string> {
    const commands = process.platform === "win32" 
      ? ["python", "py", "python3"] 
      : ["python3", "python"];

    for (const cmd of commands) {
      try {
        await execAsync(`${cmd} --version`, { timeout: 5000 });
        return cmd;
      } catch {
        continue;
      }
    }

    // 如果都检测不到，返回默认值
    return process.platform === "win32" ? "python" : "python3";
  }

  /**
   * 手动触发一次同步（用于测试）
   */
  static async triggerSync(): Promise<void> {
    if (this.isRunning) {
      throw new Error("同步任务正在运行中，请稍后再试");
    }

    this.isRunning = true;
    try {
      await this.executeSync();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 获取任务状态
   */
  static getStatus() {
    const pythonScriptPath = this.getPythonScriptPath();
    return {
      isRunning: this.isRunning,
      isScheduled: this.task !== null,
      initialized: this.initialized,
      pythonScriptPath,
      pythonScriptExists: fs.existsSync(pythonScriptPath),
    };
  }

  /**
   * 检查是否已初始化
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}


