'use client';

import { useCallback, useEffect, useState } from 'react';
import ProcessingCostInputQueryPanel from '@/components/processing-cost-input-query-panel';
import ProfitParamConfigPanel from '@/components/profit-param-config-panel';

const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

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

type Me = { username: string };

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
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [cacheRange, setCacheRange] = useState(defaultCacheRange);
  const [maxRows, setMaxRows] = useState(2000);
  const [deleteOrderId, setDeleteOrderId] = useState('');
  const [deleteOrderOpenid, setDeleteOrderOpenid] = useState('');
  const [cacheRefreshSuccess, setCacheRefreshSuccess] = useState<{
    startDate: string;
    endDate: string;
    total: number;
    success: number;
    withCost: number;
    logId?: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ops-auth/me', { credentials: 'same-origin' });
        const json = await res.json();
        if (!cancelled && res.ok && json.success && json.data?.username) {
          setMe({ username: json.data.username as string });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/profit-management/operations?logLimit=80', {
        headers: JSON_HEADERS,
        credentials: 'same-origin',
      });
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
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const postAction = async (body: Record<string, unknown>) => {
    const label = String(body.action || 'request');
    setBusy(label);
    setLastResult(null);
    if (body.action === 'refreshMaterialCostCache') {
      setCacheRefreshSuccess(null);
    }
    try {
      const res = await fetch('/api/profit-management/operations', {
        method: 'POST',
        headers: JSON_HEADERS,
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setLastResult(json);
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      if (body.action === 'refreshMaterialCostCache' && json.data) {
        const d = json.data as Record<string, unknown>;
        setCacheRefreshSuccess({
          startDate: String(body.startDate ?? ''),
          endDate: String(body.endDate ?? ''),
          total: Number(d.total ?? 0),
          success: Number(d.success ?? 0),
          withCost: Number(d.withCost ?? 0),
          logId: d.logId != null ? Number(d.logId) : undefined,
        });
      }
      await loadStatus();
    } catch (e) {
      setLastResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    await fetch('/api/ops-auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/profit-management/operations/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">算账经营 · 运维</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              高权限操作。与小程序/云函数共用同一 MySQL。按分类使用，避免在业务未要求时全量重算。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {me && (
              <span className="text-gray-600 dark:text-gray-300">
                已登录 <span className="font-medium text-gray-900 dark:text-white">{me.username}</span>
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              退出
            </button>
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">何时用哪一块</h2>
          <ul className="mt-2 list-inside list-disc space-y-1.5 opacity-95">
            <li>
              <strong>基地采购 → 毛料库存</strong>：向 <code className="rounded bg-black/10 px-1">PurchaseWarehouse</code>{' '}
              新增行后，可用本页「增量同步」；或使用{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                pm2 长驻进程自动同步
              </strong>
              （见仓库 <code className="rounded bg-black/10 px-1">ecosystem.config.cjs</code>
              ）。推荐在 MySQL 执行 <code className="rounded bg-black/10 px-1">prisma/sql/purchase_warehouse_sync_signal.sql</code>
              ：入库表有 INSERT/UPDATE 时才置「待同步」标志；无变更时每轮只做单行查询，不做大表 COUNT。轮询间隔由{' '}
              <code className="rounded bg-black/10 px-1">PURCHASE_AUTO_SYNC_INTERVAL_MS</code> 决定（如 15000 ={' '}
              <strong>15 秒</strong>，不是 1.5 秒）。无长驻 Node 时用{' '}
              <code className="rounded bg-black/10 px-1">CRON_SYNC_SECRET</code> +{' '}
              <code className="rounded bg-black/10 px-1">POST /api/cron/sync-purchase-material</code>。
            </li>
            <li>
              <strong>材料成本缓存</strong>：利润分析页数据异常、或期间内采购/生产有大批变更后，按日期范围刷新。
            </li>
            <li>
              <strong>加工单删除</strong>：需撤销某条已保存的加工单并回滚毛料/成品库存时；危险操作，需确认单号。
            </li>
            <li>
              <strong>成品库存一致性</strong>：发现 <code className="rounded bg-black/10 px-1">ProductStock</code> 与加工汇总
              对不上时，先「巡检」再视情况「修复」。
            </li>
            <li>
              <strong>最近库存流水</strong>：审计最近毛料变动，不修改数据。
            </li>
            <li>
              <strong>加工明细查询</strong>：按月份查看 ProcessingCostInput 投料与成品产量。
            </li>
            <li>
              <strong>利润核算参数</strong>：修改 ProfitParamConfig（加工费、税费、即征即退等）后，利润分析按发货日期与变更历史重算。
            </li>
          </ul>
        </section>

        <ProcessingCostInputQueryPanel />

        <ProfitParamConfigPanel />

        <section className="rounded-lg border border-blue-200 bg-blue-50/90 p-4 text-sm text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
          <h2 className="font-medium text-blue-950 dark:text-blue-50">增量同步会不会打乱加工单对毛料的扣减？</h2>
          <p className="mt-2 opacity-95">
            <strong>不会。</strong>增量同步只扫描{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/15">PurchaseWarehouse.id</code> 大于游标{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/15">purchase_warehouse_last_id</code> 的<strong>新行</strong>
            ，对每条基地收货行向 <code className="rounded bg-black/10 px-1 dark:bg-white/15">MaterialStorage</code>{' '}
            做<strong>入库累加</strong>（流水类型如 PURCHASE_IN），并推进游标。加工单扣减是另一条业务流水，不会在增量同步里被撤销或覆盖。
          </p>
          <p className="mt-2 opacity-95">
            界面上的 <strong>maxRows（如 2000）</strong>表示<strong>本轮最多处理多少条「尚未同步」的新入库行</strong>（分批），
            不是按日期回溯、也不是把库存拉回某个历史切片，因此<strong>不会选到「加工单之前」再来覆盖加工影响</strong>。
          </p>
          <p className="mt-2 text-xs opacity-90">
            注意：若<strong>修改</strong>了<strong>游标之前已处理过</strong>的旧入库单行，增量同步<strong>不会</strong>自动重放该行；这种情况需全量重算或手工调账。
          </p>
        </section>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">安全说明</p>
          <p className="mt-1 opacity-95">
            运维 API 仅接受已登录会话（HTTP-only Cookie）。请在登录后再操作；定时入库同步请使用{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">POST /api/cron/sync-purchase-material</code>。
          </p>
          <p className="mt-2 opacity-95">
            <strong>加工单删除</strong>：已登录运维账号时可不填 openid。
          </p>
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

        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">一、基地采购与毛料库存</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">采购入库 → 毛料库存</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              口径与小程序一致：基地收货、干基吨与不含税金额；入库单行库区为「库区优先，空则仓库」。
            </p>
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
              若未开启服务端自动轮询（见上文环境变量），仅写入库表不会更新 MaterialStorage，须手动增量同步或 Cron 接口。
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">材料成本缓存</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              使用 TypeScript LIFO 写入 MaterialCostCache。利润分析页<strong>优先读缓存</strong>，但<strong>自动忽略</strong>
              2026-08-11 之前的旧缓存（多为旧 SP 虚高成本，曾导致 4/5 月吨钢毛利异常）。未命中会实时 LIFO 并回写。加工录入与运维删单回滚都会作废相关成品缓存；若刚批量删/改加工单后材料成本未变，对本区间点下方「刷新材料成本缓存」即可立即生效，无需等明天。请勿执行旧版{' '}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">CALL sp_update_material_cost_cache</code>
              。
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
            {cacheRefreshSuccess && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                <p className="font-medium">材料成本缓存刷新成功</p>
                <p className="mt-1 text-xs opacity-90">
                  {cacheRefreshSuccess.startDate} ~ {cacheRefreshSuccess.endDate}：共处理{' '}
                  {cacheRefreshSuccess.total} 条，写入 {cacheRefreshSuccess.success} 条，材料成本 &gt; 0 共{' '}
                  {cacheRefreshSuccess.withCost} 条。
                </p>
                <a
                  href="/profit-management/operations/material-cost-cache-logs"
                  className="mt-2 inline-block text-xs font-medium text-emerald-800 underline dark:text-emerald-300"
                >
                  查看刷新日志与汇总说明 →
                </a>
              </div>
            )}
          </section>
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">二、加工与成品库存</h2>

        <section className="rounded-lg border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">加工单删除（回滚库存）</h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            按单据把毛料加回 <code className="rounded bg-black/5 px-1 dark:bg-white/10">MaterialStorage</code>
            ，成品扣减 <code className="rounded bg-black/5 px-1 dark:bg-white/10">ProductStock</code>
            ，再删除 <code className="rounded bg-black/5 px-1 dark:bg-white/10">ProcessingCostInput</code>。若库内已手工删单，本功能无法推断用量。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">加工单 id（ProcessingCostInput.id）</label>
              <input
                type="number"
                min={1}
                value={deleteOrderId}
                onChange={(e) => setDeleteOrderId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                placeholder="例如 1514"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                录入人 openid（不填本页已登录运维时一般可不填，与行内一致可加强校验）
              </label>
              <input
                type="text"
                value={deleteOrderOpenid}
                onChange={(e) => setDeleteOrderOpenid(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                placeholder="与行内 openid 一致"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => {
              const id = parseInt(deleteOrderId, 10);
              if (!id || id < 1) {
                alert('请输入有效的加工单 id');
                return;
              }
              if (
                !confirm(
                  `确认删除加工单 id=${id} 并回滚毛料与成品？此操作在同一事务内执行，不可撤销。`
                )
              ) {
                return;
              }
              const payload: Record<string, unknown> = {
                action: 'deleteProcessingOrder',
                id,
              };
              const o = deleteOrderOpenid.trim();
              if (o) payload.openid = o;
              postAction(payload);
            }}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy === 'deleteProcessingOrder' ? '执行中…' : '删除加工单并回滚'}
          </button>
        </section>

        <section className="rounded-lg border border-indigo-200 bg-white p-4 dark:border-indigo-900/50 dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">库存一致性巡检 / 修复（成品）</h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            对比 <code className="rounded bg-black/5 px-1 dark:bg-white/10">ProcessingCostInput</code> 汇总加工量与{' '}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">ProductStock.stock_qty</code>。先巡检再修复。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => postAction({ action: 'reconcileProductStock', apply: false })}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy === 'reconcileProductStock' ? '执行中…' : '巡检差异（不落库）'}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                if (
                  !confirm(
                    '将按 ProcessingCostInput 汇总值覆盖 ProductStock.stock_qty（仅修复差异行）。是否继续？'
                  )
                ) {
                  return;
                }
                postAction({ action: 'reconcileProductStock', apply: true });
              }}
              className="rounded-md border border-indigo-600 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-100 dark:hover:bg-indigo-950/60"
            >
              {busy === 'reconcileProductStock' ? '执行中…' : '一键修复差异'}
            </button>
          </div>
        </section>

        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">三、审计</h2>

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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">最近库存流水</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">仅展示，不修改数据。</p>
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
                        {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '—'}
                      </td>
                      <td className="px-3 py-2">{r.change_type}</td>
                      <td className="max-w-[120px] truncate px-3 py-2" title={r.storage_area}>
                        {r.storage_area}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2" title={r.material_type}>
                        {r.material_type}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{String(r.qty_delta)}</td>
                      <td
                        className="max-w-[140px] truncate px-3 py-2 text-gray-600 dark:text-gray-400"
                        title={`${r.source_type || ''} ${r.source_ref || ''}`}
                      >
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
      <p
        className={`mt-1 text-lg font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}
      >
        {ok ? '已就绪' : '缺失'}
      </p>
    </div>
  );
}
