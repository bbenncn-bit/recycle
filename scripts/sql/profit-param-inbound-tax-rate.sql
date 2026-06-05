-- 入库单税率（与其它收入/税费基数中的「材料成本×入库单税率」项对应）
-- param_key: inbound_tax_rate，value 单位为 %（如 13 表示 13%）
INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'inbound_tax_rate', '入库单税率', '利润核算', '其它收入', NULL, CURDATE(), 13, '%', 'LIFO溯源失败时的入库单税率；与 instant_refund_rate（即征即退）分离'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'inbound_tax_rate' AND steel_mill IS NULL);
