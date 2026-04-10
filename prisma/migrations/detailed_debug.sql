-- ============================================
-- 详细调试脚本 - 找出为什么 material_cost 为 0
-- ============================================

-- 步骤 1: 检查日期解析
SELECT 
    '1/17/2026' as input_date,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_yyyymmdd,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE('1/17/2026', '%Y/%m/%d') as parsed_yyyymmdd2,
    STR_TO_DATE('1/17/2026', '%d/%m/%Y') as parsed_ddmmyyyy;

-- 步骤 2: 检查是否有匹配的生产记录
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @sale_date = STR_TO_DATE('1/17/2026', '%m/%d/%Y');

SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN COALESCE(dailyProcess_qty, 0) > 0 THEN 1 END) as records_with_qty,
    SUM(COALESCE(dailyProcess_qty, 0)) as total_qty
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0;

-- 步骤 3: 检查日期比较逻辑
SELECT 
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

-- 步骤 4: 查看实际的生产记录（前10条，按日期倒序）
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    dailyProcess_qty,
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_date_mmddyyyy,
    STR_TO_DATE(production_date, '%Y-%m-%d') as parsed_date_yyyymmdd,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y')
        ELSE NULL
    END as final_parsed_date,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y') <= @sale_date
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d') <= @sale_date
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y') <= @sale_date
        ELSE FALSE
    END as is_before_sale_date
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        ELSE STR_TO_DATE(production_date, '%d/%m/%Y')
    END DESC
LIMIT 10;

-- 步骤 5: 模拟临时表的创建和查询
DROP TEMPORARY TABLE IF EXISTS tmp_test_production_records;

CREATE TEMPORARY TABLE tmp_test_production_records (
    id INT,
    production_date VARCHAR(50),
    prod_qty DECIMAL(18, 2),
    unit_cost DECIMAL(18, 2),
    INDEX idx_id (id)
);

INSERT INTO tmp_test_production_records (id, production_date, prod_qty, unit_cost)
SELECT 
    p.id,
    p.production_date,
    COALESCE(p.dailyProcess_qty, 0) as prod_qty,
    CASE 
        WHEN COALESCE(p.dailyProcess_qty, 0) > 0 THEN
            (
                COALESCE(p.M1_qty * p.M1_price, 0) +
                COALESCE(p.M2_qty * p.M2_price, 0) +
                COALESCE(p.M3_qty * p.M3_price, 0) +
                COALESCE(p.M4_qty * p.M4_price, 0) +
                COALESCE(p.M5_qty * p.M5_price, 0) +
                COALESCE(p.M6_qty * p.M6_price, 0) +
                COALESCE(p.M7_qty * p.M7_price, 0) +
                COALESCE(p.M8_qty * p.M8_price, 0) +
                COALESCE(p.M9_qty * p.M9_price, 0) +
                COALESCE(p.wireRope_qty * p.wireRope_price, 0) +
                COALESCE(p.carShell_qty * p.carShell_price, 0) +
                COALESCE(p.pigIron_qty * p.pigIron_price, 0) +
                COALESCE(p.scrap_qty * p.scrap_price, 0) +
                COALESCE(p.carDismantle_qty * p.carDismantle_price, 0) +
                COALESCE(p.transfer_qty * p.transfer_price, 0) +
                COALESCE(p.auxiliary_qty * p.auxiliary_price, 0) +
                COALESCE(p.material1_qty * p.material1_price, 0) +
                COALESCE(p.material2_qty * p.material2_price, 0) +
                COALESCE(p.material3_qty * p.material3_price, 0) +
                COALESCE(p.material4_qty * p.material4_price, 0) +
                COALESCE(p.material5_qty * p.material5_price, 0)
            ) / GREATEST(COALESCE(p.dailyProcess_qty, 1), 1)
        ELSE 0
    END as unit_cost
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

-- 查看临时表中的数据
SELECT 
    COUNT(*) as records_in_temp_table,
    SUM(prod_qty) as total_prod_qty,
    AVG(unit_cost) as avg_unit_cost
FROM tmp_test_production_records;

SELECT 
    id,
    production_date,
    prod_qty,
    unit_cost
FROM tmp_test_production_records
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        ELSE STR_TO_DATE(production_date, '%d/%m/%Y')
    END DESC
LIMIT 10;

DROP TEMPORARY TABLE IF EXISTS tmp_test_production_records;
