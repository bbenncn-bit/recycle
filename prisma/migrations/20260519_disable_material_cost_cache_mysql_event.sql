-- 停用每日自动刷新：旧版 sp_calculate_lifo_material_cost 引用已删除的 M1~M9 列，
-- 会在 EXIT HANDLER 中将 material_cost 写为 0，覆盖运维页 TypeScript 刷新的正确缓存。
-- 材料成本缓存请使用应用「运维 → 刷新材料成本缓存」（TypeScript LIFO）。

DROP EVENT IF EXISTS `ev_update_material_cost_cache_daily`;
