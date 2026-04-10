-- ============================================
-- 测试 COALESCE 在 ORDER BY 中的使用
-- ============================================

-- 测试 1: 检查 MySQL 的 sql_mode
SELECT @@sql_mode;

-- 测试 2: 测试 COALESCE 在 ORDER BY 中的使用
DROP TEMPORARY TABLE IF EXISTS tmp_test_coalesce;

CREATE TEMPORARY TABLE tmp_test_coalesce (
    id INT,
    production_date VARCHAR(50),
    prod_qty DECIMAL(18, 2)
);

INSERT INTO tmp_test_coalesce (id, production_date, prod_qty)
VALUES 
    (1, '07/01/2025', 10.5),
    (2, '07/02/2025', 20.3),
    (3, '07/03/2025', 15.8),
    (4, '2025-07-04', 12.0);

SELECT 
    id,
    production_date,
    prod_qty,
    COALESCE(
        STR_TO_DATE(production_date, '%m/%d/%Y'),
        STR_TO_DATE(production_date, '%Y-%m-%d'),
        STR_TO_DATE(production_date, '%d/%m/%Y'),
        STR_TO_DATE(production_date, '%Y/%m/%d'),
        CAST('1900-01-01' AS DATE)
    ) as parsed_date
FROM tmp_test_coalesce
ORDER BY 
    COALESCE(
        STR_TO_DATE(production_date, '%m/%d/%Y'),
        STR_TO_DATE(production_date, '%Y-%m-%d'),
        STR_TO_DATE(production_date, '%d/%m/%Y'),
        STR_TO_DATE(production_date, '%Y/%m/%d'),
        CAST('1900-01-01' AS DATE)
    ) DESC;

DROP TEMPORARY TABLE IF EXISTS tmp_test_coalesce;
