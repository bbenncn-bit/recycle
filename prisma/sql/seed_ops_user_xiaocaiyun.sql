-- 运维账号：用户名 xiaocaiyun，密码 332211（bcrypt 12 轮，由应用 bcryptjs 生成）
-- 执行后可用该账号登录 /profit-management/operations/login
-- 生产环境请在 .env / .env.production 配置 OPS_JWT_SECRET（与签发 Cookie 一致）

INSERT INTO `OpsConsoleUser` (`username`, `password_hash`, `created_at`, `updated_at`)
VALUES (
  'xiaocaiyun',
  '$2b$12$KnDyrG9bUXllALHbTjOOY.USG8JY2XHQ9vVYpgAe7vUtYfp7JiFX6',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `updated_at` = NOW();
