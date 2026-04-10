-- ============================================
-- 调试 LIFO 计算问题
-- ============================================

-- 1. 检查是否有匹配的生产记录
SELECT 
    id,
    product_name,
    product_warehouse,
    production_date,
    dailyProcess_qty,
    M1_qty, M1_price,
    M2_qty, M2_price,
    M3_qty, M3_price
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL)
  AND production_date IS NOT NULL
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        ELSE STR_TO_DATE(production_date, '%d/%m/%Y')
    END DESC
LIMIT 10;

-- 2. 检查销售日期解析
SELECT 
    '1/17/2026' as delivery_date_str,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_date_1,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_date_2,
    STR_TO_DATE('1/17/2026', '%d/%m/%Y') as parsed_date_3;

-- 3. 检查生产日期是否在销售日期之前
SELECT 
    id,
    product_name,
    production_date,
    STR_TO_DATE(production_date, '%m/%d/%Y') as parsed_prod_date,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as sale_date,
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') <= STR_TO_DATE('1/17/2026', '%m/%d/%Y') THEN 'YES'
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') <= STR_TO_DATE('1/17/2026', '%m/%d/%Y') THEN 'YES'
        ELSE 'NO'
    END as is_before_sale
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL)
  AND production_date IS NOT NULL
LIMIT 10;

-- 4. 检查材料成本计算
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
    ) as total_material_cost,
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
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL)
  AND production_date IS NOT NULL
  AND (
      STR_TO_DATE(production_date, '%m/%d/%Y') <= STR_TO_DATE('1/17/2026', '%m/%d/%Y')
      OR STR_TO_DATE(production_date, '%Y-%m-%d') <= STR_TO_DATE('1/17/2026', '%m/%d/%Y')
      OR STR_TO_DATE(production_date, '%d/%m/%Y') <= STR_TO_DATE('1/17/2026', '%m/%d/%Y')
  )
ORDER BY 
    CASE 
        WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
        THEN STR_TO_DATE(production_date, '%m/%d/%Y')
        WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
        THEN STR_TO_DATE(production_date, '%Y-%m-%d')
        ELSE STR_TO_DATE(production_date, '%d/%m/%Y')
    END DESC
LIMIT 10;
