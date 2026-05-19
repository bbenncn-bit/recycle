'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type LogRow = {
  id: number;
  createdAt: string | null;
  deliveryNumber: string | null;
  errorMessage: string | null;
};

export default function MaterialCostCacheLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/profit-management/material-cost-cache-logs?limit=80', {
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setLogs(json.data as LogRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            材料成本缓存刷新日志
          </h1>
          <Link
            href="/profit-management/operations"
            className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
          >
            返回运维
          </Link>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          每次在运维页执行「刷新材料成本缓存」会写入一条汇总记录（delivery_number 为空表示批次任务）。
        </p>

        {loading && <p className="text-sm text-gray-600 dark:text-gray-300">加载中…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">时间</th>
                  <th className="px-3 py-2">发货单号</th>
                  <th className="px-3 py-2">刷新信息</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                      暂无日志
                    </td>
                  </tr>
                ) : (
                  logs.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-3 py-2">{row.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString('zh-CN')
                          : '—'}
                      </td>
                      <td className="px-3 py-2">{row.deliveryNumber || '—'}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                        {row.errorMessage}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
