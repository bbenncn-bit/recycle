-- ============================================
-- 修复日期解析问题
-- ============================================
-- 问题：在 WHERE 子句中使用 CASE 表达式进行日期比较时，如果所有格式都不匹配，会返回 NULL
-- 解决：改用 OR 条件分别检查每种日期格式

-- 步骤 1: 删除旧的存储过程
DROP PROCEDURE IF EXISTS `sp_calculate_lifo_material_cost`;
DROP PROCEDURE IF EXISTS `sp_update_material_cost_cache`;
DROP PROCEDURE IF EXISTS `sp_debug_lifo_calculation`;

-- 步骤 2: 重新执行完整的 material_cost_cache_mysql_event.sql 文件
-- （已修复：改用 OR 条件进行日期比较）

-- 步骤 3: 测试日期解析
SELECT 
    '1/17/2026' as test_date,
    STR_TO_DATE('1/17/2026', '%m/%d/%Y') as parsed_mmddyyyy,
    STR_TO_DATE('1/17/2026', '%Y-%m-%d') as parsed_yyyymmdd,
    STR_TO_DATE('1/17/2026', '%d/%m/%Y') as parsed_ddmmyyyy;

-- 步骤 4: 测试修复后的存储过程
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
