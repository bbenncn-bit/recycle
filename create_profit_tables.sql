-- 创建生产情况录入表
-- 用于记录每天的生产加工情况：生产了哪些成品，使用了哪些毛料
CREATE TABLE IF NOT EXISTS `ProcessingCostInput` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_name` VARCHAR(100) NULL COMMENT '成品名称（如：钢筋压块、普压等）',
  `product_warehouse` VARCHAR(100) NULL COMMENT '成品仓库（如：C1、B等）',
  `product_tons` DECIMAL(18, 2) NULL COMMENT '成品重量（吨）',
  `production_date` VARCHAR(50) NULL COMMENT '生产日期时间（格式：YYYY-MM-DD HH:mm）',
  `material_composition` JSON NULL COMMENT '原材料构成（JSON格式：[{material: "优质毛料M1", tons: 12}, ...]）',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_product_name` (`product_name`),
  INDEX `idx_product_warehouse` (`product_warehouse`),
  INDEX `idx_production_date` (`production_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产情况录入表';

-- 创建加工成本配置表
-- 用于存储各成品的上月单位加工成本（元/吨）
CREATE TABLE IF NOT EXISTS `ProcessingCostConfig` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_name` VARCHAR(100) NULL COMMENT '成品名称',
  `unit_processing_cost` DECIMAL(18, 2) NULL COMMENT '单位加工成本（元/吨）',
  `config_month` VARCHAR(20) NULL COMMENT '配置月份（如：2024-01）',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_name` (`product_name`),
  INDEX `idx_product_name` (`product_name`),
  INDEX `idx_config_month` (`config_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='加工成本配置表';

-- 创建毛料库存视图（可选，用于快速查询库存）
-- 注意：这是一个计算视图，实际库存 = 采购入库总量 - 已使用总量
-- 可以通过API实时计算，这里不创建视图
