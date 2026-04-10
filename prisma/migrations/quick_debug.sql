-- ============================================
-- 快速调试 - 检查关键问题
-- ============================================

-- 1. 检查日期解析（与存储过程完全一致）
SET @test_date = '1/17/2026';
SET @v_sale_date = NULL;

SET @v_sale_date = STR_TO_DATE(@test_date, '%Y-%m-%d');
SELECT @v_sale_date as step1, '尝试 YYYY-MM-DD' as format;

SET @v_sale_date = STR_TO_DATE(@test_date, '%m/%d/%Y');
SELECT @v_sale_date as step2, '尝试 MM/DD/YYYY' as format;

-- 2. 检查是否有匹配的生产记录
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @sale_date = STR_TO_DATE('1/17/2026', '%m/%d/%Y');

SELECT 
    '检查匹配记录' as step,
    COUNT(*) as total_records,
    COUNT(CASE WHEN COALESCE(dailyProcess_qty, 0) > 0 THEN 1 END) as records_with_qty
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != '';

-- 3. 检查日期比较（使用与存储过程完全相同的逻辑）
SELECT 
    '检查日期比较' as step,
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

-- 4. 查看实际匹配的记录（前5条）
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    dailyProcess_qty,
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_date,
    STR_TO_DATE(production_date, '%m/%d/%Y') <= @sale_date as is_before_sale
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
