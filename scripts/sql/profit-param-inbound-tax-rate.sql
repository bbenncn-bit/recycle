-- 入库单税率（与其它收入/税费基数中的「材料成本×入库单税率」项对应）
-- param_key: inbound_tax_rate，value 单位为 %（如 13 表示 13%）
-- 利润分析按发货日取 value / previous_value 历史节点，不再走入库单 LIFO 加权
INSERT INTO ProfitParamConfig (param_key, name_cn, category, sub_category, steel_mill, effective_date, value, unit, remark)
SELECT 'inbound_tax_rate', '入库单税率', '利润核算', '其它收入', NULL, CURDATE(), 13, '%', '按发货日取 value/previous_value；与 instant_refund_rate（即征即退）分离'
WHERE NOT EXISTS (SELECT 1 FROM ProfitParamConfig WHERE param_key = 'inbound_tax_rate' AND steel_mill IS NULL);
