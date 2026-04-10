-- ============================================
-- 重新创建存储过程（修复 product_tons 字段问题）
-- ============================================
-- 说明：此脚本会删除并重新创建存储过程，修复字段名问题

-- 删除旧的存储过程
DROP PROCEDURE IF EXISTS `sp_calculate_lifo_material_cost`;
DROP PROCEDURE IF EXISTS `sp_update_material_cost_cache`;

-- 然后执行完整的 material_cost_cache_mysql_event.sql 文件
-- 或者直接在这里重新创建存储过程

-- 注意：请先备份数据，然后执行完整的 material_cost_cache_mysql_event.sql
