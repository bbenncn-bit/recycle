-- ============================================
-- 最终调试 - 检查为什么 material_cost 仍为 0
-- ============================================

SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @sale_date = STR_TO_DATE(@delivery_date, '%m/%d/%Y');

-- 1. 检查日期解析
SELECT 
    @delivery_date as input_date,
    @sale_date as parsed_sale_date;

-- 2. 检查是否有匹配的生产记录（使用与存储过程完全相同的逻辑）
SELECT 
    COUNT(*) as matching_records
FROM ProcessingCostInput p
WHERE p.product_name COLLATE utf8mb4_unicode_ci = @product_name COLLATE utf8mb4_unicode_ci
  AND (p_product_warehouse IS NULL OR p.product_warehouse COLLATE utf8mb4_unicode_ci = @product_warehouse COLLATE utf8mb4_unicode_ci OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
  AND (
      (STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%m/%d/%Y') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL AND STR_TO_DATE(p.production_date, '%Y-%m-%d') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%d/%m/%Y') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%Y/%m/%d') IS NOT NULL AND STR_TO_DATE(p.production_date, '%Y/%m/%d') <= @sale_date)
  );

-- 3. 查看实际匹配的记录（前5条）
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    dailyProcess_qty,
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_date,
    STR_TO_DATE(production_date, '%m/%d/%Y') <= @sale_date as is_before_sale
FROM ProcessingCostInput p
WHERE p.product_name COLLATE utf8mb4_unicode_ci = @product_name COLLATE utf8mb4_unicode_ci
  AND (p_product_warehouse IS NULL OR p.product_warehouse COLLATE utf8mb4_unicode_ci = @product_warehouse COLLATE utf8mb4_unicode_ci OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
  AND (
      (STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%m/%d/%Y') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL AND STR_TO_DATE(p.production_date, '%Y-%m-%d') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%d/%m/%Y') <= @sale_date)
      OR (STR_TO_DATE(p.production_date, '%Y/%m/%d') IS NOT NULL AND STR_TO_DATE(p.production_date, '%Y/%m/%d') <= @sale_date)
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
