# 材料成本缓存系统使用指南

## 概述

材料成本缓存系统通过预计算 LIFO（后进先出）材料成本，大幅提升利润分析页面的加载速度。系统采用**缓存优先**策略：优先从缓存读取，缓存未命中时实时计算并保存。

## 架构设计

### 1. 数据库表

**MaterialCostCache** 表存储预计算结果：
- `delivery_number`: 发货单号（唯一标识）
- `product_name`: 成品名称
- `product_warehouse`: 成品仓库
- `delivery_date`: 发货日期
- `settlement_quantity`: 结算数量（吨）
- `material_cost`: 材料成本（元）
- `material_composition`: 材料构成（JSON）
- `production_records`: 使用的生产记录（JSON）
- `calculated_at`: 计算时间
- `updated_at`: 更新时间

### 2. 核心服务

- **material-cost-cache-service.ts**: 缓存读写、批量更新
- **lifo-material-cost-service.ts**: LIFO 计算逻辑
- **profit-analysis-service.ts**: 利润分析服务（已集成缓存）

### 3. API 路由

- `POST /api/profit-management/update-material-cost-cache`: 手动触发缓存更新

## 使用步骤

### 步骤 1: 创建数据库表

执行 SQL 脚本创建表：

```bash
# 方式 1: 直接执行 SQL
mysql -u your_user -p your_database < prisma/migrations/create_material_cost_cache.sql

# 方式 2: 使用 Prisma
npx prisma db push
```

### 步骤 2: 生成 Prisma 客户端

```bash
npx prisma generate
```

### 步骤 3: 初始化缓存（首次使用）

#### 方式 A: 通过 API 手动触发

```bash
curl -X POST http://localhost:3001/api/profit-management/update-material-cost-cache \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "batchSize": 100
  }'
```

#### 方式 B: 使用脚本

```bash
npx ts-node src/scripts/update-material-cost-cache.ts
```

### 步骤 4: 配置定时任务（可选）

在应用启动时启动定时任务（例如在 `app/layout.tsx` 或单独的服务器文件中）：

```typescript
import { startMaterialCostCacheCron } from '@/lib/cron-jobs/material-cost-cache-cron';

// 每天凌晨 2 点更新
startMaterialCostCacheCron('0 2 * * *');
```

或者使用系统 cron（Linux/Mac）：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨 2 点执行）
0 2 * * * cd /path/to/pxrecycle && npx ts-node src/scripts/update-material-cost-cache.ts >> /var/log/material-cost-cache.log 2>&1
```

## 性能优化效果

### 优化前
- 每次查询需要扫描整个 `ProcessingCostInput` 表
- 计算 LIFO 成本耗时：**5-30 秒**（取决于数据量）
- 用户体验：页面加载缓慢，可能超时

### 优化后
- 缓存命中：**< 100ms**（直接从缓存表读取）
- 缓存未命中：实时计算并保存（首次访问后即缓存）
- 用户体验：页面加载快速，响应及时

## 缓存更新策略

### 1. 增量更新（推荐）

定期更新最近 7 天的数据，确保新数据及时缓存：

```typescript
// 更新最近 7 天
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);
await batchUpdateMaterialCostCache(startDate, endDate);
```

### 2. 全量更新

定期（如每月）全量更新，确保数据一致性：

```typescript
// 更新所有数据
await batchUpdateMaterialCostCache();
```

### 3. 实时更新

当有新销售订单时，系统会自动计算并缓存（首次访问时）。

## 监控和维护

### 查看缓存统计

```sql
-- 缓存记录数
SELECT COUNT(*) FROM MaterialCostCache;

-- 按日期统计
SELECT 
  DATE(calculated_at) as date,
  COUNT(*) as count
FROM MaterialCostCache
GROUP BY DATE(calculated_at)
ORDER BY date DESC;

-- 缓存命中率（需要应用层统计）
```

### 清理旧缓存

```typescript
import { clearMaterialCostCache } from '@/lib/services/material-cost-cache-service';

// 清理 30 天前的缓存
const beforeDate = new Date();
beforeDate.setDate(beforeDate.getDate() - 30);
await clearMaterialCostCache(beforeDate);
```

## 故障排查

### 问题 1: 缓存未生效

**检查项：**
1. 确认 `MaterialCostCache` 表已创建
2. 确认已执行 `npx prisma generate`
3. 检查应用日志，确认缓存读取逻辑正常

### 问题 2: 缓存数据不准确

**解决方案：**
1. 清除旧缓存：`DELETE FROM MaterialCostCache;`
2. 重新全量更新缓存
3. 检查 `ProcessingCostInput` 表数据是否完整

### 问题 3: 更新任务执行失败

**检查项：**
1. 查看 API 响应错误信息
2. 检查数据库连接
3. 确认 `ProcessingCostInput` 表数据格式正确

## 最佳实践

1. **首次部署**：全量更新一次缓存（覆盖历史数据）
2. **日常维护**：每天增量更新最近 7 天数据
3. **数据变更**：当 `ProcessingCostInput` 或 `DeliverySettlement` 表有大量更新时，重新计算相关缓存
4. **监控告警**：监控缓存更新任务的执行情况，失败时及时告警

## API 文档

### POST /api/profit-management/update-material-cost-cache

**请求体：**
```json
{
  "startDate": "2025-01-01",  // 可选，开始日期
  "endDate": "2025-12-31",     // 可选，结束日期
  "batchSize": 100              // 可选，批次大小，默认 100
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "success": 995,
    "failed": 5,
    "errors": [...],
    "duration": "45.23 秒"
  }
}
```

## 注意事项

1. **数据一致性**：缓存数据可能与实时计算结果略有差异（由于计算时间不同），但通常可以忽略
2. **存储空间**：缓存表会占用一定存储空间，建议定期清理旧数据
3. **并发安全**：系统使用 `upsert` 操作，支持并发更新
4. **性能影响**：批量更新时可能对数据库造成一定压力，建议在低峰期执行
