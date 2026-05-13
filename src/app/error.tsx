'use client';

import { useEffect } from 'react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">页面加载出错</h1>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
        多为浏览器缓存了旧版本脚本或网络不稳定导致。可尝试点击下方按钮重试；若刚部署过新版本，建议「强制刷新」(
        Ctrl+F5 ) 或清除本站缓存。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          重试
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          刷新页面
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && error.message ? (
        <pre className="mt-4 max-w-full overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-red-800 dark:bg-gray-800 dark:text-red-300">
          {error.message}
        </pre>
      ) : null}
    </div>
  );
}
