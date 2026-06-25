-- 运维登录账号表（执行一次即可）
CREATE TABLE IF NOT EXISTS `OpsConsoleUser` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `permission` TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已开通',
  `last_login_at` DATETIME(0) NULL,
  `last_login_ip` VARCHAR(45) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `OpsConsoleUser_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
