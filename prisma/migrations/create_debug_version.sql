-- ============================================
-- 创建调试版本的存储过程 - 添加错误日志
-- ============================================
-- 这个版本会在出错时输出错误信息，帮助定位问题

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_calculate_lifo_material_cost_debug`;

CREATE PROCEDURE `sp_calculate_lifo_material_cost_debug`(
    IN p_delivery_number VARCHAR(100),
    IN p_product_name VARCHAR(100),
    IN p_product_warehouse VARCHAR(100),
    IN p_delivery_date VARCHAR(50),
    IN p_settlement_quantity DECIMAL(18, 2),
    OUT p_material_cost DECIMAL(18, 2),
    OUT p_material_composition JSON,
    OUT p_production_records JSON
)
BEGIN
    DECLARE v_remaining_qty DECIMAL(18, 2);
    DECLARE v_total_cost DECIMAL(18, 2) DEFAULT 0;
    DECLARE v_prod_id INT;
    DECLARE v_prod_date VARCHAR(50);
    DECLARE v_prod_qty DECIMAL(18, 2);
    DECLARE v_unit_cost DECIMAL(18, 2);
    DECLARE v_record_cost DECIMAL(18, 2);
    DECLARE v_used_qty DECIMAL(18, 2);
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_sale_date DATE;
    DECLARE v_sql_error TEXT DEFAULT NULL;
    DECLARE v_temp_count INT DEFAULT 0;
    
    -- 材料构成汇总
    DECLARE v_records_array JSON DEFAULT JSON_ARRAY();
    DECLARE v_composition_array JSON DEFAULT JSON_ARRAY();
    
    -- 错误处理：输出错误信息而不是静默返回
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_sql_error = MESSAGE_TEXT;
        -- 输出错误信息
        SELECT CONCAT('错误: ', v_sql_error) as error_message;
        -- 设置默认值
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    END;
    
    -- 解析销售日期（使用更安全的方式，避免在严格模式下出错）
    -- 注意：日期格式可能是 M/D/YYYY 或 MM/DD/YYYY（单数字或双数字）
    SET v_sale_date = NULL;
    
    -- 尝试 YYYY-MM-DD 格式
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
        SET v_sale_date = STR_TO_DATE(p_delivery_date, '%Y-%m-%d');
    END;
    
    -- 尝试 MM/DD/YYYY 或 M/D/YYYY 格式（使用 %m/%d/%Y 可以处理单数字和双数字）
    IF v_sale_date IS NULL THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            SET v_sale_date = STR_TO_DATE(p_delivery_date, '%m/%d/%Y');
        END;
    END IF;
    
    -- 尝试 YYYY/MM/DD 格式
    IF v_sale_date IS NULL THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            SET v_sale_date = STR_TO_DATE(p_delivery_date, '%Y/%m/%d');
        END;
    END IF;
    
    -- 尝试 DD/MM/YYYY 格式
    IF v_sale_date IS NULL THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            SET v_sale_date = STR_TO_DATE(p_delivery_date, '%d/%m/%Y');
        END;
    END IF;
    
    -- 初始化
    SET v_remaining_qty = IFNULL(p_settlement_quantity, 0);
    SET v_total_cost = 0;
    SET v_records_array = JSON_ARRAY();
    SET v_composition_array = JSON_ARRAY();
    
    -- 调试信息
    SELECT CONCAT('销售日期解析: ', IFNULL(v_sale_date, 'NULL'), ', 销售数量: ', v_remaining_qty) as debug_info;
    
    -- 如果销售数量 <= 0 或日期解析失败，直接返回
    IF v_remaining_qty <= 0 THEN
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    ELSEIF v_sale_date IS NULL THEN
        SELECT '错误: 日期解析失败' as error_message;
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    ELSE
        -- 使用临时表存储生产记录
        DROP TEMPORARY TABLE IF EXISTS tmp_production_records;
        
        CREATE TEMPORARY TABLE tmp_production_records (
            id INT,
            production_date VARCHAR(50),
            prod_qty DECIMAL(18, 2),
            unit_cost DECIMAL(18, 2),
            parsed_production_date DATE,
            INDEX idx_id (id),
            INDEX idx_parsed_date (parsed_production_date)
        );
        
        -- 查询并插入生产记录
        INSERT INTO tmp_production_records (id, production_date, prod_qty, unit_cost, parsed_production_date)
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
            END as unit_cost,
            -- 添加一个计算好的日期字段用于排序
            -- 注意：由于生产日期主要是 MM/DD/YYYY 格式（如 07/01/2025），优先使用此格式
            -- 使用 COALESCE 和条件检查，避免在严格模式下出错
            COALESCE(
                CASE 
                    WHEN p.production_date LIKE '%/%' AND p.production_date NOT LIKE '%-%' 
                    THEN STR_TO_DATE(p.production_date, '%m/%d/%Y')
                    ELSE NULL
                END,
                CASE 
                    WHEN p.production_date LIKE '%-%' 
                    THEN STR_TO_DATE(p.production_date, '%Y-%m-%d')
                    ELSE NULL
                END,
                CAST('1900-01-01' AS DATE)
            ) as parsed_production_date
        FROM ProcessingCostInput p
        WHERE p.product_name COLLATE utf8mb4_unicode_ci = p_product_name COLLATE utf8mb4_unicode_ci
          AND (p_product_warehouse IS NULL OR p.product_warehouse COLLATE utf8mb4_unicode_ci = p_product_warehouse COLLATE utf8mb4_unicode_ci OR p.product_warehouse = '')
          AND p.production_date IS NOT NULL
          AND p.production_date != ''
          AND COALESCE(p.dailyProcess_qty, 0) > 0
          AND (
              -- 使用 LIKE 条件先检查格式，避免在严格模式下出错
              (p.production_date LIKE '%/%' AND p.production_date NOT LIKE '%-%' 
               AND STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL 
               AND STR_TO_DATE(p.production_date, '%m/%d/%Y') <= v_sale_date)
              OR 
              (p.production_date LIKE '%-%' 
               AND STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL 
               AND STR_TO_DATE(p.production_date, '%Y-%m-%d') <= v_sale_date)
          )
        ORDER BY parsed_production_date DESC;
        
        -- 检查临时表中的记录数
        SELECT COUNT(*) INTO v_temp_count FROM tmp_production_records;
        SELECT CONCAT('临时表记录数: ', v_temp_count) as debug_info;
        
        -- 如果临时表为空，直接返回
        IF v_temp_count = 0 THEN
            SELECT '警告: 临时表为空，没有匹配的生产记录' as warning_message;
            SET p_material_cost = 0;
            SET p_material_composition = JSON_ARRAY();
            SET p_production_records = JSON_ARRAY();
        ELSE
            -- 游标：按 LIFO 原则分配
            BEGIN
                DECLARE cur_production CURSOR FOR
                    SELECT id, production_date, prod_qty, unit_cost
                    FROM tmp_production_records
                    ORDER BY parsed_production_date DESC;
                
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
                
                SET v_done = 0;
                
                OPEN cur_production;
                
                read_loop: LOOP
                    FETCH cur_production INTO v_prod_id, v_prod_date, v_prod_qty, v_unit_cost;
                    
                    IF v_done = 1 THEN
                        LEAVE read_loop;
                    END IF;
                    
                    IF v_remaining_qty <= 0 THEN
                        LEAVE read_loop;
                    END IF;
                    
                    SET v_used_qty = LEAST(v_prod_qty, v_remaining_qty);
                    SET v_record_cost = v_used_qty * v_unit_cost;
                    SET v_total_cost = v_total_cost + v_record_cost;
                    SET v_remaining_qty = v_remaining_qty - v_used_qty;
                    
                    SET v_records_array = JSON_ARRAY_APPEND(
                        v_records_array,
                        '$',
                        JSON_OBJECT(
                            'id', v_prod_id,
                            'productionDate', v_prod_date,
                            'quantity', v_used_qty,
                            'unitCost', v_unit_cost,
                            'totalCost', v_record_cost
                        )
                    );
                    
                END LOOP;
                
                CLOSE cur_production;
            END;
            
            DROP TEMPORARY TABLE IF EXISTS tmp_production_records;
            
            SET p_material_cost = v_total_cost;
            SET p_production_records = v_records_array;
            SET p_material_composition = JSON_ARRAY();
            
            SELECT CONCAT('计算完成: 总成本=', v_total_cost, ', 记录数=', JSON_LENGTH(v_records_array)) as debug_info;
        END IF;
    END IF;
    
END$$

DELIMITER ;

-- 测试调试版本的存储过程
SET @delivery_num = 'FH2601170003';
SET @product_name = '吉钢散料';
SET @product_warehouse = 'A1';
SET @delivery_date = '1/17/2026';
SET @settlement_qty = 39.72;
SET @material_cost = 0;
SET @material_composition = JSON_ARRAY();
SET @production_records = JSON_ARRAY();

CALL sp_calculate_lifo_material_cost_debug(
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
