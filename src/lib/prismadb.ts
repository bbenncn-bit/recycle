import { PrismaClient } from "../../generated/prisma";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  var prisma: PrismaClient | undefined;
}

// 获取数据库连接字符串
function getDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return dbUrl;
}

// 解析 DATABASE_URL 为配置对象（用于连接池配置）
function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    // 手动解码密码（URL 解析器不会自动解码密码部分）
    const password = decodeURIComponent(parsed.password);
    
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 3306,
      user: parsed.username,
      password: password, // 使用解码后的密码
      database: parsed.pathname.slice(1),
      // 连接池配置
      waitForConnections: true,
      connectionLimit: 20, // 增加连接池大小
      queueLimit: 0,
      // 连接超时配置
      connectTimeout: 30000, // 30秒连接超时
      acquireTimeout: 30000, // 30秒从连接池获取连接的超时时间
      timeout: 30000, // 30秒查询超时
      // 连接保活配置
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 创建 adapter
// PrismaMariaDb 可以直接接受连接字符串或配置对象
// 我们使用配置对象以便设置连接池参数
const dbUrl = getDatabaseUrl();
const poolConfig = parseDatabaseUrl(dbUrl);
const adapter = new PrismaMariaDb(poolConfig);

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    // 根据环境调整日志级别
    log: process.env.NODE_ENV === 'development' 
      ? ["error", "warn"] // 开发环境只记录错误和警告
      : ["error"], // 生产环境只记录错误
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;