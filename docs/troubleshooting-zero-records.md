# 存储过程返回 0 条记录 - 故障排查

## 问题诊断

存储过程 `sp_update_material_cost_cache` 返回 0 条记录，可能的原因：

1. **DeliverySettlement 表中没有数据**
2. **日期格式不匹配**（delivery_date 是 VARCHAR 类型）
3. **日期范围不匹配**

## 排查步骤

### 步骤 1: 检查 DeliverySettlement 表是否有数据

在 Navicat 中执行：

```sql
-- 查看总记录数
SELECT COUNT(*) as total FROM DeliverySettlement;

-- 查看前 10 条记录
SELECT 
    delivery_number,
    delivery_date,
    product_type,
    settlement_quantity
FROM DeliverySettlement
LIMIT 10;
```

### 步骤 2: 检查日期格式

执行调试脚本（已创建）：`prisma/migrations/debug_delivery_settlement.sql`

或者手动执行：

```sql
-- 查看日期格式
SELECT 
    delivery_date,
    CASE 
        WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL THEN 'YYYY-MM-DD'
        WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL THEN 'MM/DD/YYYY'
        WHEN STR_TO_DATE(delivery_date, '%Y/%m/%d') IS NOT NULL THEN 'YYYY/MM/DD'
        ELSE 'UNKNOWN'
    END as date_format
FROM DeliverySettlement
WHERE delivery_date IS NOT NULL
LIMIT 10;
```

### 步骤 3: 检查日期范围

```sql
-- 查看实际的日期范围
SELECT 
    MIN(
        CASE 
            WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%Y-%m-%d')
            WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%m/%d/%Y')
            ELSE NULL
        END
    ) as min_date,
    MAX(
        CASE 
            WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%Y-%m-%d')
            WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%m/%d/%Y')
            ELSE NULL
        END
    ) as max_date
FROM DeliverySettlement
WHERE delivery_date IS NOT NULL;
```

### 步骤 4: 测试查询条件

```sql
-- 测试存储过程的查询条件
SELECT COUNT(*) as matching_records
FROM DeliverySettlement
WHERE (
    STR_TO_DATE(delivery_date, '%Y-%m-%d') >= '2025-01-01'
    OR STR_TO_DATE(delivery_date, '%m/%d/%Y') >= '2025-01-01'
    OR STR_TO_DATE(delivery_date, '%Y/%m/%d') >= '2025-01-01'
)
AND (
    STR_TO_DATE(delivery_date, '%Y-%m-%d') <= CURDATE()
    OR STR_TO_DATE(delivery_date, '%m/%d/%Y') <= CURDATE()
    OR STR_TO_DATE(delivery_date, '%Y/%m/%d') <= CURDATE()
)
AND settlement_quantity IS NOT NULL
AND settlement_quantity > 0
AND delivery_number IS NOT NULL
AND product_type IS NOT NULL;
```

## 解决方案

### 如果 DeliverySettlement 表没有数据

需要先导入销售数据到 DeliverySettlement 表。

### 如果日期格式不匹配

我已经修复了存储过程，现在支持多种日期格式。请重新执行：

```sql
-- 重新创建存储过程
SOURCE prisma/migrations/material_cost_cache_mysql_event.sql;

-- 然后再次执行
CALL sp_update_material_cost_cache('2025-01-01', CURDATE());
```

### 如果日期范围不匹配

根据实际的日期范围调整参数：

```sql
-- 例如：如果数据是 2025-07-01 到 2025-12-31
CALL sp_update_material_cost_cache('2025-07-01', '2025-12-31');
```

## 快速检查命令

执行以下 SQL 快速诊断：

```sql
-- 1. 检查表是否有数据
SELECT COUNT(*) FROM DeliverySettlement;

-- 2. 检查日期范围
SELECT 
    MIN(delivery_date) as min_date,
    MAX(delivery_date) as max_date,
    COUNT(*) as total
FROM DeliverySettlement
WHERE delivery_date IS NOT NULL;

-- 3. 检查符合条件的数据
SELECT COUNT(*) 
FROM DeliverySettlement
WHERE settlement_quantity > 0
  AND delivery_number IS NOT NULL
  AND product_type IS NOT NULL;
```
