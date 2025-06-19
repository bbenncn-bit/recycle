import type { NextConfig } from "next";

const path = require('path');
const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    }, 
  },
  // enable font optimization for Turbopack compatibility
  optimizeFonts: true,
};
export default nextConfig;
