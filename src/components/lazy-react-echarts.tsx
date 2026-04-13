'use client';

import dynamic from 'next/dynamic';

/** 按需加载 ECharts，减轻首屏 JS；图表容器请保留固定 height 以便占位条撑满 */
const LazyReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div
      className="h-full min-h-[260px] w-full animate-pulse rounded-md bg-gray-200/80 dark:bg-gray-700/70"
      aria-hidden
    />
  ),
});

export default LazyReactECharts;
