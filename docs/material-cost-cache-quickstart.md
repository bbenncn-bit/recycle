# 材料成本缓存系统 - 快速开始

## 一、创建数据库表

执行以下 SQL 创建缓存表：

```sql
-- 在 MySQL 中执行
SOURCE prisma/migrations/create_material_cost_cache.sql;
```

或者直接复制 SQL 内容到 MySQL 客户端执行。

## 二、生成 Prisma 客户端

```bash
npx prisma generate
```

## 三、初始化缓存（首次使用）

### 方式 1: 通过 API（推荐）

```bash
# 更新 2025 年全年的数据
curl -X POST http://localhost:3001/api/profit-management/update-material-cost-cache \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "batchSize": 100
  }'
```

### 方式 2: 使用脚本

```bash
npx ts-node src/scripts/update-material-cost-cache.ts
```

## 四、验证

1. 访问利润分析页面：`http://localhost:3001/profit-management/profit-analysis`
2. 查看浏览器控制台，应该看到 "从缓存读取材料成本" 的日志
3. 页面加载速度应该明显提升

## 五、定时更新（可选）

### 使用 node-cron（应用内）

在应用启动时添加：

```typescript
import { startMaterialCostCacheCron } from '@/lib/cron-jobs/material-cost-cache-cron';

// 每天凌晨 2 点更新最近 7 天的数据
startMaterialCostCacheCron('0 2 * * *');
```

### 使用系统 cron（Linux/Mac）

```bash
# 编辑 crontab
crontab -e

# 添加（每天凌晨 2 点执行）
0 2 * * * cd /path/to/pxrecycle && npx ts-node src/scripts/update-material-cost-cache.ts
```

## 性能对比

- **优化前**: 5-30 秒（每次查询都要计算）
- **优化后**: < 100ms（从缓存读取）

## 常见问题

**Q: 缓存数据不准确怎么办？**
A: 清除缓存并重新计算：
```sql
DELETE FROM MaterialCostCache;
```
然后重新执行初始化步骤。

**Q: 如何查看缓存统计？**
```sql
SELECT COUNT(*) as total FROM MaterialCostCache;
SELECT DATE(calculated_at) as date, COUNT(*) as count 
FROM MaterialCostCache 
GROUP BY DATE(calculated_at) 
ORDER BY date DESC;
```

**Q: 缓存占用多少空间？**
A: 每条记录约 1-2KB，1000 条记录约 1-2MB。

## 详细文档

查看 `docs/material-cost-cache-usage.md` 获取完整文档。
