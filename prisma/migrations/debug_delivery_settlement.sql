-- ============================================
-- 调试脚本：检查 DeliverySettlement 表数据
-- ============================================
-- 用于诊断为什么存储过程返回 0 条记录

-- 1. 查看表结构
DESCRIBE DeliverySettlement;

-- 2. 查看 delivery_date 字段的数据类型和示例数据
SELECT 
    delivery_date,
    delivery_number,
    product_type,
    settlement_quantity,
    CASE 
        WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL THEN 'YYYY-MM-DD'
        WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL THEN 'MM/DD/YYYY'
        WHEN STR_TO_DATE(delivery_date, '%Y/%m/%d') IS NOT NULL THEN 'YYYY/MM/DD'
        ELSE 'UNKNOWN'
    END as date_format
FROM DeliverySettlement
LIMIT 10;

-- 3. 统计不同日期格式的数量
SELECT 
    CASE 
        WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL THEN 'YYYY-MM-DD'
        WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL THEN 'MM/DD/YYYY'
        WHEN STR_TO_DATE(delivery_date, '%Y/%m/%d') IS NOT NULL THEN 'YYYY/MM/DD'
        ELSE 'UNKNOWN'
    END as date_format,
    COUNT(*) as count
FROM DeliverySettlement
WHERE delivery_date IS NOT NULL
GROUP BY date_format;

-- 4. 查看日期范围
SELECT 
    MIN(
        CASE 
            WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%Y-%m-%d')
            WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%m/%d/%Y')
            ELSE STR_TO_DATE(delivery_date, '%Y/%m/%d')
        END
    ) as min_date,
    MAX(
        CASE 
            WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%Y-%m-%d')
            WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL 
            THEN STR_TO_DATE(delivery_date, '%m/%d/%Y')
            ELSE STR_TO_DATE(delivery_date, '%Y/%m/%d')
        END
    ) as max_date,
    COUNT(*) as total_records
FROM DeliverySettlement
WHERE delivery_date IS NOT NULL
  AND settlement_quantity IS NOT NULL
  AND settlement_quantity > 0;

-- 5. 测试查询条件（模拟存储过程的查询）
SELECT 
    delivery_number,
    product_type,
    warehouse,
    delivery_date,
    settlement_quantity
FROM DeliverySettlement
WHERE (
    STR_TO_DATE(delivery_date, '%Y-%m-%d') >= '2025-01-01'
    OR STR_TO_DATE(delivery_date, '%m/%d/%Y') >= '2025-01-01'
    OR STR_TO_DATE(delivery_date, '%Y/%m/%d') >= '2025-01-01'
)
AND (
    STR_TO_DATE(delivery_date, '%Y-%m-%d') <= CURDATE()
    OR STR_TO_DATE(delivery_date, '%m/%d/%Y') <= CURDATE()
    OR STR_TO_DATE(delivery_date, '%Y/%m/%d') <= CURDATE()
)
AND settlement_quantity IS NOT NULL
AND settlement_quantity > 0
AND delivery_number IS NOT NULL
AND product_type IS NOT NULL
LIMIT 10;
