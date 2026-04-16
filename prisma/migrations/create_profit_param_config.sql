-- ============================================
-- 利润核算可调参数表（附图红字参数）
-- 规则：按结算单发货日期查找，effective_date 起用 value，之前用 previous_value（或上一版本 value）
-- 变动数据、变动日期均可选；精确到日
-- ============================================

DROP TABLE IF EXISTS `ProfitParamConfig`;

CREATE TABLE `ProfitParamConfig` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `param_key` VARCHAR(80) NOT NULL COMMENT '参数键（英文），用于程序与查询',
  `name_cn` VARCHAR(200) NOT NULL COMMENT '参数中文名称/注释，便于后期查找',
  `category` VARCHAR(30) NOT NULL COMMENT '分类：other_cost=其它成本项，other_income=其它收入项',
  `sub_category` VARCHAR(50) DEFAULT NULL COMMENT '子类：transport=运输费,tax=税费,instant_refund=即征即退,gov_subsidy=政府扶持,discount=贴现,interest=回款利息',
  `steel_mill` VARCHAR(30) DEFAULT NULL COMMENT '适用钢厂：萍钢/吉钢/新钢，NULL 表示通用',
  `effective_date` DATE NOT NULL COMMENT '生效日期（精确到日），此日期起使用 value',
  `value` DECIMAL(18, 6) NOT NULL COMMENT '参数值（新标准）',
  `previous_value` DECIMAL(18, 6) DEFAULT NULL COMMENT '变动前的值（可选），变动日期前按此值',
  `unit` VARCHAR(30) DEFAULT NULL COMMENT '单位：元/吨、%、天、系数等',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_param_mill_date` (`param_key`, `steel_mill`, `effective_date`),
  KEY `idx_param_key` (`param_key`),
  KEY `idx_effective_date` (`effective_date`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='利润核算可调参数表（运输费/税费/即征即退/政府扶持/贴现/回款利息等）';

-- ============================================
-- 初始数据（附图标红参数，生效日期暂为 2020-01-01，可按实际调整）
-- 核算时：按结算单 delivery_date、warehouse 取 effective_date <= delivery_date 的最新一条
-- ============================================

-- 其它成本项：运输费（元/吨）
INSERT INTO `ProfitParamConfig` (`param_key`, `name_cn`, `category`, `sub_category`, `steel_mill`, `effective_date`, `value`, `previous_value`, `unit`, `remark`) VALUES
('transport_fee_pinggang', '运输费-萍钢(元/吨)', 'other_cost', 'transport', '萍钢', '2020-01-01', 20.6, NULL, '元/吨', '附图运输费萍钢 20.6'),
('transport_fee_jigang', '运输费-吉钢(元/吨)', 'other_cost', 'transport', '吉钢', '2020-01-01', 65, NULL, '元/吨', '附图运输费吉钢 65'),
('transport_fee_xingang', '运输费-新钢(元/吨)', 'other_cost', 'transport', '新钢', '2020-01-01', 48, NULL, '元/吨', '附图运输费新钢 48');

-- 其它成本项：路损系数（运输费除以该系数）
INSERT INTO `ProfitParamConfig` (`param_key`, `name_cn`, `category`, `sub_category`, `steel_mill`, `effective_date`, `value`, `previous_value`, `unit`, `remark`) VALUES
('road_loss_factor', '路损系数', 'other_cost', 'transport', NULL, '2020-01-01', 1.03, NULL, '系数', '附图路损 1.03，三钢通用');

-- 其它成本项：税费公式中的比例
INSERT INTO `ProfitParamConfig` (`param_key`, `name_cn`, `category`, `sub_category`, `steel_mill`, `effective_date`, `value`, `previous_value`, `unit`, `remark`) VALUES
('tax_rate_main', '税费-主税率', 'other_cost', 'tax', NULL, '2020-01-01', 10, NULL, '%', '附图税费公式中 10%'),
('tax_rate_extra', '税费-附加税率', 'other_cost', 'tax', NULL, '2020-01-01', 0.03, NULL, '%', '附图税费公式中 (销售+材料)*0.03%');

-- 其它收入项：即征即退
INSERT INTO `ProfitParamConfig` (`param_key`, `name_cn`, `category`, `sub_category`, `steel_mill`, `effective_date`, `value`, `previous_value`, `unit`, `remark`) VALUES
('instant_refund_rate', '即征即退比例', 'other_income', 'instant_refund', NULL, '2020-01-01', 30, NULL, '%', '附图即征即退 30%'),
('processing_fee_for_refund', '即征即退计算用加工费(元/吨)', 'other_income', 'instant_refund', NULL, '2020-01-01', 70, NULL, '元/吨', '附图备注：当前加工费按70计');

-- 其它收入项：政府扶持（公式中多个比例，按附图拆成单参数）
INSERT INTO `ProfitParamConfig` (`param_key`, `name_cn`, `category`, `sub_category`, `steel_mill`, `effective_date`, `value`, `previous_value`, `unit`, `remark`) VALUES
('gov_subsidy_rate_41', '政府扶持-主比例41%', 'other_income', 'gov_subsidy', NULL, '2020-01-01', 41, NULL, '%', '如即征即退为否时公式 41%'),
('gov_subsidy_rate_10', '政府扶持-次比例10%', 'other_income', 'gov_subsidy', NULL, '2020-01-01', 10, NULL, '%', '政府扶持公式 10%'),
('gov_subsidy_rate_80', '政府扶持-10%*80%', 'other_income', 'gov_subsidy', NULL, '2020-01-01', 80, NULL, '%', '政府扶持公式 10%*80%'),
('gov_subsidy_rate_003', '政府扶持-附加比例0.03%', 'other_income', 'gov_subsidy', NULL, '2020-01-01', 0.03, NULL, '%', '(销售+材料)*0.03%*100%'),
('gov_subsidy_rate_100', '政府扶持-附加0.03%系数100%', 'other_income', 'gov_subsidy', NULL, '2020-01-01', 100, NULL, '%', '0.03%*100%'),
('gov_subsidy_rate_70', '政府扶持-70%(当即征即退为是)', 'other_income', 'gov_subsidy', NULL, '2020-01-01', 70, NULL, '%', '如即征即退为是时公式 70%'),
('gov_subsidy_rate_38', '政府扶持-38%(当即征即退为是)', 'other_income', 'gov_subsidy', NULL, '2020-01-01', 38, NULL, '%', '70%*38% 中 38%');

-- 其它成本项：贴现费用（仅萍钢）
INSERT INTO `ProfitParamConfig` (`param_key`, `name_cn`, `category`, `sub_category`, `steel_mill`, `effective_date`, `value`, `previous_value`, `unit`, `remark`) VALUES
('discount_rate_pinggang', '贴现率-萍钢', 'other_cost', 'discount', '萍钢', '2020-01-01', 2.175, NULL, '%', '附图销售单价(不含税)*1.13*2.175%，仅萍钢');

-- 其它成本项：回款周期资金利息（天数 + 日利率）
INSERT INTO `ProfitParamConfig` (`param_key`, `name_cn`, `category`, `sub_category`, `steel_mill`, `effective_date`, `value`, `previous_value`, `unit`, `remark`) VALUES
('collection_days_pinggang', '回款周期天数-萍钢', 'other_cost', 'interest', '萍钢', '2020-01-01', 18, NULL, '天', '附图 3%/360*18'),
('collection_days_jigang', '回款周期天数-吉钢', 'other_cost', 'interest', '吉钢', '2020-01-01', 12, NULL, '天', '附图 3%/360*12'),
('collection_days_xingang', '回款周期天数-新钢', 'other_cost', 'interest', '新钢', '2020-01-01', 37, NULL, '天', '附图 3%/360*37'),
('interest_rate_annual', '回款利息年利率', 'other_cost', 'interest', NULL, '2020-01-01', 3, NULL, '%', '日利率=此值/360，附图 3%');

-- ============================================
-- 使用说明
-- ============================================
-- 1. 查询某结算单（发货日期 delivery_date、仓库/钢厂 steel_mill）应使用的参数值：
--    SELECT * FROM ProfitParamConfig
--    WHERE param_key = 'transport_fee_pinggang' AND (steel_mill = '萍钢' OR steel_mill IS NULL)
--      AND effective_date <= '结算单发货日期'
--    ORDER BY effective_date DESC LIMIT 1;
-- 2. 新增一次“变动”：对同一 param_key（及 steel_mill）插入新行，effective_date=新生效日，value=新值，previous_value=旧值（可选）。
-- 3. 变动日期、变动数据均可选：previous_value 可为 NULL；若只改生效日可只插新行不填 previous_value。
-- ============================================
