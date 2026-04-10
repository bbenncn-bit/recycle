-- ============================================
-- 修复并重新创建存储过程
-- ============================================
-- 问题：ProcessingCostInput 表中没有 product_tons 字段
-- 解决：移除所有对 product_tons 的引用，只使用 dailyProcess_qty

-- 步骤 1: 删除旧的存储过程
DROP PROCEDURE IF EXISTS `sp_calculate_lifo_material_cost`;
DROP PROCEDURE IF EXISTS `sp_update_material_cost_cache`;

-- 步骤 2: 重新执行完整的 material_cost_cache_mysql_event.sql 文件
-- 该文件已经修复了字段问题

-- 步骤 3: 测试单个订单的计算
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
