-- ============================================
-- 批量修正 ProcessingCostInput 表错误录入
-- ============================================
-- 说明：成品名称、成品库区误录为 "普压" "B"，应改为 "一类" "B1"
-- 执行前请先备份或 SELECT 确认影响行数
-- ============================================

-- 1）先查看将要被修改的记录数（建议先执行）
SELECT COUNT(*) AS affected_rows
FROM ProcessingCostInput
WHERE product_name = '普压'
  AND product_warehouse = 'B';

-- 2）查看将要被修改的样例数据（可选）
-- SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty
-- FROM ProcessingCostInput
-- WHERE product_name = '普压' AND product_warehouse = 'B'
-- LIMIT 20;

-- 3）批量更新：将 成品名称=普压 且 成品库区=B 改为 一类 / B1
UPDATE ProcessingCostInput
SET product_name = '一类',
    product_warehouse = 'B1'
WHERE product_name = '普压'
  AND product_warehouse = 'B';

-- 4）验证：更新后应无 普压+B 的记录（应返回 0）
-- SELECT COUNT(*) FROM ProcessingCostInput WHERE product_name = '普压' AND product_warehouse = 'B';
