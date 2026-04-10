-- ============================================
-- 最终修复和测试脚本
-- ============================================

-- 步骤 1: 删除旧的存储过程
DROP PROCEDURE IF EXISTS `sp_calculate_lifo_material_cost`;
DROP PROCEDURE IF EXISTS `sp_update_material_cost_cache`;

-- 步骤 2: 重新执行完整的 material_cost_cache_mysql_event.sql 文件
-- （已修复：添加了 dailyProcess_qty > 0 的过滤条件）

-- 步骤 3: 检查有效生产记录数量
SELECT 
    COUNT(*) as valid_records,
    SUM(dailyProcess_qty) as total_qty
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND product_warehouse = 'A1'
  AND production_date IS NOT NULL
  AND production_date != ''
  AND COALESCE(dailyProcess_qty, 0) > 0
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

-- 步骤 4: 测试单个订单的计算
SET @delivery_num = 'FH2601170003';
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @settlement_qty = 39.72;
SET @material_cost = 0;
SET @material_composition = JSON_ARRAY();
SET @production_records = JSON_ARRAY();

CALL sp_calculate_lifo_material_cost(
    @delivery_num,
    @product_name,
    @product_warehouse,
    @delivery_date,
    @settlement_qty,
    @material_cost,
    @material_composition,
    @production_records
);

SELECT 
    @material_cost as material_cost,
    @material_composition as material_composition,
    @production_records as production_records;
