-- ============================================
-- 调试存储过程 - 逐步检查问题
-- ============================================

-- 步骤 1: 检查日期解析
SELECT 
    '1/17/2026' as input_date,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_yyyymmdd,
    STR_TO_DATE('1/17/2026', '%d/%m/%Y') as parsed_ddmmyyyy;

-- 步骤 2: 检查是否有匹配的生产记录（使用与存储过程相同的逻辑）
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @sale_date = STR_TO_DATE('1/17/2026', '%m/%d/%Y');

SELECT 
    COUNT(*) as matching_records,
    SUM(COALESCE(dailyProcess_qty, 0)) as total_qty
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
  AND (
      CASE 
          WHEN STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL 
          THEN STR_TO_DATE(p.production_date, '%m/%d/%Y')
          WHEN STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL
          THEN STR_TO_DATE(p.production_date, '%Y-%m-%d')
          WHEN STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL
          THEN STR_TO_DATE(p.production_date, '%d/%m/%Y')
          ELSE NULL
      END <= @sale_date
  );

-- 步骤 3: 查看前10条匹配的记录
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    dailyProcess_qty,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%d/%m/%Y')
        ELSE NULL
    END as parsed_date,
    -- 计算单位成本
    CASE 
        WHEN COALESCE(dailyProcess_qty, 0) > 0 THEN
            (
                COALESCE(M1_qty * M1_price, 0) +
                COALESCE(M2_qty * M2_price, 0) +
                COALESCE(M3_qty * M3_price, 0) +
                COALESCE(M4_qty * M4_price, 0) +
                COALESCE(M5_qty * M5_price, 0) +
                COALESCE(M6_qty * M6_price, 0) +
                COALESCE(M7_qty * M7_price, 0) +
                COALESCE(M8_qty * M8_price, 0) +
                COALESCE(M9_qty * M9_price, 0) +
                COALESCE(wireRope_qty * wireRope_price, 0) +
                COALESCE(carShell_qty * carShell_price, 0) +
                COALESCE(pigIron_qty * pigIron_price, 0) +
                COALESCE(scrap_qty * scrap_price, 0) +
                COALESCE(carDismantle_qty * carDismantle_price, 0) +
                COALESCE(transfer_qty * transfer_price, 0) +
                COALESCE(auxiliary_qty * auxiliary_price, 0) +
                COALESCE(material1_qty * material1_price, 0) +
                COALESCE(material2_qty * material2_price, 0) +
                COALESCE(material3_qty * material3_price, 0) +
                COALESCE(material4_qty * material4_price, 0) +
                COALESCE(material5_qty * material5_price, 0)
            ) / GREATEST(COALESCE(dailyProcess_qty, 1), 1)
        ELSE 0
    END as unit_cost
FROM ProcessingCostInput p
WHERE p.product_name = @product_name
  AND (p.product_warehouse IS NULL OR p.product_warehouse = @product_warehouse OR p.product_warehouse = '')
  AND p.production_date IS NOT NULL
  AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
  AND (
      CASE 
          WHEN STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL 
          THEN STR_TO_DATE(p.production_date, '%m/%d/%Y')
          WHEN STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL
          THEN STR_TO_DATE(p.production_date, '%Y-%m-%d')
          WHEN STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL
          THEN STR_TO_DATE(p.production_date, '%d/%m/%Y')
          ELSE NULL
      END <= @sale_date
  )
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(p.production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(p.production_date, '%Y-%m-%d')
        ELSE STR_TO_DATE(p.production_date, '%d/%m/%Y')
    END DESC
LIMIT 10;
