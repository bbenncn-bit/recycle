import { prisma } from '@/lib/prismadb';

/** 参数变更历史：修改时间 ISO → 该时间点之前的参数值 */
export type ProfitParamHistory = Record<string, number>;

export type ParamConfigRow = {
  id: number;
  paramKey: string;
  nameCn: string;
  category: string;
  subCategory: string | null;
  steelMill: string | null;
  effectiveDate: Date;
  value: number;
  previousValueRaw: string | null;
  unit: string | null;
  remark: string | null;
};

export type ProfitParamAdminRow = ParamConfigRow & {
  history: ProfitParamHistory;
};

export interface ProfitParamSnapshot {
  transportFee: number;
  roadLossFactor: number;
  taxRateMain: number;
  taxRateExtra: number;
  processingFeeForRefund: number;
  instantRefundRate: number;
  govSubsidyRate41: number;
  govSubsidyRate10: number;
  govSubsidyRate80: number;
  govSubsidyRate003: number;
  govSubsidyRate100: number;
  govSubsidyRate70: number;
  govSubsidyRate38: number;
  discountRatePinggang: number;
  collectionDaysPinggang: number;
  collectionDaysJigang: number;
  collectionDaysXingang: number;
  interestRateAnnual: number;
}

const DEFAULT_PROCESSING_COST_PER_TON = 70;

function processDecimal(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return parseFloat(String((value as { toString(): string }).toString())) || 0;
  }
  return 0;
}

/** 解析 previous_value 列（JSON 字符串；旧库若为纯数字则视为无历史） */
export function parseProfitParamHistory(raw: unknown): ProfitParamHistory {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const out: ProfitParamHistory = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (Number.isFinite(n)) out[k] = n;
    }
    return out;
  }
  const s = String(raw).trim();
  if (!s) return {};
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      return parseProfitParamHistory(JSON.parse(s));
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * 按发货日取参数：变更时间之前的结算单用历史中对应前值；之后用当前 value。
 * previous_value 为空则始终用 value。
 */
function parseChangeDateKeyMs(key: string): number {
  const m = key.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  const t = new Date(key).getTime();
  return Number.isNaN(t) ? NaN : t;
}

export function getParamValueAtDeliveryDate(
  currentValue: number,
  history: ProfitParamHistory,
  deliveryDate: Date
): number {
  const keys = Object.keys(history).filter((k) => !Number.isNaN(parseChangeDateKeyMs(k)));
  if (keys.length === 0) return currentValue;
  keys.sort((a, b) => parseChangeDateKeyMs(a) - parseChangeDateKeyMs(b));
  const d = new Date(deliveryDate);
  d.setHours(0, 0, 0, 0);
  const dMs = d.getTime();
  for (const k of keys) {
    const changeMs = parseChangeDateKeyMs(k);
    if (dMs < changeMs) return history[k];
  }
  return currentValue;
}

export function getEffectiveParamValue(
  rows: ParamConfigRow[],
  paramKey: string,
  steelMill: string | null,
  deliveryDate: Date
): number {
  const normalized = new Date(deliveryDate);
  normalized.setHours(0, 0, 0, 0);
  const list = rows.filter(
    (r) =>
      r.paramKey === paramKey &&
      (r.steelMill === steelMill || r.steelMill === null)
  );
  if (list.length === 0) return 0;
  const specific = list.filter((r) => r.steelMill === steelMill);
  const pool = specific.length > 0 ? specific : list;
  pool.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  const row =
    pool.find((r) => {
      const d = new Date(r.effectiveDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() <= normalized.getTime();
    }) ?? pool[pool.length - 1];
  const history = parseProfitParamHistory(row.previousValueRaw);
  return getParamValueAtDeliveryDate(row.value, history, normalized);
}

export function buildParamSnapshot(
  allRows: ParamConfigRow[],
  deliveryDate: Date,
  steelMill: string | null
): ProfitParamSnapshot {
  const mill = steelMill || '';
  const v = (key: string) => getEffectiveParamValue(allRows, key, null, deliveryDate);
  const vMill = (key: string) => getEffectiveParamValue(allRows, key, mill, deliveryDate);
  const transportFee =
    mill === '萍钢'
      ? vMill('transport_fee_pinggang')
      : mill === '吉钢'
        ? vMill('transport_fee_jigang')
        : mill === '新钢'
          ? vMill('transport_fee_xingang')
          : 0;
  const roadLoss = v('road_loss_factor') || 1.03;
  return {
    transportFee,
    roadLossFactor: roadLoss,
    taxRateMain: v('tax_rate_main') || 10,
    taxRateExtra: v('tax_rate_extra') || 0.03,
    processingFeeForRefund:
      v('processing_fee_for_refund') || DEFAULT_PROCESSING_COST_PER_TON,
    instantRefundRate: v('instant_refund_rate') || 30,
    govSubsidyRate41: v('gov_subsidy_rate_41') || 41,
    govSubsidyRate10: v('gov_subsidy_rate_10') || 10,
    govSubsidyRate80: v('gov_subsidy_rate_80') || 80,
    govSubsidyRate003: v('gov_subsidy_rate_003') || 0.03,
    govSubsidyRate100: v('gov_subsidy_rate_100') || 100,
    govSubsidyRate70: v('gov_subsidy_rate_70') || 70,
    govSubsidyRate38: v('gov_subsidy_rate_38') || 38,
    discountRatePinggang: vMill('discount_rate_pinggang') || 2.18,
    collectionDaysPinggang: vMill('collection_days_pinggang') || 18,
    collectionDaysJigang: vMill('collection_days_jigang') || 12,
    collectionDaysXingang: vMill('collection_days_xingang') || 37,
    interestRateAnnual: v('interest_rate_annual') || 3,
  };
}

export async function loadAllParamConfigRows(): Promise<ParamConfigRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        paramKey: string;
        nameCn: string;
        category: string;
        subCategory: string | null;
        steelMill: string | null;
        effectiveDate: Date | string;
        value: unknown;
        previousValue: unknown;
        unit: string | null;
        remark: string | null;
      }>
    >`
      SELECT
        id,
        param_key AS paramKey,
        name_cn AS nameCn,
        category,
        sub_category AS subCategory,
        steel_mill AS steelMill,
        effective_date AS effectiveDate,
        value,
        previous_value AS previousValue,
        unit,
        remark
      FROM ProfitParamConfig
      ORDER BY category, param_key, steel_mill
    `;
    return rows
      .map((r) => {
        const effectiveDate = new Date(r.effectiveDate);
        if (Number.isNaN(effectiveDate.getTime())) return null;
        let prevRaw: string | null = null;
        if (r.previousValue != null && r.previousValue !== '') {
          if (typeof r.previousValue === 'string') {
            const t = r.previousValue.trim();
            prevRaw = t.startsWith('{') ? t : null;
          }
        }
        return {
          id: Number(r.id),
          paramKey: r.paramKey,
          nameCn: r.nameCn,
          category: r.category,
          subCategory: r.subCategory,
          steelMill: r.steelMill,
          effectiveDate,
          value: processDecimal(r.value),
          previousValueRaw: prevRaw,
          unit: r.unit,
          remark: r.remark,
        } as ParamConfigRow;
      })
      .filter((r): r is ParamConfigRow => r !== null);
  } catch (e) {
    console.warn('加载 ProfitParamConfig 失败，将使用默认常量:', e);
    return [];
  }
}

export async function listProfitParamConfigForAdmin(): Promise<ProfitParamAdminRow[]> {
  const rows = await loadAllParamConfigRows();
  return rows.map((r) => ({
    ...r,
    history: parseProfitParamHistory(r.previousValueRaw),
  }));
}

export type ProfitParamApplyResult = {
  id: number;
  paramKey: string;
  nameCn: string;
  oldValue: number;
  newValue: number;
  changeTime: string;
};

/** 变更起始日期键（YYYY-MM-DD），写入 previous_value JSON */
export function normalizeProfitParamChangeDateKey(input: string): string {
  const t = (input ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function applyProfitParamUpdates(
  updates: Array<{ id: number; newValue: number; effectiveDate?: string }>
): Promise<ProfitParamApplyResult[]> {
  const applied: ProfitParamApplyResult[] = [];
  for (const u of updates) {
    const existing = await prisma.$queryRaw<
      Array<{
        id: number;
        paramKey: string;
        nameCn: string;
        value: unknown;
        previousValue: unknown;
      }>
    >`
      SELECT id, param_key AS paramKey, name_cn AS nameCn, value, previous_value AS previousValue
      FROM ProfitParamConfig WHERE id = ${u.id} LIMIT 1
    `;
    const row = existing[0];
    if (!row) continue;
    const oldValue = processDecimal(row.value);
    const newValue = Number(u.newValue);
    if (!Number.isFinite(newValue)) continue;
    if (Math.abs(oldValue - newValue) < 1e-9) continue;

    const history = parseProfitParamHistory(row.previousValue);
    const changeTime = normalizeProfitParamChangeDateKey(u.effectiveDate ?? '');
    history[changeTime] = oldValue;
    const historyJson = JSON.stringify(history);

    await prisma.$executeRaw`
      UPDATE ProfitParamConfig
      SET value = ${newValue},
          previous_value = ${historyJson},
          updated_at = NOW()
      WHERE id = ${u.id}
    `;

    applied.push({
      id: u.id,
      paramKey: row.paramKey,
      nameCn: row.nameCn,
      oldValue,
      newValue,
      changeTime,
    });
  }
  return applied;
}
