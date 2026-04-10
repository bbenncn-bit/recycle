-- ============================================
-- 测试安全的日期计算方式
-- ============================================

-- 测试：在 SELECT 中使用 CASE 表达式计算日期
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

-- 测试：使用 IFNULL 和多个条件
SELECT 
    '07/01/2025' as production_date,
    IFNULL(
        NULLIF(STR_TO_DATE('07/01/2025', '%m/%d/%Y'), '0000-00-00'),
        IFNULL(
            NULLIF(STR_TO_DATE('07/01/2025', '%Y-%m-%d'), '0000-00-00'),
            IFNULL(
                NULLIF(STR_TO_DATE('07/01/2025', '%d/%m/%Y'), '0000-00-00'),
                IFNULL(
                    NULLIF(STR_TO_DATE('07/01/2025', '%Y/%m/%d'), '0000-00-00'),
                    CAST('1900-01-01' AS DATE)
                )
            )
        )
    ) as parsed_date;
