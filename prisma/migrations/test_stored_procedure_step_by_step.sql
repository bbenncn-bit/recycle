-- ============================================
-- 逐步测试存储过程
-- ============================================

-- 步骤 1: 测试日期解析（在存储过程中）
SET @test_date = '1/17/2026';
SET @parsed_date = NULL;

SET @parsed_date = STR_TO_DATE(@test_date, '%Y-%m-%d');
SELECT @parsed_date as step1_yyyymmdd;

SET @parsed_date = STR_TO_DATE(@test_date, '%m/%d/%Y');
SELECT @parsed_date as step2_mmddyyyy;

-- 步骤 2: 检查是否有匹配的生产记录（使用与存储过程完全相同的逻辑）
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @sale_date = STR_TO_DATE(@delivery_date, '%m/%d/%Y');

SELECT 
    @sale_date as parsed_sale_date,
    COUNT(*) as matching_records
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
  AND (
      (STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%m/%d/%Y') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL AND STR_TO_DATE(p.production_date, '%Y-%m-%d') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%d/%m/%Y') <= @sale_date)
  );

-- 步骤 3: 查看实际匹配的记录
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    dailyProcess_qty,
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_prod_date,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y') <= @sale_date
        ELSE FALSE
    END as is_before_sale
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
  AND (
      (STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%m/%d/%Y') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL AND STR_TO_DATE(p.production_date, '%Y-%m-%d') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%d/%m/%Y') <= @sale_date)
  )
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        ELSE STR_TO_DATE(production_date, '%d/%m/%Y')
    END DESC
LIMIT 5;
