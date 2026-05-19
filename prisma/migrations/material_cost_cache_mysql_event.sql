-- ============================================
-- 材料成本缓存更新 - MySQL 存储过程和事件（历史脚本）
-- ============================================
-- 【已废弃】2026-04 起 ProcessingCostInput 已改为 MSLKM*/MGJKM* 等列；
-- 本文件内 sp_calculate_lifo_material_cost 仍引用 M1~M9，会导致 material_cost=0。
-- 生产环境请：
--   1) 执行 prisma/migrations/20260519_disable_material_cost_cache_mysql_event.sql
--   2) 执行 prisma/migrations/20260519_sp_calculate_lifo_alias_material_columns.sql（可选）
--   3) 使用应用「运维 → 刷新材料成本缓存」（TypeScript LIFO，含成品名别名与同月回退）
-- ============================================
--
-- 【重要】如何更新 MaterialCostCache 表
-- ----------------------------------------
-- 1. 不要直接调用 sp_calculate_lifo_material_cost()（该过程需要 8 个参数，用于单笔订单计算）
-- 2. 应调用 sp_update_material_cost_cache(开始日期, 结束日期)，由它遍历 DeliverySettlement 并写入缓存
--
-- 在 Navicat 中执行（手动刷新缓存，例如 2025-01-01 至今）：
--    CALL sp_update_material_cost_cache('2025-01-01', CURDATE());
--
-- 若只更新最近 7 天：
--    CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE());
--
-- 事件 ev_update_material_cost_cache_daily 会在每天凌晨 2 点自动执行上述逻辑（最近 7 天）
-- ============================================

-- 首先确保事件调度器已启用
-- SET GLOBAL event_scheduler = ON;

DELIMITER $$

-- ============================================
-- 存储过程：计算单个销售订单的 LIFO 材料成本
-- ============================================
DROP PROCEDURE IF EXISTS `sp_calculate_lifo_material_cost`$$

CREATE PROCEDURE `sp_calculate_lifo_material_cost`(
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
    
    -- 材料构成汇总（简化版：只记录总成本，不详细分解）
    DECLARE v_records_array JSON DEFAULT JSON_ARRAY();
    DECLARE v_composition_array JSON DEFAULT JSON_ARRAY();
    
    -- 错误处理：如果字段不存在或其他错误，返回空值
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_sql_error = MESSAGE_TEXT;
        -- 设置默认值
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
        -- 可以选择记录错误到日志表
    END;
    
    -- 解析销售日期（使用更安全的方式，避免在严格模式下出错）
    -- 注意：日期格式可能是 M/D/YYYY 或 MM/DD/YYYY（单数字或双数字）
    SET v_sale_date = NULL;
    
    -- 若传入带时间的字符串（如 '2026-02-01 11:08'），先只取日期部分再解析，避免 Truncated incorrect date value
    IF p_delivery_date IS NOT NULL AND TRIM(p_delivery_date) != '' THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            -- 先尝试取前 10 位按 YYYY-MM-DD 解析（兼容 '2026-02-01' 或 '2026-02-01 11:08'）
            IF TRIM(p_delivery_date) LIKE '%-%' THEN
                SET v_sale_date = STR_TO_DATE(LEFT(TRIM(p_delivery_date), 10), '%Y-%m-%d');
            END IF;
        END;
    END IF;
    -- 尝试 MM/DD/YYYY 或 M/D/YYYY（取前 10 位，兼容带时间）
    IF v_sale_date IS NULL AND p_delivery_date IS NOT NULL AND TRIM(p_delivery_date) != '' THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            IF TRIM(p_delivery_date) LIKE '%/%' AND TRIM(p_delivery_date) NOT LIKE '%-%' THEN
                SET v_sale_date = STR_TO_DATE(LEFT(TRIM(p_delivery_date), 10), '%m/%d/%Y');
            END IF;
        END;
    END IF;
    -- 尝试 YYYY/MM/DD
    IF v_sale_date IS NULL AND p_delivery_date IS NOT NULL AND TRIM(p_delivery_date) != '' THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            SET v_sale_date = STR_TO_DATE(LEFT(TRIM(p_delivery_date), 10), '%Y/%m/%d');
        END;
    END IF;
    -- 尝试 DD/MM/YYYY
    IF v_sale_date IS NULL AND p_delivery_date IS NOT NULL AND TRIM(p_delivery_date) != '' THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            SET v_sale_date = STR_TO_DATE(LEFT(TRIM(p_delivery_date), 10), '%d/%m/%Y');
        END;
    END IF;
    
    -- 初始化
    SET v_remaining_qty = IFNULL(p_settlement_quantity, 0);
    SET v_total_cost = 0;
    SET v_records_array = JSON_ARRAY();
    SET v_composition_array = JSON_ARRAY();
    
    -- 如果销售数量 <= 0 或日期解析失败，直接返回
    IF v_remaining_qty <= 0 THEN
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    ELSEIF v_sale_date IS NULL THEN
        -- 日期解析失败，返回空值
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    ELSE
        -- 使用临时表存储生产记录（按 LIFO 排序）
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
        
        -- 查询并插入生产记录（按生产日期倒序，LIFO）
        -- 注意：如果字段不存在，MySQL 会报错，错误会被 EXIT HANDLER 捕获
        INSERT INTO tmp_production_records (id, production_date, prod_qty, unit_cost, parsed_production_date)
        SELECT 
            p.id,
            p.production_date,
            -- 使用 dailyProcess_qty 作为产量（表中没有 product_tons 字段）
            COALESCE(p.dailyProcess_qty, 0) as prod_qty,
            -- 计算单位成本：所有材料成本总和 / 产量
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
            -- 兼容带时间的值（如 '2026-02-01 11:08'）：只取前 10 位再解析，避免严格模式 Truncated incorrect date value
            COALESCE(
                CASE 
                    WHEN p.production_date LIKE '%/%' AND p.production_date NOT LIKE '%-%' 
                    THEN STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%m/%d/%Y')
                    ELSE NULL
                END,
                CASE 
                    WHEN p.production_date LIKE '%-%' 
                    THEN STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%Y-%m-%d')
                    ELSE NULL
                END,
                CAST('1900-01-01' AS DATE)
            ) as parsed_production_date
        FROM ProcessingCostInput p
        WHERE p.product_name COLLATE utf8mb4_unicode_ci = p_product_name COLLATE utf8mb4_unicode_ci
          AND (p_product_warehouse IS NULL OR p.product_warehouse COLLATE utf8mb4_unicode_ci = p_product_warehouse COLLATE utf8mb4_unicode_ci OR p.product_warehouse = '')
          AND p.production_date IS NOT NULL
          AND p.production_date != ''
          AND COALESCE(p.dailyProcess_qty, 0) > 0  -- 只使用有产量的记录
          AND (
              -- 兼容带时间的 production_date（如 '2026-02-01 11:08'）：用 LEFT(TRIM(...),10) 再解析
              (p.production_date LIKE '%/%' AND p.production_date NOT LIKE '%-%' 
               AND STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%m/%d/%Y') IS NOT NULL 
               AND STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%m/%d/%Y') <= v_sale_date)
              OR 
              (p.production_date LIKE '%-%' 
               AND STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%Y-%m-%d') IS NOT NULL 
               AND STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%Y-%m-%d') <= v_sale_date)
          )
        ORDER BY parsed_production_date DESC;
        
        -- 材料构成汇总临时表（按材料名称汇总用量与成本）
        DROP TEMPORARY TABLE IF EXISTS tmp_material_composition;
        CREATE TEMPORARY TABLE tmp_material_composition (
            material_name VARCHAR(100) PRIMARY KEY,
            quantity DECIMAL(18, 2) DEFAULT 0,
            cost DECIMAL(18, 2) DEFAULT 0
        );
        
        -- 游标：按 LIFO 原则分配（按生产日期倒序）
        BEGIN
            -- 注意：DECLARE 必须在 BEGIN 块的开头，在任何可执行语句之前
            DECLARE cur_production CURSOR FOR
                SELECT id, production_date, prod_qty, unit_cost
                FROM tmp_production_records
                ORDER BY parsed_production_date DESC;
            
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
            
            -- 重置 v_done 标志（在 DECLARE 之后）
            SET v_done = 0;
            
            OPEN cur_production;
            
            read_loop: LOOP
                FETCH cur_production INTO v_prod_id, v_prod_date, v_prod_qty, v_unit_cost;
                
                -- 检查是否已读取完所有记录
                IF v_done = 1 THEN
                    LEAVE read_loop;
                END IF;
                
                -- 检查是否还需要更多数量
                IF v_remaining_qty <= 0 THEN
                    LEAVE read_loop;
                END IF;
                
                -- 计算本次使用的数量
                SET v_used_qty = LEAST(v_prod_qty, v_remaining_qty);
                SET v_record_cost = v_used_qty * v_unit_cost;
                SET v_total_cost = v_total_cost + v_record_cost;
                SET v_remaining_qty = v_remaining_qty - v_used_qty;
                
                -- 添加到生产记录数组
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
                
                -- 按材料类型汇总本批用量与成本到材料构成表（LIFO 下本生产记录消耗 v_used_qty）
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M1', (COALESCE(p.M1_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M1_qty,0)*COALESCE(p.M1_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M1_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M2', (COALESCE(p.M2_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M2_qty,0)*COALESCE(p.M2_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M2_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M3', (COALESCE(p.M3_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M3_qty,0)*COALESCE(p.M3_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M3_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M4', (COALESCE(p.M4_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M4_qty,0)*COALESCE(p.M4_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M4_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M5', (COALESCE(p.M5_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M5_qty,0)*COALESCE(p.M5_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M5_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M6', (COALESCE(p.M6_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M6_qty,0)*COALESCE(p.M6_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M6_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M7', (COALESCE(p.M7_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M7_qty,0)*COALESCE(p.M7_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M7_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M8', (COALESCE(p.M8_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M8_qty,0)*COALESCE(p.M8_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M8_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'M9', (COALESCE(p.M9_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.M9_qty,0)*COALESCE(p.M9_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.M9_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'wireRope', (COALESCE(p.wireRope_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.wireRope_qty,0)*COALESCE(p.wireRope_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.wireRope_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'carShell', (COALESCE(p.carShell_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.carShell_qty,0)*COALESCE(p.carShell_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.carShell_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'pigIron', (COALESCE(p.pigIron_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.pigIron_qty,0)*COALESCE(p.pigIron_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.pigIron_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'scrap', (COALESCE(p.scrap_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.scrap_qty,0)*COALESCE(p.scrap_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.scrap_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'carDismantle', (COALESCE(p.carDismantle_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.carDismantle_qty,0)*COALESCE(p.carDismantle_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.carDismantle_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'transfer', (COALESCE(p.transfer_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.transfer_qty,0)*COALESCE(p.transfer_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.transfer_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'auxiliary', (COALESCE(p.auxiliary_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.auxiliary_qty,0)*COALESCE(p.auxiliary_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.auxiliary_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'material1', (COALESCE(p.material1_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.material1_qty,0)*COALESCE(p.material1_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.material1_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'material2', (COALESCE(p.material2_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.material2_qty,0)*COALESCE(p.material2_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.material2_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'material3', (COALESCE(p.material3_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.material3_qty,0)*COALESCE(p.material3_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.material3_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'material4', (COALESCE(p.material4_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.material4_qty,0)*COALESCE(p.material4_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.material4_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'material5', (COALESCE(p.material5_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.material5_qty,0)*COALESCE(p.material5_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.material5_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                
            END LOOP;
            
            CLOSE cur_production;
        END;
        
        -- 清理生产记录临时表
        DROP TEMPORARY TABLE IF EXISTS tmp_production_records;
        
        SET p_material_cost = v_total_cost;
        SET p_production_records = v_records_array;
        
        -- 材料构成：从汇总临时表生成 JSON（按材料名称汇总的 quantity、cost）
        SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('material', material_name, 'quantity', quantity, 'cost', cost)), JSON_ARRAY())
        INTO p_material_composition
        FROM tmp_material_composition;
        
        DROP TEMPORARY TABLE IF EXISTS tmp_material_composition;
    END IF;
    
END$$

DELIMITER ;

-- ============================================
-- 存储过程：批量更新材料成本缓存
-- ============================================
DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_update_material_cost_cache`$$

CREATE PROCEDURE `sp_update_material_cost_cache`(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_delivery_number VARCHAR(100);
    DECLARE v_product_name VARCHAR(100);
    DECLARE v_product_warehouse VARCHAR(100);
    DECLARE v_delivery_date VARCHAR(50);
    DECLARE v_settlement_quantity DECIMAL(18, 2);
    DECLARE v_material_cost DECIMAL(18, 2);
    DECLARE v_material_composition JSON;
    DECLARE v_production_records JSON;
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_success INT DEFAULT 0;
    DECLARE v_failed INT DEFAULT 0;
    DECLARE v_error_msg TEXT;
    
    -- 游标：查询需要更新的销售订单
    -- 注意：delivery_date 可能是 VARCHAR 类型，需要转换为 DATE 进行比较
    DECLARE cur_sales CURSOR FOR
        SELECT 
            delivery_number,
            product_type,
            warehouse,
            delivery_date,
            settlement_quantity
        FROM DeliverySettlement
        WHERE (
            -- 尝试多种日期格式转换
            STR_TO_DATE(delivery_date, '%Y-%m-%d') >= IFNULL(p_start_date, '2025-01-01')
            OR STR_TO_DATE(delivery_date, '%m/%d/%Y') >= IFNULL(p_start_date, '2025-01-01')
            OR STR_TO_DATE(delivery_date, '%Y/%m/%d') >= IFNULL(p_start_date, '2025-01-01')
        )
        AND (
            STR_TO_DATE(delivery_date, '%Y-%m-%d') <= IFNULL(p_end_date, CURDATE())
            OR STR_TO_DATE(delivery_date, '%m/%d/%Y') <= IFNULL(p_end_date, CURDATE())
            OR STR_TO_DATE(delivery_date, '%Y/%m/%d') <= IFNULL(p_end_date, CURDATE())
        )
        AND settlement_quantity IS NOT NULL
        AND settlement_quantity > 0
        AND delivery_number IS NOT NULL
        AND product_type IS NOT NULL
        AND delivery_date IS NOT NULL
        ORDER BY 
            CASE 
                WHEN STR_TO_DATE(delivery_date, '%Y-%m-%d') IS NOT NULL 
                THEN STR_TO_DATE(delivery_date, '%Y-%m-%d')
                WHEN STR_TO_DATE(delivery_date, '%m/%d/%Y') IS NOT NULL 
                THEN STR_TO_DATE(delivery_date, '%m/%d/%Y')
                ELSE STR_TO_DATE(delivery_date, '%Y/%m/%d')
            END DESC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_error_msg = MESSAGE_TEXT;
        SET v_failed = v_failed + 1;
    END;
    
    -- 调试：先查询符合条件的记录数
    SELECT COUNT(*) as total_sales_records
    FROM DeliverySettlement
    WHERE (
        STR_TO_DATE(delivery_date, '%Y-%m-%d') >= IFNULL(p_start_date, '2025-01-01')
        OR STR_TO_DATE(delivery_date, '%m/%d/%Y') >= IFNULL(p_start_date, '2025-01-01')
        OR STR_TO_DATE(delivery_date, '%Y/%m/%d') >= IFNULL(p_start_date, '2025-01-01')
    )
    AND (
        STR_TO_DATE(delivery_date, '%Y-%m-%d') <= IFNULL(p_end_date, CURDATE())
        OR STR_TO_DATE(delivery_date, '%m/%d/%Y') <= IFNULL(p_end_date, CURDATE())
        OR STR_TO_DATE(delivery_date, '%Y/%m/%d') <= IFNULL(p_end_date, CURDATE())
    )
    AND settlement_quantity IS NOT NULL
    AND settlement_quantity > 0
    AND delivery_number IS NOT NULL
    AND product_type IS NOT NULL
    AND delivery_date IS NOT NULL;
    
    -- 打开游标
    OPEN cur_sales;
    
    read_loop: LOOP
        FETCH cur_sales INTO 
            v_delivery_number, 
            v_product_name, 
            v_product_warehouse, 
            v_delivery_date, 
            v_settlement_quantity;
        
        IF v_done = 1 THEN
            LEAVE read_loop;
        END IF;
        
        SET v_total = v_total + 1;
        
        -- 调用 LIFO 计算存储过程
        BEGIN
            -- 注意：在嵌套 BEGIN 块中，DECLARE 必须在 BEGIN 之后立即声明
            DECLARE v_calc_error TEXT DEFAULT NULL;
            
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            BEGIN
                GET DIAGNOSTICS CONDITION 1
                    v_calc_error = MESSAGE_TEXT;
                SET v_failed = v_failed + 1;
                -- 如果计算失败，设置默认值
                SET v_material_cost = 0;
                SET v_material_composition = JSON_ARRAY();
                SET v_production_records = JSON_ARRAY();
            END;
            
            -- 初始化输出参数
            SET v_material_cost = 0;
            SET v_material_composition = JSON_ARRAY();
            SET v_production_records = JSON_ARRAY();
            
            CALL sp_calculate_lifo_material_cost(
                v_delivery_number,
                v_product_name,
                v_product_warehouse,
                v_delivery_date,
                v_settlement_quantity,
                v_material_cost,
                v_material_composition,
                v_production_records
            );
            
            -- 如果计算失败，记录错误但继续处理
            IF v_calc_error IS NOT NULL THEN
                -- 可以选择记录到日志表或输出错误信息
                -- 这里先继续执行，插入空值
                SET v_calc_error = v_calc_error;  -- 占位符，避免空 IF 体
            END IF;
            
            -- 更新或插入缓存表
            INSERT INTO MaterialCostCache (
                delivery_number,
                product_name,
                product_warehouse,
                delivery_date,
                settlement_quantity,
                material_cost,
                material_composition,
                production_records,
                calculated_at
            ) VALUES (
                v_delivery_number,
                v_product_name,
                v_product_warehouse,
                v_delivery_date,
                v_settlement_quantity,
                v_material_cost,
                v_material_composition,
                v_production_records,
                NOW()
            )
            ON DUPLICATE KEY UPDATE
                product_name = v_product_name,
                product_warehouse = v_product_warehouse,
                delivery_date = v_delivery_date,
                settlement_quantity = v_settlement_quantity,
                material_cost = v_material_cost,
                material_composition = v_material_composition,
                production_records = v_production_records,
                calculated_at = NOW();
            
            SET v_success = v_success + 1;
            
            -- 每处理 100 条记录输出一次进度
            IF v_total % 100 = 0 THEN
                SELECT CONCAT('已处理 ', v_total, ' 条，成功 ', v_success, ' 条，失败 ', v_failed, ' 条') as progress;
            END IF;
            
        END;
        
    END LOOP;
    
    CLOSE cur_sales;
    
    -- 输出最终结果
    SELECT 
        v_total as total_records,
        v_success as success_count,
        v_failed as failed_count,
        CONCAT('更新完成：总计 ', v_total, ' 条，成功 ', v_success, ' 条，失败 ', v_failed, ' 条') as summary;
    
END$$

DELIMITER ;

-- ============================================
-- 事件：每天凌晨 2 点自动更新缓存
-- ============================================
DROP EVENT IF EXISTS `ev_update_material_cost_cache_daily`;

CREATE EVENT `ev_update_material_cost_cache_daily`
ON SCHEDULE EVERY 1 DAY
STARTS DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 DAY), '%Y-%m-%d 02:00:00')
COMMENT '每天凌晨2点自动更新材料成本缓存（最近7天）'
DO
BEGIN
    -- 更新最近 7 天的数据（确保新数据及时缓存）
    CALL sp_update_material_cost_cache(
        DATE_SUB(CURDATE(), INTERVAL 7 DAY),
        CURDATE()
    );
END;

-- ============================================
-- 使用说明
-- ============================================
-- 1. 执行此 SQL 文件创建存储过程和事件
-- 2. 启用事件调度器：SET GLOBAL event_scheduler = ON;
-- 3. 查看事件调度器状态：SHOW VARIABLES LIKE 'event_scheduler';
-- 4. 更新 MaterialCostCache 表（必须调用此过程，不要直接调用 sp_calculate_lifo_material_cost）：
--    手动全量更新（首次或按需）：CALL sp_update_material_cost_cache('2025-01-01', CURDATE());
--    仅更新最近 7 天：CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE());
-- 5. 查看事件状态：SHOW EVENTS;
-- 6. 事件会在每天凌晨 2 点自动执行（最近 7 天）
-- ============================================
