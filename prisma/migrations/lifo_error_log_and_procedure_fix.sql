-- ============================================
-- 1. 创建 LIFO 报错日志表（用于排查 material_cost 全 0）
-- ============================================
CREATE TABLE IF NOT EXISTS `MaterialCostCacheErrorLog` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `delivery_number` VARCHAR(100) NULL,
  `error_message` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='LIFO 存储过程报错日志';

-- ============================================
-- 2. 修改 sp_calculate_lifo_material_cost：在 EXIT HANDLER 中写入错误日志
-- ============================================
-- 将原来的 EXIT HANDLER 整段替换为下面这段（已包含写日志）：

/*
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_sql_error = MESSAGE_TEXT;
        INSERT INTO MaterialCostCacheErrorLog (delivery_number, error_message)
        VALUES (p_delivery_number, v_sql_error);
        SET p_material_cost = 0;
        SET p_material_composition = JSON_ARRAY();
        SET p_production_records = JSON_ARRAY();
    END;
*/

-- 单笔测试：
--   CALL sp_calculate_lifo_material_cost('FH2512310015','钢筋压块','C1','1/1/2026',46.77,@c,@comp,@rec);
--   SELECT @c;
--   SELECT * FROM MaterialCostCacheErrorLog ORDER BY id DESC LIMIT 5;
-- ============================================

-- ============================================
-- 3. 根因：Truncated incorrect date value: '2026-02-01 11:08'
-- ============================================
-- 当 ProcessingCostInput.production_date 或传入日期为带时间格式（如 '2026-02-01 11:08'）时，
-- 在严格 SQL 模式下 STR_TO_DATE(..., '%Y-%m-%d') 会报错并触发 EXIT HANDLER，导致 material_cost = 0。
-- 已在 material_cost_cache_mysql_event.sql 中修复：
--   - 所有对 production_date 的解析改为 STR_TO_DATE(LEFT(TRIM(p.production_date), 10), '%Y-%m-%d') 或 '%m/%d/%Y'
--   - p_delivery_date 解析也改为先取前 10 位再 STR_TO_DATE
-- 请用 material_cost_cache_mysql_event.sql 中的 sp_calculate_lifo_material_cost 定义重新执行
-- （或仅替换其中的日期解析与 WHERE 中日期比较部分），然后重跑单笔测试与 sp_update_material_cost_cache。
-- ============================================
