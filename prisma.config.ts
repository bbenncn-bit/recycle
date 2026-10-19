import { defineConfig } from 'prisma/config';
import 'dotenv/config';

// prisma generate 不需要真实地址；.env 缺失时用占位符，保证新机器 npm install 不失败
const databaseUrl = process.env.DATABASE_URL ?? 'mysql://placeholder:placeholder@localhost:3306/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
    // 如果需要影子数据库（用于迁移）
    // shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
    // 如果需要直接连接（用于连接池）
    // directUrl: env('DIRECT_DATABASE_URL'),
  },
});

