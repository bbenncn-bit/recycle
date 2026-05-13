/**
 * PostCSS：Tailwind v4 必须用 @tailwindcss/postcss 展开 `@import "tailwindcss"`。
 * 使用 .cjs 避免个别环境下对 postcss.config.mjs 解析不一致（Webpack 报 Unexpected '@'）。
 */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
