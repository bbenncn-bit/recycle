import localFont from "next/font/local";

/**
 * 使用 npm 包内 woff2，避免 next/font/google 在构建时请求 fonts.googleapis.com。
 * 在国内或受限网络下 Google IP 常超时（ETIMEDOUT），会导致整站构建失败、.next 缺失后页面异常。
 */
export const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const lusitana = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/lusitana/files/lusitana-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/lusitana/files/lusitana-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  preload: true,
});
