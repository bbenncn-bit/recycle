/**
 * Next.js standalone：官方要求将构建产物中的静态资源拷入 standalone 目录，
 * 否则 _next/static 与 public 会 404，Tailwind 等 CSS 不加载，页面只剩「巨大 SVG」等现象。
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneRoot = path.join(root, ".next", "standalone");

if (!fs.existsSync(standaloneRoot)) {
  console.log("[copy-standalone-static] skip: .next/standalone 不存在（未使用 output: standalone）");
  process.exit(0);
}

function cpDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("[copy-standalone-static] 源目录不存在，跳过:", src);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("[copy-standalone-static] OK:", path.relative(root, dest));
}

cpDir(path.join(root, ".next", "static"), path.join(standaloneRoot, ".next", "static"));
cpDir(path.join(root, "public"), path.join(standaloneRoot, "public"));
