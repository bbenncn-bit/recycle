import { PrismaClient } from "../../generated/prisma";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/** Turbopack / HMR 下 `global` 与模块实例可能不一致，用 globalThis 保证单例连接池 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// 获取数据库连接字符串
function getDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return dbUrl;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// 解析 DATABASE_URL 为配置对象（用于连接池配置）
function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    // 手动解码密码（URL 解析器不会自动解码密码部分）
    const password = decodeURIComponent(parsed.password);

    const connectionLimit = parsePositiveInt(process.env.DATABASE_CONNECTION_LIMIT, 20);
    const connectTimeout = parsePositiveInt(process.env.DATABASE_CONNECT_TIMEOUT_MS, 60000);
    const acquireTimeout = parsePositiveInt(process.env.DATABASE_POOL_ACQUIRE_TIMEOUT_MS, 60000);
    const queryTimeout = parsePositiveInt(process.env.DATABASE_QUERY_TIMEOUT_MS, 60000);

    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 3306,
      user: parsed.username,
      password: password, // 使用解码后的密码
      database: parsed.pathname.slice(1),
      // 连接池配置（远程库 / 首页并发多时适当加大超时与连接数）
      waitForConnections: true,
      connectionLimit,
      queueLimit: 0,
      connectTimeout,
      acquireTimeout,
      timeout: queryTimeout,
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
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // 根据环境调整日志级别
    log: process.env.NODE_ENV === 'development' 
      ? ["error", "warn"] // 开发环境只记录错误和警告
      : ["error"], // 生产环境只记录错误
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}