/**
 * pm2 生产启动：先 npm run build，再 pm2 start ecosystem.config.cjs
 *
 * - next.config 启用 output: 'standalone' 时，应启动 `.next/standalone/server.js`，否则会出现
 *   「next start does not work with output: standalone」警告，行为不可依赖。
 * - 数据库、OPS_JWT_SECRET（运维登录 JWT）等放在 .env / .env.production（勿提交密钥）。
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, ".env.production") });

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");
const useStandalone = fs.existsSync(standaloneServer);
/** Windows 下 PM2 对「脚本=next、args=start」偶发丢失参数，导致等价于裸跑 next（易误入 dev/Webpack）。改用 node 显式拉起 CLI。 */
const nodeExe = process.execPath;
const nextCli = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

module.exports = {
  apps: [
    {
      name: "pxrecycle",
      cwd: __dirname,
      script: nodeExe,
      args: useStandalone
        ? [standaloneServer]
        : [nextCli, "start", "-H", "0.0.0.0", "-p", "3000"],
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
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
        // 15 秒轮询一次；有 PurchaseWarehouseSyncSignal 且 pending=0 时不扫大表
        PURCHASE_AUTO_SYNC_INTERVAL_MS: "15000",
        PURCHASE_AUTO_SYNC_MAX_ROWS: "1000",
        PURCHASE_AUTO_SYNC_USE_SIGNAL: "1",
      },
    },
  ],
};
