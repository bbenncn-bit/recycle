-- =============================================================================
-- 采购入库变更信号：仅在 PurchaseWarehouse 有 INSERT/UPDATE 时置 pending=1，
-- Node 轮询时若 pending=0 则不再对大表做 COUNT，节省资源。
-- 执行前请确认表名与线上一致（PurchaseWarehouse）。
-- =============================================================================

CREATE TABLE IF NOT EXISTS `PurchaseWarehouseSyncSignal` (
  `id` TINYINT NOT NULL PRIMARY KEY COMMENT '固定为 1',
  `pending` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 表示有待处理的入库同步',
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `PurchaseWarehouseSyncSignal` (`id`, `pending`) VALUES (1, 0);

DELIMITER $$

DROP TRIGGER IF EXISTS `tr_pw_sync_after_insert`$$
CREATE TRIGGER `tr_pw_sync_after_insert`
AFTER INSERT ON `PurchaseWarehouse`
FOR EACH ROW
BEGIN
  INSERT INTO `PurchaseWarehouseSyncSignal` (`id`, `pending`)
  VALUES (1, 1)
  ON DUPLICATE KEY UPDATE `pending` = 1, `updated_at` = CURRENT_TIMESTAMP;
END$$

DROP TRIGGER IF EXISTS `tr_pw_sync_after_update`$$
CREATE TRIGGER `tr_pw_sync_after_update`
AFTER UPDATE ON `PurchaseWarehouse`
FOR EACH ROW
BEGIN
  INSERT INTO `PurchaseWarehouseSyncSignal` (`id`, `pending`)
  VALUES (1, 1)
  ON DUPLICATE KEY UPDATE `pending` = 1, `updated_at` = CURRENT_TIMESTAMP;
END$$

DROP EVENT IF EXISTS `ev_purchase_sync_halfday_watchdog`$$

CREATE EVENT `ev_purchase_sync_halfday_watchdog`
ON SCHEDULE EVERY 12 HOUR
STARTS CURRENT_TIMESTAMP
ON COMPLETION PRESERVE
ENABLE
DO
BEGIN
  DECLARE v_last BIGINT DEFAULT 0;
  DECLARE v_max BIGINT DEFAULT 0;
  SELECT COALESCE(MAX(`value_num`), 0) INTO v_last
    FROM `MaterialStorageSyncState`
    WHERE `key_name` = 'purchase_warehouse_last_id'
    LIMIT 1;
  SELECT COALESCE(MAX(`id`), 0) INTO v_max FROM `PurchaseWarehouse`;
  IF v_max > v_last THEN
    UPDATE `PurchaseWarehouseSyncSignal`
      SET `pending` = 1, `updated_at` = NOW()
      WHERE `id` = 1;
  END IF;
END$$

DELIMITER ;

-- 可选：在 MySQL 上开启调度（若 EVENT 不执行）
-- SET GLOBAL event_scheduler = ON;
