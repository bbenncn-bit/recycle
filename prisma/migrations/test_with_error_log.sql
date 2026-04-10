-- ============================================
-- 测试存储过程并检查是否有错误被捕获
-- ============================================

-- 创建一个临时表来记录错误（如果存储过程支持的话）
-- 注意：由于 EXIT HANDLER 会捕获所有错误，我们需要检查是否有错误发生

-- 测试存储过程
SET @delivery_num = 'FH2601170003';
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @settlement_qty = 39.72;
SET @material_cost = 0;
SET @material_composition = JSON_ARRAY();
SET @production_records = JSON_ARRAY();

-- 调用存储过程
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

-- 查看结果
SELECT 
    @material_cost as material_cost,
    @material_composition as material_composition,
    @production_records as production_records,
    CASE 
        WHEN @material_cost = 0 AND JSON_LENGTH(@production_records) = 0 THEN '可能被错误处理捕获'
        ELSE '正常'
    END as status;
