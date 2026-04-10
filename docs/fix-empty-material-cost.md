# 修复 material_cost 为空的问题

## 问题分析

存储过程执行了，但是 `material_cost`、`material_composition`、`production_records` 字段都是 NULL。

**可能的原因：**

1. **ProcessingCostInput 表的字段名不匹配**
   - 存储过程中使用了 `dailyProcess_qty`、`product_tons`、`M1_qty` 等字段
   - 如果这些字段在数据库中不存在或名称不同，查询会失败

2. **日期格式解析失败**
   - 销售日期格式可能不匹配

3. **LIFO 计算逻辑错误**
   - 游标处理可能有问题

## 解决步骤

### 步骤 1: 检查 ProcessingCostInput 表的实际字段

在 Navicat 中执行：

```sql
-- 查看表结构
DESCRIBE ProcessingCostInput;

-- 或者
SHOW COLUMNS FROM ProcessingCostInput;
```

**请把结果告诉我**，特别是：
- 是否有 `dailyProcess_qty` 字段？
- 是否有 `product_tons` 字段？
- 材料字段名是什么格式？（如 `M1_qty`、`M1_price` 等）

### 步骤 2: 测试单个订单的计算

执行测试脚本：

```sql
-- 测试单个订单
SET @delivery_num = 'FH2601170003';
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @settlement_qty = 39.72;
SET @material_cost = 0;
SET @material_composition = JSON_ARRAY();
SET @production_records = JSON_ARRAY();

CALL sp_calculate_lifo_material_cost(
    @delivery_num,
    @product_name,
    @product_warehouse,
    @delivery_date,
    @settlement_qty,
    @material_cost,
    @material_composition,
    @production_records
);

SELECT 
    @material_cost as material_cost,
    @material_composition as material_composition,
    @production_records as production_records;
```

**如果报错，请把错误信息告诉我。**

### 步骤 3: 检查是否有对应的生产记录

```sql
-- 检查是否有对应的生产记录
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL)
LIMIT 10;
```

## 临时解决方案

如果 ProcessingCostInput 表的字段名不同，我可以根据实际字段名修改存储过程。

**请先执行步骤 1，把字段名告诉我，我会立即修复存储过程。**
