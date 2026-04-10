-- 诊断：为何 吉钢散料 A1、一类 B1、打包 D2 的材料成本缓存为 0
-- 在运行 sp_update_material_cost_cache 的同一库中执行
-- 说明：表中成品重量使用 dailyProcess_qty 存储，无 product_tons 列

-- 1. 吉钢散料 A1
SELECT '吉钢散料 A1' AS label, id, product_name, product_warehouse, production_date,
       dailyProcess_qty
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
ORDER BY production_date DESC
LIMIT 10;

-- 2. 一类 B1
SELECT '一类 B1' AS label, id, product_name, product_warehouse, production_date,
       dailyProcess_qty
FROM ProcessingCostInput
WHERE product_name = '一类'
  AND (product_warehouse = 'B1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
ORDER BY production_date DESC
LIMIT 10;

-- 3. 打包 D2
SELECT '打包 D2' AS label, id, product_name, product_warehouse, production_date,
       dailyProcess_qty
FROM ProcessingCostInput
WHERE product_name = '打包'
  AND (product_warehouse = 'D2' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
ORDER BY production_date DESC
LIMIT 10;

-- 4. 材料列诊断：LIFO 用 M1_qty*M1_price、wireRope_qty*wireRope_price 等求和算单位成本，
--    若这些列全为 NULL/0，则 unit_cost=0 → material_cost=0。对比 吉钢散料 与 钢筋压块 各一条。
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty,
       COALESCE(M1_qty,0)*COALESCE(M1_price,0) + COALESCE(M2_qty,0)*COALESCE(M2_price,0) + COALESCE(auxiliary_qty,0)*COALESCE(auxiliary_price,0) AS material_cost_sum,
       M1_qty, M1_price, auxiliary_qty, auxiliary_price
FROM ProcessingCostInput
WHERE (product_name = '吉钢散料' AND product_warehouse = 'A1' AND dailyProcess_qty > 0)
   OR (product_name = '钢筋压块' AND product_warehouse = 'C1' AND dailyProcess_qty > 0)
ORDER BY product_name, production_date DESC
LIMIT 5;
