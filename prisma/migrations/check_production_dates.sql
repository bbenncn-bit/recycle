-- ============================================
-- 检查生产日期的实际格式
-- ============================================

SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @sale_date = STR_TO_DATE('1/17/2026', '%m/%d/%Y');

-- 1. 查看生产日期的实际格式和解析结果
SELECT 
    id,
    product_name,
    production_date,
    dailyProcess_qty,
    -- 尝试不同的日期格式解析
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE(production_date, '%Y-%m-%d') as parsed_yyyymmdd,
    STR_TO_DATE(production_date, '%d/%m/%Y') as parsed_ddmmyyyy,
    -- 检查哪个格式能成功解析
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL THEN 'MM/DD/YYYY'
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL THEN 'YYYY-MM-DD'
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL THEN 'DD/MM/YYYY'
        ELSE 'UNKNOWN'
    END as date_format,
    -- 检查是否在销售日期之前
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y') <= @sale_date
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d') <= @sale_date
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y') <= @sale_date
        ELSE FALSE
    END as is_before_sale
FROM ProcessingCostInput
WHERE product_name = @product_name
  AND (product_warehouse IS NULL OR product_warehouse = @product_warehouse OR product_warehouse = '')
  AND production_date IS NOT NULL
  AND production_date != ''
  AND COALESCE(dailyProcess_qty, 0) > 0
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        ELSE STR_TO_DATE(production_date, '%d/%m/%Y')
    END DESC
LIMIT 10;

-- 2. 检查日期比较逻辑（简化版）
SELECT 
    '日期比较测试' as test,
    COUNT(*) as total_with_qty,
    COUNT(CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        AND STR_TO_DATE(production_date, '%m/%d/%Y') <= @sale_date
        THEN 1
    END) as matches_mmddyyyy,
    COUNT(CASE 
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL 
        AND STR_TO_DATE(production_date, '%Y-%m-%d') <= @sale_date
        THEN 1
    END) as matches_yyyymmdd,
    COUNT(CASE 
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL 
        AND STR_TO_DATE(production_date, '%d/%m/%Y') <= @sale_date
        THEN 1
    END) as matches_ddmmyyyy
FROM ProcessingCostInput
WHERE product_name = @product_name
  AND (product_warehouse IS NULL OR product_warehouse = @product_warehouse OR product_warehouse = '')
  AND production_date IS NOT NULL
  AND production_date != ''
  AND COALESCE(dailyProcess_qty, 0) > 0;
