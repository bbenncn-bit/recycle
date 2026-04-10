import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
    // 如果需要影子数据库（用于迁移）
    // shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
    // 如果需要直接连接（用于连接池）
    // directUrl: env('DIRECT_DATABASE_URL'),
  },
});

