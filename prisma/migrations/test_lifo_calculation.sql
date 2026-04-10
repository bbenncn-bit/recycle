-- ============================================
-- 测试 LIFO 计算存储过程
-- ============================================
-- 用于调试单个销售订单的材料成本计算

-- 测试单个订单的计算
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

-- 检查 ProcessingCostInput 表中是否有对应的生产记录
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    COALESCE(dailyProcess_qty, product_tons, 0) as prod_qty,
    M1_qty, M1_price,
    M2_qty, M2_price
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL)
  AND production_date IS NOT NULL
LIMIT 10;

-- 检查字段是否存在
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pls'
  AND TABLE_NAME = 'ProcessingCostInput'
  AND COLUMN_NAME IN ('dailyProcess_qty', 'product_tons', 'M1_qty', 'M1_price', 'M2_qty', 'M2_price')
ORDER BY COLUMN_NAME;
