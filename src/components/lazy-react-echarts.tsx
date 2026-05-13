'use client';

import dynamic from 'next/dynamic';

function ChartChunkFallback() {
  return (
    <div
      className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-md bg-gray-100 px-4 text-center text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      role="alert"
    >
      <span>图表资源加载失败（常见于网络波动或部署更新后旧缓存）。</span>
      <button
        type="button"
        className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        onClick={() => window.location.reload()}
      >
        刷新页面
      </button>
    </div>
  );
}

/** 按需加载 ECharts，减轻首屏 JS；失败时不致使整页崩溃 */
const LazyReactECharts = dynamic(
  () =>
    import('echarts-for-react').catch(() => ({
      default: ChartChunkFallback,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full min-h-[260px] w-full animate-pulse rounded-md bg-gray-200/80 dark:bg-gray-700/70"
        aria-hidden
      />
    ),
  },
);

export default LazyReactECharts;
