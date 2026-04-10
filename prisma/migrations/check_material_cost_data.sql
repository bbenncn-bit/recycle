-- ============================================
-- 检查材料成本数据
-- ============================================

-- 检查有材料成本但 dailyProcess_qty 为 0 的记录
SELECT 
    id,
    product_name,
    production_date,
    dailyProcess_qty,
    -- 计算总材料成本
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
    ) as total_material_cost
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND product_warehouse = 'A1'
  AND production_date IS NOT NULL
  AND production_date != ''
  AND (
      STR_TO_DATE(production_date, '%m/%d/%Y') <= STR_TO_DATE('1/17/2026', '%m/%d/%Y')
      OR STR_TO_DATE(production_date, '%Y-%m-%d') <= STR_TO_DATE('1/17/2026', '%m/%d/%Y')
  )
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        ELSE STR_TO_DATE(production_date, '%Y-%m-%d')
    END DESC
LIMIT 20;

-- 检查 dailyProcess_qty > 0 的记录数量
SELECT 
    COUNT(*) as records_with_qty,
    SUM(dailyProcess_qty) as total_qty
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND product_warehouse = 'A1'
  AND production_date IS NOT NULL
  AND production_date != ''
  AND dailyProcess_qty > 0
  AND (
      CASE 
          WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
          THEN STR_TO_DATE(production_date, '%m/%d/%Y')
          WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
          THEN STR_TO_DATE(production_date, '%Y-%m-%d')
          WHEN STR_TO_DATE(production_date, '%d/%m/%Y') IS NOT NULL
          THEN STR_TO_DATE(production_date, '%d/%m/%Y')
          ELSE NULL
      END <= STR_TO_DATE('1/17/2026', '%m/%d/%Y')
  );
