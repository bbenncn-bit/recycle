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

/**
 * 取生效参数值；当配置表中不存在该参数行时返回 null（用于区分"未配置"与"配置为 0"）。
 */
export function getEffectiveParamValueOrNull(
  rows: ParamConfigRow[],
  paramKey: string,
  steelMill: string | null,
  deliveryDate: Date
): number | null {
  const normalized = new Date(deliveryDate);
  normalized.setHours(0, 0, 0, 0);
  const list = rows.filter(
    (r) =>
      r.paramKey === paramKey &&
      (r.steelMill === steelMill || r.steelMill === null)
  );
  if (list.length === 0) return null;
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

export function getEffectiveParamValue(
  rows: ParamConfigRow[],
  paramKey: string,
  steelMill: string | null,
  deliveryDate: Date
): number {
  return getEffectiveParamValueOrNull(rows, paramKey, steelMill, deliveryDate) ?? 0;
}

export function buildParamSnapshot(
  allRows: ParamConfigRow[],
  deliveryDate: Date,
  steelMill: string | null
): ProfitParamSnapshot {
  const mill = steelMill || '';
  // 注意：用 ?? 而非 ||，使配置表中显式配置的 0 不被默认值覆盖（与"新标准=0 即关闭该项"一致）。
  const v = (key: string) => getEffectiveParamValueOrNull(allRows, key, null, deliveryDate);
  const vMill = (key: string) => getEffectiveParamValueOrNull(allRows, key, mill, deliveryDate);
  const transportFee =
    mill === '萍钢'
      ? vMill('transport_fee_pinggang')
      : mill === '吉钢'
        ? vMill('transport_fee_jigang')
        : mill === '新钢'
          ? vMill('transport_fee_xingang')
          : 0;
  const roadLoss = v('road_loss_factor') || 1.03; // 0 在此无意义（用作除数），保留 ||
  return {
    transportFee: transportFee ?? 0,
    roadLossFactor: roadLoss,
    taxRateMain: v('tax_rate_main') ?? 10,
    taxRateExtra: v('tax_rate_extra') ?? 0.03,
    processingFeeForRefund:
      v('processing_fee_for_refund') ?? DEFAULT_PROCESSING_COST_PER_TON,
    instantRefundRate: v('instant_refund_rate') ?? 30,
    govSubsidyRate41: v('gov_subsidy_rate_41') ?? 41,
    govSubsidyRate10: v('gov_subsidy_rate_10') ?? 10,
    govSubsidyRate80: v('gov_subsidy_rate_80') ?? 80,
    govSubsidyRate003: v('gov_subsidy_rate_003') ?? 0.03,
    govSubsidyRate100: v('gov_subsidy_rate_100') ?? 100,
    govSubsidyRate70: v('gov_subsidy_rate_70') ?? 70,
    govSubsidyRate38: v('gov_subsidy_rate_38') ?? 38,
    discountRatePinggang: vMill('discount_rate_pinggang') ?? 2.18,
    collectionDaysPinggang: vMill('collection_days_pinggang') ?? 18,
    collectionDaysJigang: vMill('collection_days_jigang') ?? 12,
    collectionDaysXingang: vMill('collection_days_xingang') ?? 37,
    interestRateAnnual: v('interest_rate_annual') ?? 3,
  };
}

// ---------------------------------------------------------------------------
// 共享纯函数：由列 1-8（结算单 + 材料成本）推导出的"基础量"出发，
// 套用 ProfitParamSnapshot 参数，算出 9 加工成本 / 10 其它成本 / 11 其它收入
// 以及 利润、吨钢毛利。利润分析逐单计算与运维页"试算"复用同一实现，确保一致。
// ---------------------------------------------------------------------------

/** 计算利润子项所需的"基础量"（来自结算单列 1-8 与 LIFO 材料成本） */
export interface ProfitRowBasis {
  /** 客户：萍钢 / 吉钢 / 新钢（其它客户大部分项为 0） */
  customer: string;
  /** 销售收入（含税，元） */
  revenueInclTax: number;
  /** 结算量（吨） */
  settlementQuantity: number;
  /** 发货净重（吨） */
  netWeight: number;
  /** 材料成本（元，LIFO） */
  materialCost: number;
  /** 材料单价（不含税，元/吨）= 材料成本 / 材料核算量 */
  materialUnitExclTax: number;
  /** 入库单加权平均税率（小数，如 0.13） */
  warehouseTaxRate: number;
}

/** 利润子项计算结果（含每吨明细，便于 UI 透出与核对公式） */
export interface ProfitSubitems {
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
  // 每吨/中间量（透出供 UI 核对）
  salesUnitExclTax: number;
  transportPerTon: number;
  taxBasePerTon: number;
  taxPerTon: number;
  discountPerTon: number;
  interestPerTon: number;
  immediateRefundPerTon: number;
  governmentSupportPerTon: number;
  /** 其它收入项基数（本单总额）：收入不含税×13% − 材料成本×入库税率 − 加工成本×9% − 运输费×3% */
  refundBaseTotal: number;
}

/** 贴现费用元/吨：仅萍钢，销售单价(不含税)×1.13×贴现率%（贴现率来自配置 discount_rate_pinggang） */
function computeDiscountPerTon(salesUnitExclTax: number, customer: string, s: ProfitParamSnapshot): number {
  if ((customer || '').trim() !== '萍钢') return 0;
  return salesUnitExclTax * 1.13 * (s.discountRatePinggang / 100);
}

/** 回款周期资金利息元/吨：销售单价(不含税)×1.13×年利率%/360×回款天数（天数来自配置，按钢厂） */
function computeInterestPerTon(salesUnitExclTax: number, customer: string, s: ProfitParamSnapshot): number {
  const c = (customer || '').trim();
  let days = 0;
  if (c === '萍钢') days = s.collectionDaysPinggang;
  else if (c === '吉钢') days = s.collectionDaysJigang;
  else if (c === '新钢') days = s.collectionDaysXingang;
  if (days === 0) return 0;
  return salesUnitExclTax * 1.13 * (s.interestRateAnnual / 100 / 360) * days;
}

export function computeProfitSubitems(basis: ProfitRowBasis, s: ProfitParamSnapshot): ProfitSubitems {
  const customer = (basis.customer || '').trim();
  const revenue = basis.revenueInclTax || 0;
  const quantity = basis.settlementQuantity || 0;
  const netWeight = basis.netWeight || 0;
  const materialCost = basis.materialCost || 0;
  const materialUnitExclTax = basis.materialUnitExclTax || 0;
  const warehouseTaxRate = basis.warehouseTaxRate || 0;

  const salesUnitExclTax = quantity > 0 ? revenue / quantity / 1.13 : 0;

  // 9 加工成本 = 加工单价(元/吨) × 净重(吨)（无净重时退化为结算量）
  const processingWeight = netWeight > 0 ? netWeight : quantity;
  const processingCost = processingWeight * s.processingFeeForRefund;

  // 10-① 运输费 = 客户运价(含税) × 出厂重量(=净重/路损系数)
  const transportWeight = netWeight > 0 ? netWeight : quantity;
  const transportCost =
    transportWeight > 0 && s.roadLossFactor > 0
      ? s.transportFee * (transportWeight / s.roadLossFactor)
      : 0;
  const transportPerTon = quantity > 0 ? transportCost / quantity : 0;

  // 税费基数 base = 销价(不含税)×13% − 材料单价(不含税)×入库税率 − 运输费/吨×3% − 加工费×9%
  const taxBasePerTon =
    quantity > 0
      ? salesUnitExclTax * 0.13 -
        materialUnitExclTax * warehouseTaxRate -
        transportPerTon * 0.03 -
        s.processingFeeForRefund * 0.09
      : 0;

  // 10-② 税费/吨 = base×主税率% + (销价+材料单价)×附加税率%
  const taxMain = s.taxRateMain / 100;
  const taxExtra = s.taxRateExtra / 100;
  const taxPerTon =
    quantity > 0 ? taxBasePerTon * taxMain + (salesUnitExclTax + materialUnitExclTax) * taxExtra : 0;

  // 10-③ 贴现费用/吨、10-④ 回款利息/吨
  const discountPerTon = computeDiscountPerTon(salesUnitExclTax, customer, s);
  const interestPerTon = computeInterestPerTon(salesUnitExclTax, customer, s);

  const taxCost = taxPerTon * quantity;
  const discountCost = discountPerTon * quantity;
  const interestCost = interestPerTon * quantity;
  const otherCosts = transportCost + taxCost + discountCost + interestCost;

  // 11 其它收入 = 即征即退 + 政府扶持资金（财务确认口径：基数与各项均按本单"总额"，不再乘结算量）
  //   基数 refundBase = 收入(不含税)×13% − 材料成本×入库单税率 − 加工成本×9% − 运输费×3%
  //   政府扶持 = refundBase×38%(gov_subsidy_rate_41)
  //            + refundBase×10%(gov_subsidy_rate_10)×80%(gov_subsidy_rate_80)
  //            + (收入不含税 + 材料成本)×0.03%(gov_subsidy_rate_003)×100%(gov_subsidy_rate_100)
  //     说明：原 70%×38%（即征即退为是）分支已弃用（两参数置 0），所有钢厂统一用 38% 主系数。
  //   即征即退（仅萍钢/新钢）= refundBase × 即征即退率(instant_refund_rate)
  const revenueExclTax = revenue / 1.13;
  const refundBaseTotal =
    revenueExclTax * 0.13 -
    materialCost * warehouseTaxRate -
    processingCost * 0.09 -
    transportCost * 0.03;

  let immediateRefund = 0;
  let governmentSupport = 0;
  if (customer === '萍钢' || customer === '新钢' || customer === '吉钢') {
    const r41 = s.govSubsidyRate41 / 100;
    const r10 = s.govSubsidyRate10 / 100;
    const r80 = s.govSubsidyRate80 / 100;
    const r003 = s.govSubsidyRate003 / 100;
    const r100 = s.govSubsidyRate100 / 100;
    governmentSupport =
      refundBaseTotal * r41 +
      refundBaseTotal * r10 * r80 +
      (revenueExclTax + materialCost) * r003 * r100;
    const isInstantRefund = customer === '萍钢' || customer === '新钢';
    immediateRefund = isInstantRefund ? refundBaseTotal * (s.instantRefundRate / 100) : 0;
  }
  const otherIncome = immediateRefund + governmentSupport;
  const immediateRefundPerTon = quantity > 0 ? immediateRefund / quantity : 0;
  const governmentSupportPerTon = quantity > 0 ? governmentSupport / quantity : 0;

  const profit = revenueExclTax - materialCost - processingCost - otherCosts + otherIncome;
  const profitPerNetTon = netWeight > 0 ? profit / netWeight : 0;

  return {
    processingCost,
    transportCost,
    taxCost,
    discountCost,
    interestCost,
    immediateRefund,
    governmentSupport,
    otherCosts,
    otherIncome,
    profit,
    profitPerNetTon,
    salesUnitExclTax,
    transportPerTon,
    taxBasePerTon,
    taxPerTon,
    discountPerTon,
    interestPerTon,
    immediateRefundPerTon,
    governmentSupportPerTon,
    refundBaseTotal,
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
