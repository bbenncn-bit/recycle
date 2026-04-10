-- ============================================
-- 修复游标读取逻辑
-- ============================================
-- 问题：游标可能在第一次 FETCH 时就触发了 NOT FOUND，导致循环立即退出
-- 解决：在 FETCH 之后立即检查 v_done，而不是在循环开始时就检查

-- 注意：这个文件只是说明修复逻辑，实际修复在 material_cost_cache_mysql_event.sql 中

-- 修复前的逻辑（有问题）：
-- read_loop: LOOP
--     FETCH cur_production INTO ...;
--     IF v_done = 1 OR v_remaining_qty <= 0 THEN
--         LEAVE read_loop;
--     END IF;
--     -- 处理数据
-- END LOOP;

-- 修复后的逻辑（正确）：
-- read_loop: LOOP
--     FETCH cur_production INTO ...;
--     IF v_done = 1 THEN
--         LEAVE read_loop;
--     END IF;
--     IF v_remaining_qty <= 0 THEN
--         LEAVE read_loop;
--     END IF;
--     -- 处理数据
-- END LOOP;
