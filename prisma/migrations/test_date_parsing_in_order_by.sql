-- ============================================
-- 测试 ORDER BY 中的日期解析
-- ============================================

-- 测试 1: 直接测试日期解析
SELECT 
    '1/17/2026' as test_date,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_yyyymmdd;

-- 测试 2: 测试 ORDER BY 中的 CASE 表达式
SELECT 
    '07/01/2025' as production_date,
    CASE 
        WHEN STR_TO_DATE('07/01/2025', '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE('07/01/2025', '%m/%d/%Y')
        WHEN STR_TO_DATE('07/01/2025', '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE('07/01/2025', '%Y-%m-%d')
        WHEN STR_TO_DATE('07/01/2025', '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE('07/01/2025', '%d/%m/%Y')
        WHEN STR_TO_DATE('07/01/2025', '%Y/%m/%d') IS NOT NULL
        THEN STR_TO_DATE('07/01/2025', '%Y/%m/%d')
        ELSE CAST('1900-01-01' AS DATE)
    END as parsed_date;

-- 测试 3: 测试在临时表中的 ORDER BY
DROP TEMPORARY TABLE IF EXISTS tmp_test_order_by;

CREATE TEMPORARY TABLE tmp_test_order_by (
    id INT,
    production_date VARCHAR(50),
    prod_qty DECIMAL(18, 2)
);

INSERT INTO tmp_test_order_by (id, production_date, prod_qty)
VALUES 
    (1, '07/01/2025', 10.5),
    (2, '07/02/2025', 20.3),
    (3, '07/03/2025', 15.8);

SELECT 
    id,
    production_date,
    prod_qty,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y')
        WHEN STR_TO_DATE(production_date, '%Y/%m/%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y/%m/%d')
        ELSE CAST('1900-01-01' AS DATE)
    END as parsed_date
FROM tmp_test_order_by
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
        ELSE CAST('1900-01-01' AS DATE)
    END DESC;

DROP TEMPORARY TABLE IF EXISTS tmp_test_order_by;
