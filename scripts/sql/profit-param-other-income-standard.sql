-- 其它收入项新标准参数；可重复执行（已存在则跳过）

INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'gov_subsidy_rate', '政府扶持-主比例', 'other_income', 'gov_subsidy', NULL, '2026-01-01', 38, '%',
       '政府扶持主比例；即征即退为否=基数×本率，为是(新钢)=基数×本率×70%'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'gov_subsidy_rate' AND steel_mill IS NULL);

INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'is_give_ces', '印花税扶持是否结给', 'other_income', 'gov_subsidy', NULL, '2026-01-01', 0, '0/1',
       '0=不结给 1=结给；(收入不含税+材料成本)×0.03%×本项'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'is_give_ces' AND steel_mill IS NULL);

INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'is_give_tax_extra', '城建及教育税附加扶持是否结给', 'other_income', 'gov_subsidy', NULL, '2026-01-01', 0, '0/1',
       '0=不结给 1=结给；基数×10%×本项'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'is_give_tax_extra' AND steel_mill IS NULL);

-- 若仅有旧键 gov_subsidy_rate_41=38，程序会自动回退读取；也可将主比例迁移到新键：
-- UPDATE ProfitParamConfig SET value = 38 WHERE param_key IN ('gov_subsidy_rate','gov_subsidy_rate_41');
