-- ============================================
-- 直接测试 - 检查是否有匹配的记录
-- ============================================

SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @sale_date = STR_TO_DATE(@delivery_date, '%m/%d/%Y');

-- 1. 检查基本条件
SELECT 
    '基本条件检查' as test,
    COUNT(*) as total_records
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '');

-- 2. 检查日期和产量条件
SELECT 
    '日期和产量条件' as test,
    COUNT(*) as matching_records
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0;

-- 3. 检查完整的查询条件（与存储过程完全一致）
SELECT 
    '完整查询条件' as test,
    COUNT(*) as matching_records,
    @sale_date as sale_date_used
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
