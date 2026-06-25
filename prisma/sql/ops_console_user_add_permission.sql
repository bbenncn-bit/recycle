-- 运维账号审核字段：0=待审核，1=已开通（仅 1 可登录）
-- 已有账号在首次迁移时默认开通，避免升级后无法登录（仅执行一次）
ALTER TABLE `OpsConsoleUser`
  ADD COLUMN `permission` TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已开通' AFTER `password_hash`;

UPDATE `OpsConsoleUser` SET `permission` = 1;
