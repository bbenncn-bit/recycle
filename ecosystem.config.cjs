module.exports = {
  apps: [
    {
      name: "pxrecycle",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // 监听所有网卡，供局域网其它电脑访问（否则部分环境下仅本机可连）
      args: "start -H 0.0.0.0 -p 3000",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      min_uptime: "10s",
      restart_delay: 3000,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};