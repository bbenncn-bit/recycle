import type { ReactNode } from 'react';

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/90 dark:bg-gray-700/80 ${className ?? ''}`}
      aria-hidden
    />
  );
}

/** 成本分析页：标题 + 四格统计 + 多块图表占位（与真实布局一致）；topExtra 插在标题占位下方（如库存价值表） */
export function CostAnalysisSkeleton({ topExtra }: { topExtra?: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 space-y-3">
          <ShimmerBlock className="h-9 w-48" />
          <ShimmerBlock className="h-5 w-full max-w-xl" />
        </div>

        {topExtra}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
            <ShimmerBlock className="h-4 w-24" />
            <ShimmerBlock className="h-8 w-32" />
            <ShimmerBlock className="h-px w-full" />
            <ShimmerBlock className="h-4 w-28" />
            <ShimmerBlock className="h-6 w-36" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-2">
            <ShimmerBlock className="h-4 w-32 mb-4" />
            <ShimmerBlock className="h-[300px] w-full" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-3">
            <ShimmerBlock className="h-4 w-24" />
            <ShimmerBlock className="h-8 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ShimmerBlock className="h-[400px] w-full" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ShimmerBlock className="h-[400px] w-full" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <ShimmerBlock className="h-[400px] w-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ShimmerBlock className="h-[400px] w-full" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ShimmerBlock className="h-[400px] w-full" />
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          正在准备页面并加载成本数据（先显示汇总与趋势）…
        </p>
      </div>
    </div>
  );
}

/** 利润分析页：标题 + 说明条 + 统计卡片 + 图表 + 表格占位 */
export function ProfitAnalysisSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 space-y-3">
          <ShimmerBlock className="h-9 w-48" />
          <ShimmerBlock className="h-5 w-full max-w-2xl" />
        </div>

        <div className="mb-8 p-4 rounded-lg border border-blue-200/60 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-950/30 space-y-2">
          <ShimmerBlock className="h-4 w-40" />
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-3 w-full max-w-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-3">
              <ShimmerBlock className="h-4 w-28" />
              <ShimmerBlock className="h-8 w-36" />
              <ShimmerBlock className="h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ShimmerBlock className="h-[400px] w-full" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ShimmerBlock className="h-[400px] w-full" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 space-y-4">
          <ShimmerBlock className="h-7 w-32" />
          <ShimmerBlock className="h-10 w-full max-w-md" />
          <ShimmerBlock className="h-[220px] w-full" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <ShimmerBlock className="h-[400px] w-full" />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          正在计算销售与利润明细（含材料 LIFO），通常需数秒至数十秒，请稍候…
        </p>
      </div>
    </div>
  );
}
