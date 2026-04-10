# MySQL 事件设置指南

## 概述

材料成本缓存现在由 MySQL 事件自动管理，无需在应用代码中处理。

## 设置步骤

### 步骤 1: 执行 SQL 文件

在 Navicat 中：

1. 打开数据库连接
2. 选择 `pls` 数据库
3. 打开 SQL 编辑器
4. 执行文件：`prisma/migrations/material_cost_cache_mysql_event.sql`
5. 确认所有存储过程和事件创建成功

### 步骤 2: 启用事件调度器

在 MySQL 中执行：

```sql
SET GLOBAL event_scheduler = ON;
```

验证是否启用：

```sql
SHOW VARIABLES LIKE 'event_scheduler';
```

应该显示：`event_scheduler | ON`

### 步骤 3: 首次全量更新（重要！）

执行一次全量更新，覆盖历史数据：

```sql
CALL sp_update_material_cost_cache('2025-01-01', CURDATE());
```

**注意**：
- 根据数据量，可能需要 10-30 分钟
- 建议在低峰期执行
- 可以通过 `SELECT COUNT(*) FROM MaterialCostCache;` 查看进度

### 步骤 4: 验证事件

查看事件状态：

```sql
SHOW EVENTS;
```

应该看到 `ev_update_material_cost_cache_daily` 事件，状态为 `ENABLED`。

### 步骤 5: 测试

访问利润分析页面，应该看到：
- 浏览器控制台显示 "从缓存读取材料成本"
- 页面加载时间从 180 秒降至 3-5 秒

## 事件说明

### 自动更新事件

- **名称**: `ev_update_material_cost_cache_daily`
- **执行时间**: 每天凌晨 2:00
- **更新范围**: 最近 7 天的数据
- **目的**: 确保新数据及时缓存

### 存储过程

#### `sp_calculate_lifo_material_cost`
计算单个销售订单的 LIFO 材料成本。

**参数**:
- `p_delivery_number`: 发货单号
- `p_product_name`: 成品名称
- `p_product_warehouse`: 成品仓库
- `p_delivery_date`: 发货日期
- `p_settlement_quantity`: 结算数量

**输出**:
- `p_material_cost`: 材料成本
- `p_material_composition`: 材料构成（JSON）
- `p_production_records`: 使用的生产记录（JSON）

#### `sp_update_material_cost_cache`
批量更新材料成本缓存。

**参数**:
- `p_start_date`: 开始日期（可选，默认 '2025-01-01'）
- `p_end_date`: 结束日期（可选，默认当前日期）

## 手动操作

### 手动执行全量更新

```sql
CALL sp_update_material_cost_cache('2025-01-01', CURDATE());
```

### 手动执行增量更新（最近 7 天）

```sql
CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE());
```

### 查看缓存统计

```sql
-- 缓存记录数
SELECT COUNT(*) as total FROM MaterialCostCache;

-- 按日期统计
SELECT 
    DATE(calculated_at) as date,
    COUNT(*) as count
FROM MaterialCostCache
GROUP BY DATE(calculated_at)
ORDER BY date DESC
LIMIT 30;
```

### 清除旧缓存

```sql
-- 清除 30 天前的缓存
DELETE FROM MaterialCostCache 
WHERE calculated_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## 故障排查

### 问题 1: 事件未执行

1. 检查事件调度器是否启用：
   ```sql
   SHOW VARIABLES LIKE 'event_scheduler';
   ```

2. 检查事件状态：
   ```sql
   SHOW EVENTS;
   ```

3. 如果事件被禁用，启用它：
   ```sql
   ALTER EVENT ev_update_material_cost_cache_daily ENABLE;
   ```

### 问题 2: 存储过程执行失败

1. 查看错误日志
2. 检查 ProcessingCostInput 表结构是否正确
3. 检查 DeliverySettlement 表是否存在

### 问题 3: 缓存未更新

1. 手动执行一次更新：
   ```sql
   CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE());
   ```

2. 检查是否有错误输出

3. 查看 MaterialCostCache 表是否有新记录

## 注意事项

1. **首次使用**：必须手动执行一次全量更新
2. **数据一致性**：如果 ProcessingCostInput 或 DeliverySettlement 表有大量更新，建议手动执行一次更新
3. **性能影响**：事件在凌晨执行，对系统影响较小
4. **存储空间**：定期清理旧缓存，避免表过大

## 已删除的文件

以下文件已从项目中删除（功能已迁移到 MySQL）：

- `src/lib/services/material-cost-cache-service.ts`
- `src/scripts/update-material-cost-cache.ts`
- `src/lib/cron-jobs/material-cost-cache-cron.ts`
- `src/app/api/profit-management/update-material-cost-cache/route.ts`

现在所有缓存更新都由 MySQL 事件自动处理。
