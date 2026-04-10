-- ============================================
-- 测试游标逻辑 - 模拟存储过程中的游标读取
-- ============================================

SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @sale_date = STR_TO_DATE(@delivery_date, '%m/%d/%Y');
SET @settlement_qty = 39.72;

-- 创建临时表
DROP TEMPORARY TABLE IF EXISTS tmp_test_production_records;

CREATE TEMPORARY TABLE tmp_test_production_records (
    id INT,
    production_date VARCHAR(50),
    prod_qty DECIMAL(18, 2),
    unit_cost DECIMAL(18, 2),
    INDEX idx_id (id)
);

-- 插入数据
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
WHERE p.product_name COLLATE utf8mb4_unicode_ci = @product_name COLLATE utf8mb4_unicode_ci
  AND (@product_warehouse IS NULL OR p.product_warehouse COLLATE utf8mb4_unicode_ci = @product_warehouse COLLATE utf8mb4_unicode_ci OR p.product_warehouse = '')
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
        WHEN STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(p.production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(p.production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(p.production_date, '%d/%m/%Y')
        WHEN STR_TO_DATE(p.production_date, '%Y/%m/%d') IS NOT NULL
        THEN STR_TO_DATE(p.production_date, '%Y/%m/%d')
        ELSE DATE('1900-01-01')
    END DESC;

-- 检查临时表中的记录数
SELECT COUNT(*) as total_records FROM tmp_test_production_records;

-- 测试游标的 ORDER BY（模拟游标查询）
SELECT 
    id,
    production_date,
    prod_qty,
    unit_cost,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y')
        WHEN STR_TO_DATE(production_date, '%Y/%m/%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y/%m/%d')
        ELSE DATE('1900-01-01')
    END as parsed_date
FROM tmp_test_production_records
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y')
        WHEN STR_TO_DATE(production_date, '%Y/%m/%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y/%m/%d')
        ELSE DATE('1900-01-01')
    END DESC
LIMIT 10;

-- 模拟 LIFO 计算（手动计算前几条记录）
SELECT 
    id,
    production_date,
    prod_qty,
    unit_cost,
    @settlement_qty as remaining_qty,
    LEAST(prod_qty, @settlement_qty) as used_qty,
    LEAST(prod_qty, @settlement_qty) * unit_cost as record_cost
FROM tmp_test_production_records
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y')
        WHEN STR_TO_DATE(production_date, '%Y/%m/%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y/%m/%d')
        ELSE DATE('1900-01-01')
    END DESC
LIMIT 5;

DROP TEMPORARY TABLE IF EXISTS tmp_test_production_records;
