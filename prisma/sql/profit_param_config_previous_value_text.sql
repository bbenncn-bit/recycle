-- 将 ProfitParamConfig.previous_value 改为 TEXT，用于存储 JSON 变更历史：{"2026-05-20T12:00:00.000Z": 70, ...}
-- 执行前请备份。若列为 DECIMAL 且仅有 NULL，可直接执行。

ALTER TABLE ProfitParamConfig
  MODIFY COLUMN previous_value TEXT NULL COMMENT '变更历史 JSON：修改时间ISO -> 前值';
