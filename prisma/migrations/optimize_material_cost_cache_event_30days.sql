-- ============================================
-- 优化材料成本缓存事件：由「最近 7 天」改为「最近 30 天」
-- 解决：很久未导数据后一次性导入超过 7 天的结算数据，凌晨事件不会反推材料成本的问题
-- ============================================
--
-- 【立即执行】反推结算的材料构成及成本（在 Navicat 或 MySQL 客户端执行其一即可）
-- --------------------------------------------------------------------------------
-- 1）仅反推 2 月 14 日至 2 月 27 日（按你当前导入的区间，年份请按实际修改）：
--    CALL sp_update_material_cost_cache('2026-02-14', '2026-02-27');
--
-- 2）反推最近 30 天（适合刚导入一批近期数据）：
--    CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 30 DAY), CURDATE());
--
-- 3）反推从某日起至今（例如 2026 年 1 月 1 日至今）：
--    CALL sp_update_material_cost_cache('2026-01-01', CURDATE());
--
-- 执行完任一条后，刷新利润分析页面即可看到材料成本(元)列更新。
-- ============================================

-- 确保事件调度器已启用（若未启用可执行一次）
-- SET GLOBAL event_scheduler = ON;

DELIMITER $$

DROP EVENT IF EXISTS `ev_update_material_cost_cache_daily`$$

CREATE EVENT `ev_update_material_cost_cache_daily`
ON SCHEDULE EVERY 1 DAY
STARTS DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 DAY), '%Y-%m-%d 02:00:00')
COMMENT '每天凌晨2点自动更新材料成本缓存（最近30天）'
DO
BEGIN
    -- 更新最近 30 天的数据（覆盖「超过 7 天未导数据、一次性导入多天」的场景）
    CALL sp_update_material_cost_cache(
        DATE_SUB(CURDATE(), INTERVAL 30 DAY),
        CURDATE()
    );
END$$

DELIMITER ;

-- ============================================
-- 说明
-- ============================================
-- 事件仍为每天凌晨 2 点执行，仅将日期范围由 7 天改为 30 天。
-- 若需立即补算某段日期，请使用本文件顶部的 CALL 语句，执行一条即可。
-- ============================================
