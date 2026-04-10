# MySQL 事件快速开始指南

## 📋 操作步骤

### 1. 在 Navicat 中执行 SQL 文件

1. 打开 Navicat，连接到数据库
2. 选择 `pls` 数据库
3. 点击 "查询" → "新建查询"
4. 打开文件：`E:\pxrecycle\prisma\migrations\material_cost_cache_mysql_event.sql`
5. 点击 "运行" 执行 SQL
6. 确认没有错误

### 2. 启用事件调度器

在 Navicat 查询窗口中执行：

```sql
SET GLOBAL event_scheduler = ON;
```

验证：

```sql
SHOW VARIABLES LIKE 'event_scheduler';
```

应该显示 `ON`。

### 3. 首次全量更新（必须执行！）

执行一次全量更新，覆盖所有历史数据：

```sql
CALL sp_update_material_cost_cache('2025-01-01', CURDATE());
```

**重要提示**：
- 这个过程可能需要 10-30 分钟，请耐心等待
- 可以通过以下 SQL 查看进度：
  ```sql
  SELECT COUNT(*) as cached_count FROM MaterialCostCache;
  ```

### 4. 验证事件

查看事件是否创建成功：

```sql
SHOW EVENTS;
```

应该看到 `ev_update_material_cost_cache_daily` 事件。

### 5. 测试效果

访问利润分析页面：
- `http://localhost:3001/profit-management/profit-analysis`
- 查看浏览器控制台，应该看到 "从缓存读取材料成本"
- 页面加载时间应该从 180 秒降至 3-5 秒

## 🔍 常用 SQL

### 查看缓存统计

```sql
-- 总记录数
SELECT COUNT(*) as total FROM MaterialCostCache;

-- 按日期统计
SELECT 
    DATE(calculated_at) as date,
    COUNT(*) as count
FROM MaterialCostCache
GROUP BY DATE(calculated_at)
ORDER BY date DESC
LIMIT 10;
```

### 手动执行更新

```sql
-- 全量更新
CALL sp_update_material_cost_cache('2025-01-01', CURDATE());

-- 增量更新（最近 7 天）
CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE());
```

### 查看事件状态

```sql
-- 查看所有事件
SHOW EVENTS;

-- 启用/禁用事件
ALTER EVENT ev_update_material_cost_cache_daily ENABLE;
ALTER EVENT ev_update_material_cost_cache_daily DISABLE;
```

## ⚠️ 注意事项

1. **首次使用必须手动执行全量更新**
2. **事件在每天凌晨 2:00 自动执行**
3. **如果数据有大量更新，建议手动执行一次更新**

## 🐛 故障排查

### 问题：事件未执行

1. 检查事件调度器：`SHOW VARIABLES LIKE 'event_scheduler';`
2. 检查事件状态：`SHOW EVENTS;`
3. 如果事件被禁用，启用它：`ALTER EVENT ev_update_material_cost_cache_daily ENABLE;`

### 问题：存储过程执行失败

检查 ProcessingCostInput 表的字段是否存在，特别是：
- `dailyProcess_qty`
- `product_tons`
- `M1_qty`, `M1_price` 等材料字段

如果字段名不同，需要修改存储过程中的字段名。
