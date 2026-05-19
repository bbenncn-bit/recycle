-- 将 sp_calculate_lifo_material_cost 的单位成本改为 ProcessingCostInput 2026-04 起的
-- MSLKM*/MJSJM*/MGJKM* 等 alias 列（不再引用已删除的 M1_qty 等列，避免整单算成 0）。
-- 成品名仍须与加工表 product_name 一致；PG脚手架→PG脚手架压块 等别名请用应用 TypeScript 刷新。

DELIMITER $$

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

    DECLARE v_records_array JSON DEFAULT JSON_ARRAY();

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    END;

    SET v_sale_date = NULL;
    IF p_delivery_date IS NOT NULL AND TRIM(p_delivery_date) != '' THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            IF TRIM(p_delivery_date) LIKE '%-%' THEN
                SET v_sale_date = STR_TO_DATE(LEFT(TRIM(p_delivery_date), 10), '%Y-%m-%d');
            END IF;
        END;
    END IF;
    IF v_sale_date IS NULL AND p_delivery_date IS NOT NULL AND TRIM(p_delivery_date) != '' THEN
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            IF TRIM(p_delivery_date) LIKE '%/%' AND TRIM(p_delivery_date) NOT LIKE '%-%' THEN
                SET v_sale_date = STR_TO_DATE(LEFT(TRIM(p_delivery_date), 10), '%m/%d/%Y');
            END IF;
        END;
    END IF;

    SET v_remaining_qty = IFNULL(p_settlement_quantity, 0);
    SET v_total_cost = 0;
    SET v_records_array = JSON_ARRAY();

    IF v_remaining_qty <= 0 OR v_sale_date IS NULL THEN
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    ELSE
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

        INSERT INTO tmp_production_records (id, production_date, prod_qty, unit_cost, parsed_production_date)
        SELECT
            p.id,
            p.production_date,
            COALESCE(p.dailyProcess_qty, 0) AS prod_qty,
            CASE
                WHEN COALESCE(p.dailyProcess_qty, 0) > 0 THEN
                    (
                        COALESCE(p.MSLKM4_qty * p.MSLKM4_price, 0) +
                        COALESCE(p.MSLKM2_qty * p.MSLKM2_price, 0) +
                        COALESCE(p.MSLKM_qty * p.MSLKM_price, 0) +
                        COALESCE(p.MSLKM0_qty * p.MSLKM0_price, 0) +
                        COALESCE(p.MSLKM6_qty * p.MSLKM6_price, 0) +
                        COALESCE(p.MJSJM4_qty * p.MJSJM4_price, 0) +
                        COALESCE(p.MJSJM2_qty * p.MJSJM2_price, 0) +
                        COALESCE(p.MCKKM_qty * p.MCKKM_price, 0) +
                        COALESCE(p.MCKKM0_qty * p.MCKKM0_price, 0) +
                        COALESCE(p.MGJKM0_qty * p.MGJKM0_price, 0) +
                        COALESCE(p.MGJKM10_qty * p.MGJKM10_price, 0) +
                        COALESCE(p.MLKM2_qty * p.MLKM2_price, 0) +
                        COALESCE(p.MLKM_qty * p.MLKM_price, 0) +
                        COALESCE(p.MLKQ1M2_qty * p.MLKQ1M2_price, 0) +
                        COALESCE(p.MLKQ1M0_qty * p.MLKQ1M0_price, 0) +
                        COALESCE(p.MLKQ1M6_qty * p.MLKQ1M6_price, 0) +
                        COALESCE(p.FL1_qty * p.FL1_price, 0)
                    ) / GREATEST(COALESCE(p.dailyProcess_qty, 1), 1)
                ELSE 0
            END AS unit_cost,
            COALESCE(
                CASE WHEN p.production_date LIKE '%/%' AND p.production_date NOT LIKE '%-%'
                    THEN STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%m/%d/%Y') ELSE NULL END,
                CASE WHEN p.production_date LIKE '%-%'
                    THEN STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%Y-%m-%d') ELSE NULL END,
                CAST('1900-01-01' AS DATE)
            ) AS parsed_production_date
        FROM ProcessingCostInput p
        WHERE p.product_name COLLATE utf8mb4_unicode_ci = p_product_name COLLATE utf8mb4_unicode_ci
          AND (
              p_product_warehouse IS NULL
              OR TRIM(p_product_warehouse) = ''
              OR p.product_warehouse COLLATE utf8mb4_unicode_ci = p_product_warehouse COLLATE utf8mb4_unicode_ci
              OR TRIM(p.product_warehouse) = ''
          )
          AND p.production_date IS NOT NULL AND TRIM(p.production_date) != ''
          AND COALESCE(p.dailyProcess_qty, 0) > 0
          AND (
              (p.production_date LIKE '%/%' AND p.production_date NOT LIKE '%-%'
               AND STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%m/%d/%Y') <= v_sale_date)
              OR
              (p.production_date LIKE '%-%'
               AND STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%Y-%m-%d') <= v_sale_date)
          )
        ORDER BY parsed_production_date DESC;

        DROP TEMPORARY TABLE IF EXISTS tmp_material_composition;
        CREATE TEMPORARY TABLE tmp_material_composition (
            material_name VARCHAR(100) PRIMARY KEY,
            quantity DECIMAL(18, 2) DEFAULT 0,
            cost DECIMAL(18, 2) DEFAULT 0
        );

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
                IF v_done = 1 OR v_remaining_qty <= 0 THEN LEAVE read_loop; END IF;
                SET v_used_qty = LEAST(v_prod_qty, v_remaining_qty);
                SET v_record_cost = v_used_qty * v_unit_cost;
                SET v_total_cost = v_total_cost + v_record_cost;
                SET v_remaining_qty = v_remaining_qty - v_used_qty;
                SET v_records_array = JSON_ARRAY_APPEND(v_records_array, '$',
                    JSON_OBJECT('id', v_prod_id, 'productionDate', v_prod_date,
                        'quantity', v_used_qty, 'unitCost', v_unit_cost, 'totalCost', v_record_cost));

                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MSLKM4', (COALESCE(p.MSLKM4_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty,
                       (COALESCE(p.MSLKM4_qty,0)*COALESCE(p.MSLKM4_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty
                FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MSLKM4_qty,0) > 0
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MSLKM2', (COALESCE(p.MSLKM2_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MSLKM2_qty,0)*COALESCE(p.MSLKM2_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MSLKM2_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MSLKM', (COALESCE(p.MSLKM_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MSLKM_qty,0)*COALESCE(p.MSLKM_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MSLKM_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MSLKM0', (COALESCE(p.MSLKM0_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MSLKM0_qty,0)*COALESCE(p.MSLKM0_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MSLKM0_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MSLKM6', (COALESCE(p.MSLKM6_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MSLKM6_qty,0)*COALESCE(p.MSLKM6_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MSLKM6_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MJSJM4', (COALESCE(p.MJSJM4_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MJSJM4_qty,0)*COALESCE(p.MJSJM4_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MJSJM4_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MJSJM2', (COALESCE(p.MJSJM2_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MJSJM2_qty,0)*COALESCE(p.MJSJM2_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MJSJM2_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MCKKM', (COALESCE(p.MCKKM_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MCKKM_qty,0)*COALESCE(p.MCKKM_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MCKKM_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MCKKM0', (COALESCE(p.MCKKM0_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MCKKM0_qty,0)*COALESCE(p.MCKKM0_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MCKKM0_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MGJKM0', (COALESCE(p.MGJKM0_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MGJKM0_qty,0)*COALESCE(p.MGJKM0_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MGJKM0_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MGJKM10', (COALESCE(p.MGJKM10_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MGJKM10_qty,0)*COALESCE(p.MGJKM10_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MGJKM10_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MLKM2', (COALESCE(p.MLKM2_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MLKM2_qty,0)*COALESCE(p.MLKM2_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MLKM2_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MLKM', (COALESCE(p.MLKM_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MLKM_qty,0)*COALESCE(p.MLKM_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MLKM_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MLKQ1M2', (COALESCE(p.MLKQ1M2_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MLKQ1M2_qty,0)*COALESCE(p.MLKQ1M2_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MLKQ1M2_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MLKQ1M0', (COALESCE(p.MLKQ1M0_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MLKQ1M0_qty,0)*COALESCE(p.MLKQ1M0_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MLKQ1M0_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'MLKQ1M6', (COALESCE(p.MLKQ1M6_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.MLKQ1M6_qty,0)*COALESCE(p.MLKQ1M6_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.MLKQ1M6_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
                INSERT INTO tmp_material_composition (material_name, quantity, cost)
                SELECT 'FL1', (COALESCE(p.FL1_qty,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty, (COALESCE(p.FL1_qty,0)*COALESCE(p.FL1_price,0)/GREATEST(COALESCE(p.dailyProcess_qty,1),1))*v_used_qty FROM ProcessingCostInput p WHERE p.id = v_prod_id AND COALESCE(p.FL1_qty,0) > 0 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), cost = cost + VALUES(cost);
            END LOOP;
            CLOSE cur_production;
        END;

        DROP TEMPORARY TABLE IF EXISTS tmp_production_records;
        SET p_material_cost = v_total_cost;
        SET p_production_records = v_records_array;
        SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('material', material_name, 'quantity', quantity, 'cost', cost)), JSON_ARRAY())
        INTO p_material_composition
        FROM tmp_material_composition;
        DROP TEMPORARY TABLE IF EXISTS tmp_material_composition;
    END IF;
END$$

DELIMITER ;
