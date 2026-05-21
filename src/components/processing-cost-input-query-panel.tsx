'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Row = {
  id: number;
  productName: string;
  productionDate: string;
  materialFeed: string;
  dailyProcessQty: number;
  dailyProcessAmount: number;
};

function defaultMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

export default function ProcessingCostInputQueryPanel() {
  const [month, setMonth] = useState(defaultMonth);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      );
    }
    return opts;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/profit-management/processing-cost-input?month=${encodeURIComponent(month)}`,
        { credentials: 'same-origin' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setRows(json.data?.rows ?? []);
      setTotal(json.data?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '查询失败');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm dark:border-teal-900/50 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            加工明细查询（按月）
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
            数据来源 ProcessingCostInput。投料组成仅展示本单有投料量的毛料（对应 XXX_qty / XXX_price 列）。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span>月份</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            查询
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {loading ? '加载中…' : `共 ${total} 条（${monthLabel(month)}）`}
      </p>

      <div className="mt-3 overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700 max-h-[520px] overflow-y-auto">
        <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                品名
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                加工日期
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300 min-w-[280px]">
                投料组成
              </th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                成品吨数
              </th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                成品金额
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  该月无加工明细
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-2 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {r.productName}
                  </td>
                  <td className="px-2 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {r.productionDate}
                  </td>
                  <td className="px-2 py-2 text-gray-800 dark:text-gray-200 leading-relaxed">
                    {r.materialFeed}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {r.dailyProcessQty.toFixed(3)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {r.dailyProcessAmount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
