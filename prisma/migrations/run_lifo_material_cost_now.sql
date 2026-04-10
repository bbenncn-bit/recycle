-- ============================================
-- 立即执行：反推结算的材料构成及成本（LIFO 写入 MaterialCostCache）
-- ============================================
-- 在 Navicat 或 MySQL 客户端中执行下面其中一条即可，执行后刷新利润分析页面。
-- 年份与日期请按实际导入的结算数据修改。
-- ============================================

-- 方案 A：仅反推 2 月 14 日至 2 月 27 日（刚导入的区间）
CALL sp_update_material_cost_cache('2026-02-14', '2026-02-27');

-- 方案 B：反推最近 30 天（取消注释后执行）
-- CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 30 DAY), CURDATE());

-- 方案 C：反推从指定日期至今（取消注释并改日期后执行）
-- CALL sp_update_material_cost_cache('2026-01-01', CURDATE());
