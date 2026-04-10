-- ============================================
-- 测试简单的日期解析
-- ============================================

-- 测试 1: 直接测试日期解析
SELECT 
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_1,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_2,
    STR_TO_DATE('1/17/2026', '%d/%m/%Y') as parsed_3,
    STR_TO_DATE('1/17/2026', '%Y/%m/%d') as parsed_4;

-- 测试 2: 测试 IFNULL 嵌套
SELECT 
    IFNULL(
        STR_TO_DATE('1/17/2026', '%m/%d/%Y'),
        IFNULL(
            STR_TO_DATE('1/17/2026', '%Y-%m-%d'),
            IFNULL(
                STR_TO_DATE('1/17/2026', '%d/%m/%Y'),
                IFNULL(
                    STR_TO_DATE('1/17/2026', '%Y/%m/%d'),
                    CAST('1900-01-01' AS DATE)
                )
            )
        )
    ) as parsed_date;

-- 测试 3: 检查 MySQL 的 sql_mode 和日期相关设置
SELECT 
    @@sql_mode as sql_mode,
    @@date_format as date_format;
