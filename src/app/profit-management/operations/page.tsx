'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const SECRET_STORAGE_KEY = 'inventory-ops-secret';

type StatusPayload = {
  syncStateTable: boolean;
  changeLogTable: boolean;
  purchaseSyncLastId: number | null;
  materialCostCacheRows: number;
  recentLogs: Array<{
    id: string | number;
    business_date: string | null;
    change_type: string;
    source_type: string | null;
    source_ref: string | null;
    storage_area: string;
    material_type: string;
    qty_before: unknown;
    qty_delta: unknown;
    qty_after: unknown;
    created_at: string | null;
  }>;
};

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultCacheRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: formatYmd(start), end: formatYmd(end) };
}

export default function ProfitOperationsPage() {
  const [secret, setSecret] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(SECRET_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [cacheRange, setCacheRange] = useState(defaultCacheRange);
  const [maxRows, setMaxRows] = useState(2000);

  const headers = useMemo((): HeadersInit => {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (secret.trim()) {
      (h as Record<string, string>)['x-inventory-ops-secret'] = secret.trim();
    }
    return h;
  }, [secret]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/profit-management/operations?logLimit=80', { headers });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setStatus(json.data as StatusPayload);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '加载失败');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const persistSecret = () => {
    try {
      if (secret.trim()) localStorage.setItem(SECRET_STORAGE_KEY, secret.trim());
      else localStorage.removeItem(SECRET_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    loadStatus();
  };

  const postAction = async (body: Record<string, unknown>) => {
    const label = String(body.action || 'request');
    setBusy(label);
    setLastResult(null);
    try {
      const res = await fetch('/api/profit-management/operations', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setLastResult(json);
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      await loadStatus();
    } catch (e) {
      setLastResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">算账经营 · 运维</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            采购同步至毛料库存、全量重算、材料成本缓存刷新。与小程序/云函数共用同一 MySQL。
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">安全说明</p>
          <p className="mt-1 opacity-95">
            若在生产环境设置了环境变量 <code className="rounded bg-black/10 px-1 dark:bg-white/10">INVENTORY_OPS_SECRET</code>
            ，则须在下方填写相同密钥并在请求头携带（本页已自动附加）。未设置时本地开发可直接调用。
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              运维密钥（可选，存浏览器本地）
            </label>
            <input
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="与服务器 INVENTORY_OPS_SECRET 一致"
            />
          </div>
          <button
            type="button"
            onClick={persistSecret}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            保存并刷新
          </button>
        </div>

        {loadError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {loadError}
          </div>
        )}

        {loading && !status && !loadError && (
          <p className="text-sm text-gray-500 dark:text-gray-400">加载中…</p>
        )}

        {status && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="MaterialStorageSyncState" ok={status.syncStateTable} />
            <StatCard title="MaterialStorageChangeLog" ok={status.changeLogTable} />
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">采购同步游标 ID</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                {status.purchaseSyncLastId ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">MaterialCostCache 行数</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                {status.materialCostCacheRows}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">毛料库存（采购）</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              口径与小程序一致：基地收货 SH（剔除三库），干基吨数、不含税金额。
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">增量同步 maxRows</label>
                <input
                  type="number"
                  min={100}
                  max={10000}
                  value={maxRows}
                  onChange={(e) => setMaxRows(parseInt(e.target.value, 10) || 2000)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    postAction({ action: 'syncPurchase', maxRows, trigger: 'next_web' })
                  }
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy === 'syncPurchase' ? '执行中…' : '增量同步采购'}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => {
                    if (
                      !confirm(
                        '全量重算将按历史采购单汇总回填 MaterialStorage（冻结别名行除外）。是否继续？'
                      )
                    ) {
                      return;
                    }
                    postAction({ action: 'rebuildPurchase', touchOnlyMatched: true });
                  }}
                  className="rounded-md border border-orange-500 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-900 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-100 dark:hover:bg-orange-950/60"
                >
                  {busy === 'rebuildPurchase' ? '执行中…' : '全量重算'}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">材料成本缓存</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              执行 <code className="rounded bg-black/5 px-1 dark:bg-white/10">CALL sp_update_material_cost_cache</code>{' '}
              写入 MaterialCostCache，供利润分析页使用。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">开始日期</label>
                <input
                  type="date"
                  value={cacheRange.start}
                  onChange={(e) => setCacheRange((r) => ({ ...r, start: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">结束日期</label>
                <input
                  type="date"
                  value={cacheRange.end}
                  onChange={(e) => setCacheRange((r) => ({ ...r, end: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                postAction({
                  action: 'refreshMaterialCostCache',
                  startDate: cacheRange.start,
                  endDate: cacheRange.end,
                })
              }
              className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === 'refreshMaterialCostCache' ? '执行中…' : '刷新材料成本缓存'}
            </button>
          </section>
        </div>

        {lastResult != null && (
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/40">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">上次接口返回</h3>
            <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-800 dark:text-gray-200">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </section>
        )}

        {status && status.recentLogs.length > 0 && (
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">最近库存流水</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">时间</th>
                    <th className="px-3 py-2 font-medium">类型</th>
                    <th className="px-3 py-2 font-medium">库区</th>
                    <th className="px-3 py-2 font-medium">物料</th>
                    <th className="px-3 py-2 font-medium">Δ吨</th>
                    <th className="px-3 py-2 font-medium">来源</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {status.recentLogs.map((r) => (
                    <tr key={String(r.id)} className="text-gray-800 dark:text-gray-200">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString('zh-CN')
                          : '—'}
                      </td>
                      <td className="px-3 py-2">{r.change_type}</td>
                      <td className="max-w-[120px] truncate px-3 py-2" title={r.storage_area}>
                        {r.storage_area}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2" title={r.material_type}>
                        {r.material_type}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{String(r.qty_delta)}</td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-gray-600 dark:text-gray-400" title={`${r.source_type || ''} ${r.source_ref || ''}`}>
                        {r.source_type} {r.source_ref}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, ok }: { title: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
        {ok ? '已就绪' : '缺失'}
      </p>
    </div>
  );
}
