import localFont from "next/font/local";

/**
 * 字体以 woff2 形式放在 `src/fonts/`（来自 Inter / Lusitana 的 OFL 发行包），构建期不发起外网请求。
 */
export const inter = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const lusitana = localFont({
  src: [
    {
      path: "../fonts/lusitana-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/lusitana-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  preload: true,
});
