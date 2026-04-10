-- ============================================
-- 简单日期测试 - 验证日期解析和比较
-- ============================================

SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @sale_date = STR_TO_DATE('1/17/2026', '%m/%d/%Y');

-- 查看前10条有产量的记录，检查日期解析
SELECT 
    id,
    production_date,
    dailyProcess_qty,
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE(production_date, '%Y-%m-%d') as parsed_yyyymmdd,
    STR_TO_DATE(production_date, '%d/%m/%Y') as parsed_ddmmyyyy,
    STR_TO_DATE(production_date, '%Y/%m/%d') as parsed_yyyymmdd2,
    @sale_date as sale_date,
    -- 检查每个格式的解析结果和比较
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        ELSE NULL
    END as final_parsed_date,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y') <= @sale_date
        ELSE NULL
    END as is_before_sale
FROM ProcessingCostInput
WHERE product_name = @product_name
  AND (product_warehouse IS NULL OR product_warehouse = @product_warehouse OR product_warehouse = '')
  AND production_date IS NOT NULL
  AND production_date != ''
  AND COALESCE(dailyProcess_qty, 0) > 0
ORDER BY id DESC
LIMIT 10;
