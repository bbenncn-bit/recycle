-- ============================================
-- 创建调试版本的存储过程
-- ============================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_debug_lifo_calculation`;

CREATE PROCEDURE `sp_debug_lifo_calculation`(
    IN p_delivery_number VARCHAR(100),
    IN p_product_name VARCHAR(100),
    IN p_product_warehouse VARCHAR(100),
    IN p_delivery_date VARCHAR(50),
    IN p_settlement_quantity DECIMAL(18, 2)
)
BEGIN
    DECLARE v_sale_date DATE;
    DECLARE v_record_count INT DEFAULT 0;
    
    -- 解析销售日期
    SET v_sale_date = STR_TO_DATE(p_delivery_date, '%Y-%m-%d');
    IF v_sale_date IS NULL THEN
        SET v_sale_date = STR_TO_DATE(p_delivery_date, '%m/%d/%Y');
    END IF;
    IF v_sale_date IS NULL THEN
        SET v_sale_date = STR_TO_DATE(p_delivery_date, '%Y/%m/%d');
    END IF;
    IF v_sale_date IS NULL THEN
        SET v_sale_date = STR_TO_DATE(p_delivery_date, '%d/%m/%Y');
    END IF;
    
    -- 创建临时表
    DROP TEMPORARY TABLE IF EXISTS tmp_production_records;
    
    CREATE TEMPORARY TABLE tmp_production_records (
        id INT,
        production_date VARCHAR(50),
        prod_qty DECIMAL(18, 2),
        unit_cost DECIMAL(18, 2),
        INDEX idx_id (id)
    );
    
    -- 查询并插入生产记录
    INSERT INTO tmp_production_records (id, production_date, prod_qty, unit_cost)
    SELECT 
        p.id,
        p.production_date,
        COALESCE(p.dailyProcess_qty, 0) as prod_qty,
        CASE 
            WHEN COALESCE(p.dailyProcess_qty, 0) > 0 THEN
                (
                    COALESCE(p.M1_qty * p.M1_price, 0) +
                    COALESCE(p.M2_qty * p.M2_price, 0) +
                    COALESCE(p.M3_qty * p.M3_price, 0) +
                    COALESCE(p.M4_qty * p.M4_price, 0) +
                    COALESCE(p.M5_qty * p.M5_price, 0) +
                    COALESCE(p.M6_qty * p.M6_price, 0) +
                    COALESCE(p.M7_qty * p.M7_price, 0) +
                    COALESCE(p.M8_qty * p.M8_price, 0) +
                    COALESCE(p.M9_qty * p.M9_price, 0) +
                    COALESCE(p.wireRope_qty * p.wireRope_price, 0) +
                    COALESCE(p.carShell_qty * p.carShell_price, 0) +
                    COALESCE(p.pigIron_qty * p.pigIron_price, 0) +
                    COALESCE(p.scrap_qty * p.scrap_price, 0) +
                    COALESCE(p.carDismantle_qty * p.carDismantle_price, 0) +
                    COALESCE(p.transfer_qty * p.transfer_price, 0) +
                    COALESCE(p.auxiliary_qty * p.auxiliary_price, 0) +
                    COALESCE(p.material1_qty * p.material1_price, 0) +
                    COALESCE(p.material2_qty * p.material2_price, 0) +
                    COALESCE(p.material3_qty * p.material3_price, 0) +
                    COALESCE(p.material4_qty * p.material4_price, 0) +
                    COALESCE(p.material5_qty * p.material5_price, 0)
                ) / GREATEST(COALESCE(p.dailyProcess_qty, 1), 1)
            ELSE 0
        END as unit_cost
    FROM ProcessingCostInput p
    WHERE p.product_name = p_product_name
      AND (p_product_warehouse IS NULL OR p.product_warehouse = p_product_warehouse OR p.product_warehouse = '')
      AND p.production_date IS NOT NULL
      AND p.production_date != ''
      AND COALESCE(p.dailyProcess_qty, 0) > 0
      AND (
          (STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%m/%d/%Y') <= v_sale_date)
          OR (STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL AND STR_TO_DATE(p.production_date, '%Y-%m-%d') <= v_sale_date)
          OR (STR_TO_DATE(p.production_date, '%d/%m/%Y') IS NOT NULL AND STR_TO_DATE(p.production_date, '%d/%m/%Y') <= v_sale_date)
      );
    
    -- 检查临时表中的记录数
    SELECT COUNT(*) INTO v_record_count FROM tmp_production_records;
    
    -- 返回调试信息
    SELECT 
        p_delivery_date as input_delivery_date,
        v_sale_date as parsed_sale_date,
        p_product_name as product_name,
        p_product_warehouse as product_warehouse,
        p_settlement_quantity as settlement_quantity,
        v_record_count as records_in_temp_table;
    
    -- 显示临时表中的数据
    SELECT 
        id,
        production_date,
        prod_qty,
        unit_cost
    FROM tmp_production_records
    ORDER BY 
        CASE 
            WHEN STR_TO_DATE(production_date, '%m/%d/%Y') IS NOT NULL 
            THEN STR_TO_DATE(production_date, '%m/%d/%Y')
            WHEN STR_TO_DATE(production_date, '%Y-%m-%d') IS NOT NULL
            THEN STR_TO_DATE(production_date, '%Y-%m-%d')
            ELSE STR_TO_DATE(production_date, '%d/%m/%Y')
        END DESC
    LIMIT 10;
    
    -- 清理临时表
    DROP TEMPORARY TABLE IF EXISTS tmp_production_records;
END$$

DELIMITER ;

-- 测试调试存储过程
CALL sp_debug_lifo_calculation(
    'FH2601170003',
    '吉钢散料',
    'A1',
    '1/17/2026',
    39.72
);
