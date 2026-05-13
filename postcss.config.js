/**
 * PostCSS（Tailwind v4）：Next/Webpack 必须经此展开 Tailwind 语法。
 * 同时使用 postcss.config.js + package.json「postcss」字段，避免个别 Windows 环境未加载配置。
 */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
