'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

type ProfitSubitems = {
  processingCost: number;
  transportCost: number;
  taxCost: number;
  discountCost: number;
  interestCost: number;
  immediateRefund: number;
  governmentSupport: number;
  otherCosts: number;
  otherIncome: number;
  profit: number;
  profitPerNetTon: number;
  salesUnitExclTax: number;
  transportPerTon: number;
  taxBasePerTon: number;
  taxPerTon: number;
  discountPerTon: number;
  interestPerTon: number;
  taxBaseTotal: number;
  discountTranche1: number;
  discountTranche2: number;
  immediateRefundPerTon: number;
  governmentSupportPerTon: number;
  refundBaseTotal: number;
  governmentSupportMain: number;
  governmentSupportStamp: number;
  governmentSupportTaxExtra: number;
};

type PreviewSample = {
  deliveryNumber: string;
  deliveryDate: string;
  productType: string;
  productDisplayName: string;
  warehouse: string;
  customer: string;
  settlementQuantity: number;
  netWeight: number;
  revenue: number;
  materialCost: number;
};

type PreviewBasis = {
  customer: string;
  revenueInclTax: number;
  settlementQuantity: number;
  netWeight: number;
  materialCost: number;
  materialUnitExclTax: number;
  warehouseTaxRate: number;
};

type PreviewPayload = {
  found: boolean;
  month: string;
  usedFallback: boolean;
  deliveryDateIso: string;
  sample: PreviewSample;
  basis: PreviewBasis;
  subitems: ProfitSubitems;
};

type ItemKey = '9' | '10' | '11';

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

function fmt(n: number | undefined | null, digits = 2): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 9/10/11 三项分别涉及的参数键 */
const ITEM_PARAM_KEYS: Record<ItemKey, string[]> = {
  '9': ['processing_fee_for_refund'],
  '10': [
    'transport_fee_pinggang',
    'transport_fee_jigang',
    'transport_fee_xingang',
    'road_loss_factor',
    'tax_rate_main',
    'tax_rate_extra',
    'discount_rate_pinggang',
    'collection_days_pinggang',
    'reverse_discount_annual_rate',
    'reverse_discount_occupancy_days',
    'collection_days_jigang',
    'collection_days_xingang',
    'interest_rate_annual',
  ],
  '11': [
    'instant_refund_rate',
    'gov_subsidy_rate',
    'gov_subsidy_rate_41',
    'gov_subsidy_rate_70',
    'is_give_ces',
    'is_give_tax_extra',
  ],
};

const ITEM_LABEL: Record<ItemKey, string> = {
  '9': '加工成本(元)',
  '10': '其它成本(元)',
  '11': '其它收入(元)',
};

export default function ProfitParamConfigPanel() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [draftEffectiveDate, setDraftEffectiveDate] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 试算样本
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [subitems, setSubitems] = useState<ProfitSubitems | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const [modalItem, setModalItem] = useState<ItemKey | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, prevRes] = await Promise.all([
        fetch('/api/profit-management/profit-param-config', { credentials: 'same-origin' }),
        fetch('/api/profit-management/profit-param-config/preview', { credentials: 'same-origin' }),
      ]);
      const cfgJson = await cfgRes.json();
      if (!cfgRes.ok || !cfgJson.success) throw new Error(cfgJson.error || `HTTP ${cfgRes.status}`);
      const list = (cfgJson.data || []) as AdminRow[];
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

      const prevJson = await prevRes.json();
      if (prevRes.ok && prevJson.success) {
        setPreview(prevJson.data as PreviewPayload);
        setSubitems((prevJson.data as PreviewPayload).subitems);
      } else {
        setPreview(null);
        setSubitems(null);
      }
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

  // 草稿变化 → 防抖试算（套用草稿参数到样本行）
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!preview || !preview.found) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setRecomputing(true);
      try {
        const draftArr = rows
          .map((r) => ({ id: r.id, value: parseFloat(draft[r.id] ?? String(r.value)) }))
          .filter((x) => Number.isFinite(x.value));
        const res = await fetch('/api/profit-management/profit-param-config/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            basis: preview.basis,
            deliveryDateIso: preview.deliveryDateIso,
            draft: draftArr,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) setSubitems(json.data.subitems as ProfitSubitems);
      } catch {
        // 忽略试算错误（保留上次结果）
      } finally {
        setRecomputing(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, preview]);

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
      window.alert('请先在 9 / 10 / 11 三项中调整参数');
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
          updates: pending.map((p) => ({ id: p.id, newValue: p.newValue, effectiveDate: p.effectiveDate })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setConfirmOpen(false);
      setPending([]);
      setSaveMessage(json.data?.message || '保存成功，销售明细利润分析将按新参数计算。');
      await load();
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const itemValue = (item: ItemKey): number => {
    if (!subitems) return 0;
    if (item === '9') return subitems.processingCost;
    if (item === '10') return subitems.otherCosts;
    return subitems.otherIncome;
  };

  const itemChangedCount = (item: ItemKey): number =>
    ITEM_PARAM_KEYS[item].reduce((acc, key) => {
      const r = rows.find((x) => x.paramKey === key);
      if (!r) return acc;
      const nv = parseFloat(draft[r.id] ?? String(r.value));
      return acc + (Number.isFinite(nv) && Math.abs(nv - r.value) >= 1e-9 ? 1 : 0);
    }, 0);

  const sample = preview?.sample;

  return (
    <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900/50 dark:bg-gray-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">利润核算参数（ProfitParamConfig）</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            以 <strong>{preview?.month || '当月'}</strong> 结算单的第一行真实数据为样本，按 9 / 10 / 11 三项调参。点击某项可弹窗填参数，
            <strong>实时核算并粗体显示该项金额与利润、吨钢毛利</strong>；确认后参数固化到 ProfitParamConfig，销售明细利润分析按此计算。
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

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saveMessage && <p className="mt-3 text-sm text-green-700 dark:text-green-400">{saveMessage}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">加载样本与参数表…</p>
      ) : !preview?.found ? (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          未找到可用于试算的结算单样本（当月与历史均无数据）。导入结算单后可用此功能试算。
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {preview.usedFallback && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              当月（{preview.month}）暂无结算单，已回退到最近一条结算单作为试算样本。
            </p>
          )}

          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="text-left text-gray-600 dark:text-gray-300">
                  <th className="px-2 py-2 font-medium">发货单号</th>
                  <th className="px-2 py-2 font-medium">发货日期</th>
                  <th className="px-2 py-2 font-medium">成品/库别</th>
                  <th className="px-2 py-2 font-medium">客户</th>
                  <th className="px-2 py-2 text-right font-medium">净重(吨)</th>
                  <th className="px-2 py-2 text-right font-medium">结算量(吨)</th>
                  <th className="px-2 py-2 text-right font-medium">收入(含税)</th>
                  <th className="px-2 py-2 text-right font-medium">材料成本(元)</th>
                  <th className="px-2 py-2 text-center font-medium text-violet-700 dark:text-violet-300">9 加工成本</th>
                  <th className="px-2 py-2 text-center font-medium text-violet-700 dark:text-violet-300">10 其它成本</th>
                  <th className="px-2 py-2 text-center font-medium text-violet-700 dark:text-violet-300">11 其它收入</th>
                  <th className="px-2 py-2 text-right font-medium">利润(元)</th>
                  <th className="px-2 py-2 text-right font-medium">吨钢毛利(元/吨)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-2 py-2 tabular-nums">{sample?.deliveryNumber || '—'}</td>
                  <td className="px-2 py-2 tabular-nums">{sample?.deliveryDate || '—'}</td>
                  <td className="px-2 py-2">{sample?.productDisplayName || '—'}</td>
                  <td className="px-2 py-2">{sample?.customer || '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(sample?.netWeight, 3)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(sample?.settlementQuantity, 3)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(sample?.revenue)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(sample?.materialCost)}</td>
                  {(['9', '10', '11'] as ItemKey[]).map((item) => {
                    const changed = itemChangedCount(item);
                    return (
                      <td key={item} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setModalItem(item)}
                          className={`w-full rounded-md border px-2 py-1.5 text-right font-bold tabular-nums transition ${
                            changed > 0
                              ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200'
                              : 'border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200'
                          }`}
                          title="点击调整该项参数"
                        >
                          {fmt(itemValue(item))}
                          {changed > 0 && <span className="ml-1 text-[10px]">●{changed}</span>}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right">
                    <span className="font-bold tabular-nums text-gray-900 dark:text-white">{fmt(subitems?.profit)}</span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {fmt(subitems?.profitPerNetTon)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPrepareConfirm}
              disabled={busy || pendingChanges.length === 0}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              确认并保存（{pendingChanges.length} 项待提交）
            </button>
            {recomputing && <span className="text-xs text-gray-500">试算中…</span>}
            {pendingChanges.length > 0 && (
              <span className="text-xs text-amber-700 dark:text-amber-300">保存前将弹窗核对修改前后数值</span>
            )}
          </div>
        </div>
      )}

      {modalItem && (
        <ItemConfigModal
          item={modalItem}
          rows={rows.filter((r) => ITEM_PARAM_KEYS[modalItem].includes(r.paramKey))}
          allRows={rows}
          draft={draft}
          draftEffectiveDate={draftEffectiveDate}
          subitems={subitems}
          sample={sample}
          basis={preview?.basis}
          recomputing={recomputing}
          onChangeDraft={(id, v) => setDraft((d) => ({ ...d, [id]: v }))}
          onChangeDate={(id, v) => setDraftEffectiveDate((d) => ({ ...d, [id]: v }))}
          onClose={() => setModalItem(null)}
        />
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">确认固化利润核算参数</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              以下参数将写入 ProfitParamConfig。修改前的值按「变更起始日期」记入 previous_value（早于该日期的发货单仍按历史值核算）。
            </p>
            <div className="mt-3 rounded-md bg-violet-50 p-3 text-sm dark:bg-violet-950/30">
              试算样本利润：<strong className="tabular-nums">{fmt(subitems?.profit)} 元</strong>，吨钢毛利：
              <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">{fmt(subitems?.profitPerNetTon)} 元/吨</strong>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {pending.map((p) => (
                <li key={p.id} className="rounded border border-gray-200 p-3 dark:border-gray-600">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{p.nameCn}</div>
                  <div className="text-xs text-gray-500">{p.paramKey}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    变更起始日期：<strong>{p.effectiveDate}</strong>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 tabular-nums">
                    <span>修改前：<strong>{p.oldValue}</strong>{p.unit ? ` ${p.unit}` : ''}</span>
                    <span>→</span>
                    <span>修改后：<strong className="text-violet-700 dark:text-violet-300">{p.newValue}</strong>{p.unit ? ` ${p.unit}` : ''}</span>
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

function ItemConfigModal({
  item,
  rows,
  draft,
  draftEffectiveDate,
  subitems,
  sample,
  basis,
  recomputing,
  onChangeDraft,
  onChangeDate,
  onClose,
  allRows,
}: {
  item: ItemKey;
  rows: AdminRow[];
  allRows: AdminRow[];
  draft: Record<number, string>;
  draftEffectiveDate: Record<number, string>;
  subitems: ProfitSubitems | null;
  sample: PreviewSample | undefined;
  basis: PreviewBasis | undefined;
  recomputing: boolean;
  onChangeDraft: (id: number, v: string) => void;
  onChangeDate: (id: number, v: string) => void;
  onClose: () => void;
}) {
  const itemAmount = item === '9' ? subitems?.processingCost : item === '10' ? subitems?.otherCosts : subitems?.otherIncome;

  // 仅展示与当前客户相关的钢厂专属参数（避免财务被无关钢厂参数干扰）
  const customer = (basis?.customer || '').trim();

  // 解析当前草稿下的参数实值（优先取当前客户的钢厂专属行，否则取通用行）
  const resolveParam = (key: string): number => {
    const candidates = allRows.filter((r) => r.paramKey === key);
    const pick =
      candidates.find((r) => r.steelMill === customer) ??
      candidates.find((r) => r.steelMill === null) ??
      candidates[0];
    if (!pick) return 0;
    const v = parseFloat(draft[pick.id] ?? String(pick.value));
    return Number.isFinite(v) ? v : 0;
  };

  // 计算明细中用到的中间量
  const q = sample?.settlementQuantity ?? 0;
  const nw = sample?.netWeight ?? 0;
  const salesExcl = subitems?.salesUnitExclTax ?? 0;
  const salesIncl = salesExcl * 1.13;
  const matUnit = basis?.materialUnitExclTax ?? 0;
  const whTax = basis?.warehouseTaxRate ?? 0;
  const base = subitems?.taxBasePerTon ?? 0;
  const transportPerTon = subitems?.transportPerTon ?? 0;

  // 参数实值
  const pProcessing = resolveParam('processing_fee_for_refund');
  const pRoadLoss = resolveParam('road_loss_factor');
  const pTaxMain = resolveParam('tax_rate_main');
  const pTaxExtra = resolveParam('tax_rate_extra');
  const pInterestAnnual = resolveParam('interest_rate_annual');
  const pTransportFee =
    customer === '萍钢'
      ? resolveParam('transport_fee_pinggang')
      : customer === '吉钢'
        ? resolveParam('transport_fee_jigang')
        : customer === '新钢'
          ? resolveParam('transport_fee_xingang')
          : 0;
  const pDiscountRate = resolveParam('discount_rate_pinggang');
  const pDiscountDays = customer === '萍钢' ? resolveParam('collection_days_pinggang') : 0;
  const pReverseRate = resolveParam('reverse_discount_annual_rate');
  const pReverseDays = resolveParam('reverse_discount_occupancy_days');
  const pCollectionDays =
    customer === '萍钢'
      ? resolveParam('collection_days_pinggang')
      : customer === '吉钢'
        ? resolveParam('collection_days_jigang')
        : customer === '新钢'
          ? resolveParam('collection_days_xingang')
          : 0;
  const revenueInclTotal = sample?.revenue ?? 0;
  const pInstantRefund = resolveParam('instant_refund_rate');
  const pGovRate = allRows.some((x) => x.paramKey === 'gov_subsidy_rate')
    ? resolveParam('gov_subsidy_rate')
    : resolveParam('gov_subsidy_rate_41');
  const pGov70 = resolveParam('gov_subsidy_rate_70');
  const pGiveCes = resolveParam('is_give_ces');
  const pGiveTaxExtra = resolveParam('is_give_tax_extra');
  const giveCesFlag = pGiveCes >= 1 ? 1 : 0;
  const giveTaxExtraFlag = pGiveTaxExtra >= 1 ? 1 : 0;
  const isInstantRefundMill = customer === '新钢';

  // 其它收入（项11）基数：按"本单总额"
  const rGov = pGovRate / 100;
  const r70 = pGov70 / 100;
  const revenueExclTotal = (sample?.revenue ?? 0) / 1.13;
  const matCostTotal = sample?.materialCost ?? 0;
  const procCostTotal = subitems?.processingCost ?? 0;
  const transCostTotal = subitems?.transportCost ?? 0;
  const refundBase = subitems?.refundBaseTotal ?? 0;
  const refundBaseSteps: string[] = [
    `基数 base = 收入不含税×13% − 材料成本×入库单税率 − 加工成本×9% − 运输费×3%`,
    `= ${fmt(revenueExclTotal)}×13%(${fmt(revenueExclTotal * 0.13)}) − ${fmt(matCostTotal)}×${fmt(whTax * 100)}%(${fmt(matCostTotal * whTax)}) − ${fmt(procCostTotal)}×9%(${fmt(procCostTotal * 0.09)}) − ${fmt(transCostTotal)}×3%(${fmt(transCostTotal * 0.03)})`,
    `= ${fmt(refundBase)} 元`,
  ];
  const govT1 = isInstantRefundMill ? refundBase * rGov * r70 : refundBase * rGov;
  const govT2 = (revenueExclTotal + matCostTotal) * 0.0003 * giveCesFlag;
  const govT3 = refundBase * 0.1 * giveTaxExtraFlag;

  const taxBaseTotal = subitems?.taxBaseTotal ?? 0;
  const taxTermMain = taxBaseTotal * (pTaxMain / 100);
  const taxTermExtra = (revenueExclTotal + matCostTotal) * (pTaxExtra / 100);
  const taxBaseSteps: string[] = [
    `税费基数 = 收入不含税×13% − 材料成本×入库税率 − 加工成本×9% − 运输费×3%`,
    `= ${fmt(revenueExclTotal)}×13%(${fmt(revenueExclTotal * 0.13)}) − ${fmt(matCostTotal)}×${fmt(whTax * 100)}%(${fmt(matCostTotal * whTax)}) − ${fmt(procCostTotal)}×9%(${fmt(procCostTotal * 0.09)}) − ${fmt(transCostTotal)}×3%(${fmt(transCostTotal * 0.03)})`,
    `= ${fmt(taxBaseTotal)} 元`,
  ];

  const breakdown: Array<{ label: string; value: number; steps: string[] }> = (() => {
    if (!subitems) return [];
    if (item === '9') {
      return [
        {
          label: '加工成本',
          value: subitems.processingCost,
          steps: [
            `加工成本 = 加工单价(processing_fee_for_refund) × 净重`,
            `= ${fmt(pProcessing)} 元/吨 × ${fmt(nw, 3)} 吨`,
            `= ${fmt(subitems.processingCost)} 元`,
          ],
        },
      ];
    }
    if (item === '10') {
      return [
        {
          label: '运输费',
          value: subitems.transportCost,
          steps: [
            `运输费 = 运输费(transport_fee_${customer || '钢厂'}) ÷ 路损系数(road_loss_factor) × 净重`,
            `= ${fmt(pTransportFee)} ÷ ${fmt(pRoadLoss)} × ${fmt(nw, 3)} 吨`,
            `= ${fmt(subitems.transportCost)} 元`,
          ],
        },
        {
          label: '税费',
          value: subitems.taxCost,
          steps: [
            ...taxBaseSteps,
            `主税 = 税费基数 × 主税率(tax_rate_main) ${fmt(pTaxMain)}% = ${fmt(taxTermMain)} 元`,
            `附加税 = (收入不含税 ${fmt(revenueExclTotal)} + 材料成本 ${fmt(matCostTotal)}) × 附加税率(tax_rate_extra) ${fmt(pTaxExtra)}% = ${fmt(taxTermExtra)} 元`,
            `税费 = ${fmt(taxTermMain)} + ${fmt(taxTermExtra)} = ${fmt(subitems.taxCost)} 元`,
          ],
        },
        {
          label: '贴现费用',
          value: subitems.discountCost,
          steps:
            customer === '萍钢'
              ? [
                  `段1 = 销售收入含税 ${fmt(revenueInclTotal)} × 贴现年利率(discount_rate_pinggang) ${fmt(pDiscountRate)}% × 贴现天数(collection_days_pinggang) ${fmt(pDiscountDays, 0)} ÷ 360 = ${fmt(subitems.discountTranche1)} 元`,
                  `段2 = 销售收入含税 ${fmt(revenueInclTotal)} × 反贴现息年利率(reverse_discount_annual_rate) ${fmt(pReverseRate)}% × 占用天数(reverse_discount_occupancy_days) ${fmt(pReverseDays, 0)} ÷ 360 = ${fmt(subitems.discountTranche2)} 元`,
                  `贴现费用 = 段1 + 段2 = ${fmt(subitems.discountCost)} 元`,
                ]
              : [`贴现费用仅「萍钢」计提；当前客户「${customer || '—'}」不计提，为 0 元`],
        },
        {
          label: '回款利息',
          value: subitems.interestCost,
          steps: [
            `回款利息 = 销售收入含税 × 年利率(interest_rate_annual) ÷ 360 × 回款周期(collection_days_${customer || '钢厂'})`,
            `= ${fmt(revenueInclTotal)} × ${fmt(pInterestAnnual)}% ÷ 360 × ${fmt(pCollectionDays, 0)} 天`,
            `= ${fmt(subitems.interestCost)} 元`,
          ],
        },
      ];
    }
    return [
      {
        label: '即征即退',
        value: subitems.immediateRefund,
        steps: isInstantRefundMill
          ? [
              ...refundBaseSteps,
              `即征即退 = 基数 ${fmt(refundBase)} × 即征即退率(instant_refund_rate) ${fmt(pInstantRefund)}% = ${fmt(subitems.immediateRefund)} 元`,
            ]
          : [`即征即退仅「新钢」计提；当前客户「${customer || '—'}」为 0 元`],
      },
      {
        label: '政府扶持资金',
        value: subitems.governmentSupport,
        steps: [
          ...refundBaseSteps,
          isInstantRefundMill
            ? `项1(主比例) = 基数 × gov_subsidy_rate ${fmt(pGovRate)}% × 70%(gov_subsidy_rate_70) = ${fmt(subitems.governmentSupportMain)} 元`
            : `项1(主比例) = 基数 × gov_subsidy_rate ${fmt(pGovRate)}% = ${fmt(subitems.governmentSupportMain)} 元`,
          `项2(印花税) = (收入不含税+材料成本) × 0.03% × is_give_ces(${giveCesFlag}) = ${fmt(subitems.governmentSupportStamp)} 元`,
          `项3(城建及教育) = 基数 × 10% × is_give_tax_extra(${giveTaxExtraFlag}) = ${fmt(subitems.governmentSupportTaxExtra)} 元`,
          `政府扶持 = 项1 + 项2 + 项3 = ${fmt(subitems.governmentSupport)} 元`,
        ],
      },
    ];
  })();

  const visibleRows = rows.filter((r) => {
    if (!r.steelMill) return true; // 通用参数
    return r.steelMill === customer; // 钢厂专属：只显示当前客户
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">设置 · {ITEM_LABEL[item]}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          样本：<strong>{sample?.productDisplayName}</strong>（{sample?.customer}）净重 {fmt(sample?.netWeight, 3)} 吨 / 结算量{' '}
          {fmt(sample?.settlementQuantity, 3)} 吨 / 收入(含税) {fmt(sample?.revenue)} 元。
          {item === '9' && '加工成本 = 加工单价(元/吨) × 净重。'}
          {item === '10' &&
            '其它成本 = 运输费(运价÷路损×净重) + 税费 + 贴现费用(仅萍钢两段) + 回款利息；参数均来自 ProfitParamConfig。'}
          {item === '11' &&
            '其它收入 = 即征即退(仅新钢) + 政府扶持；基数 = 收入不含税×13% − 材料成本×入库单税率 − 加工成本×9% − 运输费×3%。'}
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-2 py-2 font-medium">参数名</th>
                <th className="px-2 py-2 font-medium">钢厂</th>
                <th className="px-2 py-2 font-medium">当前值</th>
                <th className="px-2 py-2 font-medium w-28">设为</th>
                <th className="px-2 py-2 font-medium">单位</th>
                <th className="px-2 py-2 font-medium whitespace-nowrap">变更起始日期</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const nv = parseFloat(draft[r.id] ?? String(r.value));
                const changed = Number.isFinite(nv) && Math.abs(nv - r.value) >= 1e-9;
                return (
                  <tr key={r.id} className={`border-t border-gray-100 dark:border-gray-700 ${changed ? 'bg-amber-50/70 dark:bg-amber-950/30' : ''}`}>
                    <td className="px-2 py-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{r.nameCn}</div>
                      <div className="text-[10px] text-gray-500">{r.paramKey}</div>
                      {r.remark && <div className="mt-0.5 text-[10px] text-gray-400">{r.remark}</div>}
                    </td>
                    <td className="px-2 py-2">{r.steelMill || '通用'}</td>
                    <td className="px-2 py-2 tabular-nums">{r.value}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="any"
                        className="w-24 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                        value={draft[r.id] ?? ''}
                        onChange={(e) => onChangeDraft(r.id, e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-gray-500">{r.unit || '—'}</td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                        value={draftEffectiveDate[r.id] ?? todayYmd()}
                        onChange={(e) => onChangeDate(r.id, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-center text-gray-400">该项暂无可配置参数</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/30">
            <div className="text-xs text-gray-600 dark:text-gray-300">{ITEM_LABEL[item]} 当前试算结果{recomputing ? '（试算中…）' : ''}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-violet-800 dark:text-violet-200">{fmt(itemAmount)} 元</div>
            <ul className="mt-2 space-y-0.5 text-[11px] text-gray-600 dark:text-gray-300">
              {breakdown.map((b) => (
                <li key={b.label} className="flex justify-between tabular-nums">
                  <span>{b.label}</span>
                  <span className="font-medium">{fmt(b.value)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="text-xs text-gray-600 dark:text-gray-300">该样本行利润 / 吨钢毛利</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">{fmt(subitems?.profit)} 元</div>
            <div className="mt-1 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {fmt(subitems?.profitPerNetTon)} 元/吨
            </div>
          </div>
        </div>

        {/* 计算过程：始终完整展示，逐步给出每个值的来源与结果 */}
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-200">
            计算过程（参数变动时实时更新；括号内为所用参数键与取值）
          </div>
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.label} className="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{b.label}</span>
                  <span className="text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">{fmt(b.value)} 元</span>
                </div>
                <ol className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                  {b.steps.map((s, i) => (
                    <li key={i} className="break-words tabular-nums">{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            完成该项设置
          </button>
        </div>
      </div>
    </div>
  );
}
