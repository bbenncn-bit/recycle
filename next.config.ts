import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Turbopack 开发模式会校验来源；局域网用 IP 访问时需把完整 origin 加进来。
 * 例：LAN_DEV_ORIGIN=http://10.54.28.215:3000 或 NEXT_ALLOWED_DEV_ORIGINS=http://10.54.28.215:3000,http://127.0.0.1:3000
 */
const envDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const lanDevOrigin = (process.env.LAN_DEV_ORIGIN ?? "").trim();
const mergedDevOrigins = Array.from(
  new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(lanDevOrigin ? [lanDevOrigin] : []),
    ...envDevOrigins,
  ])
);

const nextConfig: NextConfig = {
  ...(!isProd && mergedDevOrigins.length > 0 ? { allowedDevOrigins: mergedDevOrigins } : {}),

  /** 减轻 echarts / heroicons 等包的首屏解析体积 */
  experimental: {
    optimizePackageImports: ['echarts', 'echarts-for-react', '@heroicons/react'],
  },

  /**
   * instrumentation / API 等服务端代码若把 mariadb 打进 webpack，会解析其内部的 require('stream') 并报错。
   * 列为外部包，运行时使用 Node 原生解析。
   */
  serverExternalPackages: ["mariadb", "@prisma/adapter-mariadb", "mysql2"],

  // 注意：instrumentation.ts 在 Next.js 15+ 中默认启用，无需配置
  turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    }, 
  // 仅在生产构建时使用 standalone 输出
  ...(process.env.NODE_ENV === 'production' && {
  output: 'standalone',
  }),
  
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://www.pxrecycle.com',
  },
  
  // 安全头：生产环境启用 HSTS + CSP；开发环境不发送 HSTS（避免浏览器对 http://IP 强制升级 HTTPS 导致联机失败），并放宽 CSP 以允许 HMR WebSocket
  async headers() {
    if (!isProd) {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "Content-Security-Policy",
              value:
                "default-src 'self' data: blob: http: https: ws: wss:; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; " +
                "style-src 'self' 'unsafe-inline' http: https:; " +
                "img-src 'self' https: http: data: blob:; " +
                "font-src 'self' data: http: https:; " +
                "connect-src 'self' http: https: ws: wss: data: blob:;",
            },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ],
        },
      ];
    }
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              /* 内网 http://IP 部署时需允许 http，否则 fetch/图片可能被浏览器拦截 */
              "default-src 'self' http: https:; img-src 'self' http: https: data: blob:; style-src 'self' 'unsafe-inline' http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; font-src 'self' http: https: data:; connect-src 'self' http: https: ws: wss: data: blob:;",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  
  // 图片配置
  images: {
    domains: ['www.pxrecycle.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.pxrecycle.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // 确保生产环境下强制HTTPS
  ...(process.env.NODE_ENV === 'production' && {
    trailingSlash: false,
    compress: true,
  }),

  // Windows 下 Webpack 监听偶发丢事件，可能加剧 .next 分块与清单不一致；使用 `npm run dev:webpack` 时更稳
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: process.env.NEXT_WEBPACK_POLL ? Number(process.env.NEXT_WEBPACK_POLL) : 1000,
        aggregateTimeout: 500,
      };
    }
    /**
     * `instrumentation` 使用 `instrument` layer，仍会被当作「需打包的 app layer」处理；
     * `serverExternalPackages` 有时不足以阻止 mariadb 进入打包图，进而触发其内部 `require('stream')` 解析失败。
     * 在服务端 Webpack 最前面强制将 DB 驱动标为 external，运行时用 Node 原生解析。
     */
    if (isServer) {
      const prev = config.externals;
      const forceNodeExternal = (
        ctx: { request?: string | undefined },
        callback: (err?: Error | null, result?: string) => void,
      ) => {
        const request = ctx.request;
        if (
          request === "mariadb" ||
          request === "mysql2" ||
          request === "@prisma/adapter-mariadb" ||
          (typeof request === "string" && request.startsWith("mariadb/"))
        ) {
          return callback(undefined, `commonjs ${request}`);
        }
        callback();
      };
      config.externals = [
        forceNodeExternal,
        ...(Array.isArray(prev) ? prev : prev != null ? [prev] : []),
      ];
    }
    return config;
  },
};
export default nextConfig;
