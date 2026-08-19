-- 其它成本项新标准参数（反贴现两段 + 贴现天数独立）；可重复执行（已存在则跳过）
-- 执行后请在运维页核对：discount_rate_pinggang、discount_days_pinggang、collection_days_pinggang 等

INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'reverse_discount_annual_rate', '反贴现息年利率', 'other_cost', 'discount', NULL, '2026-01-01', 5.6, '%',
       '贴现费用第二段：销售收入含税×本率×反贴现息占用天数/360'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'reverse_discount_annual_rate' AND steel_mill IS NULL);

INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'reverse_discount_occupancy_days', '反贴现息占用天数', 'other_cost', 'discount', NULL, '2026-01-01', 60, '天',
       '贴现费用第二段占用天数（与 discount_days_pinggang 贴现天数区分）'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'reverse_discount_occupancy_days' AND steel_mill IS NULL);

INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'discount_days_pinggang', '贴现天数-萍钢', 'other_cost', 'discount', '萍钢', '2026-01-01', 120, '天',
       '贴现费用段1：销售收入含税×贴现年利率×本天数/360；仅萍钢'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'discount_days_pinggang' AND steel_mill = '萍钢');

-- 建议同步更新萍钢贴现/回款天数与贴现年利率（若库内仍为旧值可手工改或取消注释执行）
-- UPDATE ProfitParamConfig SET value = 1.2, updated_at = NOW() WHERE param_key = 'discount_rate_pinggang' AND steel_mill = '萍钢';
-- UPDATE ProfitParamConfig SET value = 120, updated_at = NOW() WHERE param_key = 'collection_days_pinggang' AND steel_mill = '萍钢';
-- UPDATE ProfitParamConfig SET value = 19, updated_at = NOW() WHERE param_key = 'transport_fee_pinggang' AND steel_mill = '萍钢';
