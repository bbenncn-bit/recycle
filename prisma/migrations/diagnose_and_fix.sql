-- ============================================
-- 诊断和修复脚本
-- ============================================

-- 步骤 1: 检查 ProcessingCostInput 表的实际字段
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pls'
  AND TABLE_NAME = 'ProcessingCostInput'
  AND (
      COLUMN_NAME LIKE '%qty%' 
      OR COLUMN_NAME LIKE '%price%'
      OR COLUMN_NAME LIKE '%tons%'
      OR COLUMN_NAME LIKE '%process%'
  )
ORDER BY COLUMN_NAME;

-- 步骤 2: 查看一条示例记录（检查字段名和值）
SELECT *
FROM ProcessingCostInput
LIMIT 1;

-- 步骤 3: 测试查询（检查哪些字段存在）
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    -- 测试字段是否存在（如果不存在会报错）
    dailyProcess_qty,
    product_tons,
    M1_qty,
    M1_price
FROM ProcessingCostInput
LIMIT 1;
