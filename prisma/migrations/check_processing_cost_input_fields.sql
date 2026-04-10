-- ============================================
-- 检查 ProcessingCostInput 表的实际字段
-- ============================================
-- 请执行此 SQL，查看 ProcessingCostInput 表的实际字段名

-- 1. 查看表结构
DESCRIBE ProcessingCostInput;

-- 2. 查看所有字段名
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pls'
  AND TABLE_NAME = 'ProcessingCostInput'
ORDER BY ORDINAL_POSITION;

-- 3. 查看示例数据（检查字段名和格式）
SELECT *
FROM ProcessingCostInput
LIMIT 1;

-- 4. 检查关键字段是否存在
SELECT 
    CASE WHEN COUNT(*) > 0 THEN '存在' ELSE '不存在' END as status,
    'dailyProcess_qty' as field_name
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pls'
  AND TABLE_NAME = 'ProcessingCostInput'
  AND COLUMN_NAME = 'dailyProcess_qty'

UNION ALL

SELECT 
    CASE WHEN COUNT(*) > 0 THEN '存在' ELSE '不存在' END,
    'product_tons'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pls'
  AND TABLE_NAME = 'ProcessingCostInput'
  AND COLUMN_NAME = 'product_tons'

UNION ALL

SELECT 
    CASE WHEN COUNT(*) > 0 THEN '存在' ELSE '不存在' END,
    'M1_qty'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pls'
  AND TABLE_NAME = 'ProcessingCostInput'
  AND COLUMN_NAME = 'M1_qty'

UNION ALL

SELECT 
    CASE WHEN COUNT(*) > 0 THEN '存在' ELSE '不存在' END,
    'M1_price'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pls'
  AND TABLE_NAME = 'ProcessingCostInput'
  AND COLUMN_NAME = 'M1_price';
