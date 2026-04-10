-- ============================================
-- 测试 STR_TO_DATE 函数
-- ============================================

-- 测试 1: 直接测试日期解析
SELECT 
    '1/17/2026' as test_date,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_yyyymmdd,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE('1/17/2026', '%Y/%m/%d') as parsed_yyyymmdd2,
    STR_TO_DATE('1/17/2026', '%d/%m/%Y') as parsed_ddmmyyyy;

-- 测试 2: 测试在 CASE 表达式中的日期解析
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

-- 测试 3: 检查 MySQL 的 sql_mode
SELECT @@sql_mode;

-- 测试 4: 测试在 ORDER BY 中使用 CASE 表达式
SELECT 
    '07/01/2025' as production_date
FROM (SELECT 1 as dummy) t
ORDER BY 
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
    END DESC;
