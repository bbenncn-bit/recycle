-- ============================================
-- 测试单个订单并调试
-- ============================================

-- 步骤 1: 检查是否有匹配的生产记录
SELECT 
    '检查匹配的生产记录' as step,
    COUNT(*) as record_count
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
  AND production_date != '';

-- 步骤 2: 检查日期解析
SELECT 
    '日期解析测试' as step,
    '1/17/2026' as input_date,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_yyyymmdd,
    STR_TO_DATE('1/17/2026', '%d/%m/%Y') as parsed_ddmmyyyy;

-- 步骤 3: 查看实际的生产记录（前5条）
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    dailyProcess_qty,
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_date_1,
    STR_TO_DATE(production_date, '%Y-%m-%d') as parsed_date_2,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y')
        ELSE NULL
    END as final_parsed_date
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
  AND production_date != ''
LIMIT 5;

-- 步骤 4: 测试存储过程
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
