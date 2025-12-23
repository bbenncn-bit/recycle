import type { NextConfig } from "next";

const path = require('path');
const nextConfig: NextConfig = {
  // 启用 instrumentation hook（用于应用启动时的初始化）
  experimental: {
    instrumentationHook: true,
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://www.pxrecycle.com',
  },
  
  // 安全头配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; font-src 'self' https: data:;",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
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
};
export default nextConfig;
