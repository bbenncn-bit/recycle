-- ============================================
-- 测试安全的日期解析方式
-- ============================================

-- 测试 1: 检查 MySQL 的 sql_mode
SELECT @@sql_mode;

-- 测试 2: 测试 COALESCE 中的日期解析
SELECT 
    '07/01/2025' as production_date,
    COALESCE(
        STR_TO_DATE('07/01/2025', '%m/%d/%Y'),
        STR_TO_DATE('07/01/2025', '%Y-%m-%d'),
        STR_TO_DATE('07/01/2025', '%d/%m/%Y'),
        STR_TO_DATE('07/01/2025', '%Y/%m/%d'),
        CAST('1900-01-01' AS DATE)
    ) as parsed_date;

-- 测试 3: 测试在 ORDER BY 中使用 COALESCE
DROP TEMPORARY TABLE IF EXISTS tmp_test_safe;

CREATE TEMPORARY TABLE tmp_test_safe (
    id INT,
    production_date VARCHAR(50)
);

INSERT INTO tmp_test_safe (id, production_date)
VALUES 
    (1, '07/01/2025'),
    (2, '2025-07-02'),
    (3, '01/07/2025');

SELECT 
    id,
    production_date
FROM tmp_test_safe
ORDER BY 
    COALESCE(
        STR_TO_DATE(production_date, '%m/%d/%Y'),
        STR_TO_DATE(production_date, '%Y-%m-%d'),
        STR_TO_DATE(production_date, '%d/%m/%Y'),
        STR_TO_DATE(production_date, '%Y/%m/%d'),
        CAST('1900-01-01' AS DATE)
    ) DESC;

DROP TEMPORARY TABLE IF EXISTS tmp_test_safe;
