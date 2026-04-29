/**
 * pm2 生产启动：先 build（npm run build），再 pm2 start ecosystem.config.cjs
 *
 * 数据库连接等敏感项放在 .env / .env.production，由下方 dotenv 注入；
 * 采购自动同步参数在此给出生产默认值（可被环境变量覆盖）。
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, ".env.production") });

module.exports = {
  apps: [
    {
      name: "pxrecycle",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 30,
      min_uptime: "10s",
      restart_delay: 4000,
      kill_timeout: 10000,
      max_memory_restart: "1G",
      listen_timeout: 15000,
      env: {
        NODE_ENV: "production",
        // 15 秒轮询一次；有 PurchaseWarehouseSyncSignal 且 pending=0 时不扫大表
        PURCHASE_AUTO_SYNC_INTERVAL_MS: "15000",
        PURCHASE_AUTO_SYNC_MAX_ROWS: "1000",
        PURCHASE_AUTO_SYNC_USE_SIGNAL: "1",
      },
    },
  ],
};
