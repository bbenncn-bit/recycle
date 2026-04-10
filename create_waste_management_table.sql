-- 固废管理 - 工业固体废物信息表
CREATE TABLE IF NOT EXISTS `WasteManagement` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `wasteCode` VARCHAR(100) NULL COMMENT '固废代码',
  `wasteName` VARCHAR(255) NULL COMMENT '固废名称',
  `wasteCategory` VARCHAR(100) NULL COMMENT '固废类别（危险废物/一般工业固废等）',
  `wasteType` VARCHAR(100) NULL COMMENT '固废种类',
  `quantity` DECIMAL(15, 3) NULL COMMENT '数量',
  `unit` VARCHAR(50) NULL COMMENT '单位（吨、立方米等）',
  `source` VARCHAR(255) NULL COMMENT '产生来源/产生环节',
  `flowDirection` VARCHAR(255) NULL COMMENT '流向（去向）',
  `storageLocation` VARCHAR(255) NULL COMMENT '贮存地点',
  `storageMethod` VARCHAR(255) NULL COMMENT '贮存方式',
  `utilizationMethod` VARCHAR(255) NULL COMMENT '利用方式',
  `disposalMethod` VARCHAR(255) NULL COMMENT '处置方式',
  `disposalUnit` VARCHAR(255) NULL COMMENT '处置单位',
  `disposalLocation` VARCHAR(255) NULL COMMENT '处置地点',
  `recordDate` DATE NULL COMMENT '记录日期',
  `operator` VARCHAR(100) NULL COMMENT '操作员/安全员',
  `remark` TEXT NULL COMMENT '备注',
  `createTime` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（自动）',
  `updateTime` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间（自动）',
  PRIMARY KEY (`id`),
  INDEX `idx_recordDate` (`recordDate`),
  INDEX `idx_wasteCategory` (`wasteCategory`),
  INDEX `idx_wasteType` (`wasteType`),
  INDEX `idx_operator` (`operator`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='固废管理 - 工业固体废物信息表';





