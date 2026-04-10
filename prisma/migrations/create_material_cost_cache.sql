-- 创建材料成本缓存表
-- 用于存储预计算的 LIFO 材料成本，提升查询性能

CREATE TABLE IF NOT EXISTS `MaterialCostCache` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `delivery_number` VARCHAR(100) NOT NULL COMMENT '发货单号（唯一标识）',
  `product_name` VARCHAR(100) DEFAULT NULL COMMENT '成品名称',
  `product_warehouse` VARCHAR(100) DEFAULT NULL COMMENT '成品仓库',
  `delivery_date` VARCHAR(50) DEFAULT NULL COMMENT '发货日期',
  `settlement_quantity` DECIMAL(18, 2) DEFAULT NULL COMMENT '结算数量（吨）',
  `material_cost` DECIMAL(18, 2) DEFAULT NULL COMMENT '材料成本（元）',
  `material_composition` JSON DEFAULT NULL COMMENT '材料构成 JSON',
  `production_records` JSON DEFAULT NULL COMMENT '使用的生产记录 JSON',
  `calculated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '计算时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_delivery_number` (`delivery_number`),
  KEY `idx_product_warehouse` (`product_name`, `product_warehouse`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_calculated_at` (`calculated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='材料成本缓存表（LIFO 预计算结果）';
