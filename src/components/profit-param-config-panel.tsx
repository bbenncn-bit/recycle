'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type AdminRow = {
  id: number;
  paramKey: string;
  nameCn: string;
  category: string;
  subCategory: string | null;
  steelMill: string | null;
  value: number;
  unit: string | null;
  remark: string | null;
  history: Record<string, number>;
};

type PendingChange = {
  id: number;
  paramKey: string;
  nameCn: string;
  unit: string | null;
  oldValue: number;
  newValue: number;
  effectiveDate: string;
};

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  other_cost: '其它成本',
  other_income: '其它收入',
};

export default function ProfitParamConfigPanel() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [draftEffectiveDate, setDraftEffectiveDate] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/profit-management/profit-param-config', {
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const list = (json.data || []) as AdminRow[];
      setRows(list);
      const init: Record<number, string> = {};
      const initDates: Record<number, string> = {};
      const today = todayYmd();
      for (const r of list) {
        init[r.id] = String(r.value);
        initDates[r.id] = today;
      }
      setDraft(init);
      setDraftEffectiveDate(initDates);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingChanges = useMemo((): PendingChange[] => {
    const out: PendingChange[] = [];
    for (const r of rows) {
      const raw = draft[r.id];
      if (raw === undefined) continue;
      const nv = parseFloat(raw);
      if (!Number.isFinite(nv)) continue;
      if (Math.abs(nv - r.value) < 1e-9) continue;
      out.push({
        id: r.id,
        paramKey: r.paramKey,
        nameCn: r.nameCn,
        unit: r.unit,
        oldValue: r.value,
        newValue: nv,
        effectiveDate: draftEffectiveDate[r.id] || todayYmd(),
      });
    }
    return out;
  }, [rows, draft, draftEffectiveDate]);

  const onPrepareConfirm = () => {
    if (pendingChanges.length === 0) {
      window.alert('请先修改需要变更的参数值');
      return;
    }
    setPending(pendingChanges);
    setConfirmOpen(true);
    setSaveMessage(null);
  };

  const onConfirmSave = async () => {
    setBusy(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/profit-management/profit-param-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          updates: pending.map((p) => ({
            id: p.id,
            newValue: p.newValue,
            effectiveDate: p.effectiveDate,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setConfirmOpen(false);
      setPending([]);
      setSaveMessage(json.data?.message || '保存成功');
      await load();
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, AdminRow[]>();
    for (const r of rows) {
      const key = r.category || 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900/50 dark:bg-gray-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            利润核算参数（ProfitParamConfig）
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
            销售明细利润分析中的运输费、税费、加工成本单价（processing_fee_for_refund × 净重）、即征即退、政府扶持、贴现、回款利息等均取自本表。
            确认修改后，旧值以 JSON 写入 previous_value（变更起始日期 → 前值）；发货日期早于该日期的结算单按历史值核算，当日及之后按新 value 核算。
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading || busy}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          重新加载
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {saveMessage && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-400">{saveMessage}</p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">加载参数表…</p>
      ) : (
        <div className="mt-4 space-y-6">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-sm font-medium text-violet-800 dark:text-violet-300 mb-2">
                {CATEGORY_LABEL[cat] || cat}
              </h3>
              <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        参数名
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        钢厂
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        当前值
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-28">
                        修改为
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        单位
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        变更起始日期
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        变更历史条数
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {list.map((r) => {
                      const changed =
                        draft[r.id] !== undefined &&
                        Math.abs(parseFloat(draft[r.id]) - r.value) >= 1e-9;
                      return (
                        <tr
                          key={r.id}
                          className={changed ? 'bg-amber-50/80 dark:bg-amber-950/30' : ''}
                        >
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                            <div className="font-medium">{r.nameCn}</div>
                            <div className="text-[10px] text-gray-500">{r.paramKey}</div>
                          </td>
                          <td className="px-2 py-2">{r.steelMill || '通用'}</td>
                          <td className="px-2 py-2 tabular-nums">{r.value}</td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="any"
                              className="w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                              value={draft[r.id] ?? ''}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, [r.id]: e.target.value }))
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-gray-500">{r.unit || '—'}</td>
                          <td className="px-2 py-2">
                            <input
                              type="date"
                              className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                              value={draftEffectiveDate[r.id] ?? todayYmd()}
                              onChange={(e) =>
                                setDraftEffectiveDate((d) => ({
                                  ...d,
                                  [r.id]: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-gray-500">
                            {Object.keys(r.history || {}).length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPrepareConfirm}
          disabled={loading || busy || pendingChanges.length === 0}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          确认保存修改（{pendingChanges.length} 项待提交）
        </button>
        {pendingChanges.length > 0 && (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            保存前将弹窗核对修改前后数值
          </span>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              确认修改利润核算参数
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              以下参数将立即写入数据库。修改前的值会按「变更起始日期」记入 previous_value JSON，影响后续利润重算口径。
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="rounded border border-gray-200 p-3 dark:border-gray-600"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {p.nameCn}
                  </div>
                  <div className="text-xs text-gray-500">{p.paramKey}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    变更起始日期：<strong>{p.effectiveDate}</strong>（该日及之后发货单用新值）
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 tabular-nums">
                    <span>
                      修改前：<strong>{p.oldValue}</strong>
                      {p.unit ? ` ${p.unit}` : ''}
                    </span>
                    <span>→</span>
                    <span>
                      修改后：<strong className="text-violet-700 dark:text-violet-300">
                        {p.newValue}
                      </strong>
                      {p.unit ? ` ${p.unit}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onConfirmSave}
                disabled={busy}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {busy ? '保存中…' : '确认变更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
