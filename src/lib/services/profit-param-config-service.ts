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
  /** 政府扶持主比例 gov_subsidy_rate（%），兼容旧键 gov_subsidy_rate_41 */
  govSubsidyRate: number;
  /** 即征即退为是时主比例再乘系数 gov_subsidy_rate_70（%） */
  govSubsidyRate70: number;
  /** 印花税扶持是否结给 is_give_ces：0 不结给 / 1 结给 */
  isGiveCes: number;
  /** 城建及教育税附加扶持是否结给 is_give_tax_extra：0 不结给 / 1 结给 */
  isGiveTaxExtra: number;
  discountRatePinggang: number;
  /** 萍钢贴现天数（collection_days_pinggang，与回款周期共用参数键） */
  collectionDaysPinggang: number;
  collectionDaysJigang: number;
  collectionDaysXingang: number;
  interestRateAnnual: number;
  /** 反贴现息年利率 reverse_discount_annual_rate */
  reverseDiscountAnnualRate: number;
  /** 反贴现息占用天数 reverse_discount_occupancy_days */
  reverseDiscountOccupancyDays: number;
}

const DEFAULT_PROCESSING_COST_PER_TON = 70;

/** 全局参数：steel_mill 为 NULL 或空字符串 */
function isGlobalSteelMill(v: string | null | undefined): boolean {
  return !(v ?? '').trim();
}

function normSteelMill(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t || null;
}

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
  const mill = normSteelMill(steelMill);
  const list = rows.filter((r) => {
    if (r.paramKey !== paramKey) return false;
    if (mill === null) return isGlobalSteelMill(r.steelMill);
    const rMill = normSteelMill(r.steelMill);
    return rMill === mill || rMill === null;
  });
  if (list.length === 0) return null;
  const specific = list.filter((r) => normSteelMill(r.steelMill) === mill);
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
    govSubsidyRate: v('gov_subsidy_rate') ?? v('gov_subsidy_rate_41') ?? 38,
    govSubsidyRate70: v('gov_subsidy_rate_70') ?? 70,
    isGiveCes: v('is_give_ces') ?? 0,
    isGiveTaxExtra: v('is_give_tax_extra') ?? 0,
    discountRatePinggang: vMill('discount_rate_pinggang') ?? 1.2,
    collectionDaysPinggang: vMill('collection_days_pinggang') ?? 120,
    collectionDaysJigang: vMill('collection_days_jigang') ?? 12,
    collectionDaysXingang: vMill('collection_days_xingang') ?? 37,
    interestRateAnnual: v('interest_rate_annual') ?? 3,
    reverseDiscountAnnualRate: v('reverse_discount_annual_rate') ?? 5.6,
    reverseDiscountOccupancyDays: v('reverse_discount_occupancy_days') ?? 60,
  };
}

/** ProfitParamConfig 中「入库单税率」参数键（单位 %） */
export const WAREHOUSE_TAX_PARAM_KEY = 'inbound_tax_rate';

/**
 * 从任意 inbound_tax_rate 行按发货日取 %（无视 steel_mill；该参数通常全厂共用）。
 */
function pickInboundTaxPercentFromRows(
  rows: ParamConfigRow[],
  deliveryDate: Date
): number | null {
  if (rows.length === 0) return null;
  const normalized = new Date(deliveryDate);
  normalized.setHours(0, 0, 0, 0);
  const pool = [...rows].sort(
    (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()
  );
  const row =
    pool.find((r) => {
      const d = new Date(r.effectiveDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() <= normalized.getTime();
    }) ?? pool[pool.length - 1];
  const hist = parseProfitParamHistory(row.previousValueRaw);
  const pct = getParamValueAtDeliveryDate(row.value, hist, normalized);
  return Number.isFinite(pct) && pct > 0 ? pct : null;
}

/**
 * 入库单税率（%）：严格按 ProfitParamConfig.inbound_tax_rate 的 value / previous_value
 * 与发货日匹配（变更日起用新值，之前用历史前值）。
 */
export function resolveWarehouseTaxRatePercentFromConfig(
  allRows: ParamConfigRow[],
  deliveryDate: Date,
  steelMill?: string | null
): number | null {
  const mill = normSteelMill(steelMill);
  const tryMills: (string | null)[] = mill ? [mill, null] : [null];
  for (const m of tryMills) {
    const byKey = getEffectiveParamValueOrNull(
      allRows,
      WAREHOUSE_TAX_PARAM_KEY,
      m,
      deliveryDate
    );
    if (byKey != null && Number.isFinite(byKey) && byKey > 0) return byKey;
  }

  // 无钢厂精确/全局行时：回退任意 steel_mill 的 inbound_tax_rate（运维常挂在某一钢厂下）
  const byAnyMill = pickInboundTaxPercentFromRows(
    allRows.filter((r) => r.paramKey === WAREHOUSE_TAX_PARAM_KEY),
    deliveryDate
  );
  if (byAnyMill != null) return byAnyMill;

  const nameRows = allRows.filter((r) => (r.nameCn || '').trim() === '入库单税率');
  return pickInboundTaxPercentFromRows(nameRows, deliveryDate);
}

/** 入库单税率（小数，如 0.13）；配置缺失或 ≤0 时返回 0 */
export function resolveWarehouseTaxRateDecimalFromConfig(
  allRows: ParamConfigRow[],
  deliveryDate: Date,
  steelMill?: string | null
): number {
  const pct = resolveWarehouseTaxRatePercentFromConfig(allRows, deliveryDate, steelMill);
  return pct != null && pct > 0 ? pct / 100 : 0;
}

/**
 * 确定本单实际采用的入库单税率：一律取 ProfitParamConfig.inbound_tax_rate（按发货日）。
 * @param _lifoDecimal 保留参数兼容旧调用；已不再用于优先覆盖配置值。
 */
export function resolveFinalWarehouseTaxRate(
  _lifoDecimal: number,
  allRows: ParamConfigRow[],
  deliveryDate: Date,
  steelMill?: string | null
): { rate: number; fromLifo: boolean; percent: number } {
  const pct = resolveWarehouseTaxRatePercentFromConfig(allRows, deliveryDate, steelMill);
  const rate = pct != null && pct > 0 ? pct / 100 : 0;
  return { rate, fromLifo: false, percent: pct ?? 0 };
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
  /** 入库单税率（小数，如 0.13）；来自 ProfitParamConfig.inbound_tax_rate（按发货日） */
  warehouseTaxRate: number;
  /** 兼容旧字段：入库单税率已不再走 LIFO 溯源，恒为 false */
  warehouseTaxRateFromLifo?: boolean;
}

/** 试算/展示前：将 inbound_tax_rate（按发货日）写入 basis.warehouseTaxRate */
export function applyWarehouseTaxToBasis(
  basis: ProfitRowBasis,
  allRows: ParamConfigRow[],
  deliveryDate: Date
): ProfitRowBasis {
  const resolved = resolveFinalWarehouseTaxRate(
    0,
    allRows,
    deliveryDate,
    basis.customer
  );
  return {
    ...basis,
    warehouseTaxRate: resolved.rate,
    warehouseTaxRateFromLifo: false,
  };
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
  /** 税费基数（本单总额，元） */
  taxBaseTotal: number;
  taxPerTon: number;
  discountPerTon: number;
  interestPerTon: number;
  /** 贴现费用第一段（萍钢：含税收入×贴现年利率×贴现天数/360） */
  discountTranche1: number;
  /** 贴现费用第二段（萍钢：含税收入×反贴现息年利率×占用天数/360） */
  discountTranche2: number;
  immediateRefundPerTon: number;
  governmentSupportPerTon: number;
  /** 其它收入项基数（本单总额）：收入不含税×13% − 材料成本×入库税率 − 加工成本×9% − 运输费×3% */
  refundBaseTotal: number;
  governmentSupportMain: number;
  governmentSupportStamp: number;
  governmentSupportTaxExtra: number;
}

/** 10-③ 贴现费用（元）：仅萍钢 = 销售收入含税×贴现年利率×贴现天数/360 + 销售收入含税×反贴现息年利率×反贴现占用天数/360 */
function computeDiscountCost(revenueInclTax: number, customer: string, s: ProfitParamSnapshot): {
  discountCost: number;
  tranche1: number;
  tranche2: number;
} {
  if ((customer || '').trim() !== '萍钢') return { discountCost: 0, tranche1: 0, tranche2: 0 };
  const tranche1 =
    revenueInclTax * (s.discountRatePinggang / 100) * (s.collectionDaysPinggang / 360);
  const tranche2 =
    revenueInclTax *
    (s.reverseDiscountAnnualRate / 100) *
    (s.reverseDiscountOccupancyDays / 360);
  return { discountCost: tranche1 + tranche2, tranche1, tranche2 };
}

/** 10-④ 回款周期资金利息（元）= 销售收入含税×年利率/360×回款周期天数 */
function computeInterestCost(revenueInclTax: number, customer: string, s: ProfitParamSnapshot): number {
  const c = (customer || '').trim();
  let days = 0;
  if (c === '萍钢') days = s.collectionDaysPinggang;
  else if (c === '吉钢') days = s.collectionDaysJigang;
  else if (c === '新钢') days = s.collectionDaysXingang;
  if (days <= 0) return 0;
  return revenueInclTax * (s.interestRateAnnual / 100 / 360) * days;
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

  // 10-① 运输费 = [运输费]/[路损系数]×净重
  const transportWeight = netWeight > 0 ? netWeight : quantity;
  const transportCost =
    transportWeight > 0 && s.roadLossFactor > 0
      ? (s.transportFee / s.roadLossFactor) * transportWeight
      : 0;
  const transportPerTon = quantity > 0 ? transportCost / quantity : 0;

  const revenueExclTax = revenue / 1.13;

  // 10-② 税费 = (收入不含税×13% − 材料成本×入库税率 − 加工成本×9% − 运输费×3%)×主税率 + (收入不含税+材料成本)×附加税率
  const taxBaseTotal =
    revenueExclTax * 0.13 -
    materialCost * warehouseTaxRate -
    processingCost * 0.09 -
    transportCost * 0.03;
  const taxMain = s.taxRateMain / 100;
  const taxExtra = s.taxRateExtra / 100;
  const taxCost = taxBaseTotal * taxMain + (revenueExclTax + materialCost) * taxExtra;
  const taxBasePerTon = quantity > 0 ? taxBaseTotal / quantity : 0;
  const taxPerTon = quantity > 0 ? taxCost / quantity : 0;

  // 10-③ 贴现费用（仅萍钢，两段）
  const { discountCost, tranche1: discountTranche1, tranche2: discountTranche2 } =
    computeDiscountCost(revenue, customer, s);
  const discountPerTon = quantity > 0 ? discountCost / quantity : 0;

  // 10-④ 回款周期资金利息
  const interestCost = computeInterestCost(revenue, customer, s);
  const interestPerTon = quantity > 0 ? interestCost / quantity : 0;

  const otherCosts = transportCost + taxCost + discountCost + interestCost;

  // 11 其它收入 = 即征即退 + 政府扶持资金（基数与税费/其它收入口径一致，按本单总额）
  //   基数 base = 收入不含税×13% − 材料成本×入库单税率 − 加工成本×9% − 运输费×3%
  //   即征即退（仅新钢）= base × instant_refund_rate
  //   政府扶持（萍钢/吉钢/新钢）：
  //     即征即退为否：base×gov_subsidy_rate + (收入不含税+材料)×0.03%×is_give_ces + base×10%×is_give_tax_extra
  //     即征即退为是（新钢）：base×gov_subsidy_rate×70% + 同上两项
  const refundBaseTotal = taxBaseTotal;

  const isInstantRefundCustomer = customer === '新钢';
  let immediateRefund = 0;
  let governmentSupport = 0;
  let governmentSupportMain = 0;
  let governmentSupportStamp = 0;
  let governmentSupportTaxExtra = 0;

  if (customer === '新钢') {
    immediateRefund = refundBaseTotal * (s.instantRefundRate / 100);
  }

  if (customer === '萍钢' || customer === '新钢' || customer === '吉钢') {
    const rMain = s.govSubsidyRate / 100;
    const r70 = s.govSubsidyRate70 / 100;
    const giveCes = s.isGiveCes >= 1 ? 1 : 0;
    const giveTaxExtra = s.isGiveTaxExtra >= 1 ? 1 : 0;
    const mainCoeff = isInstantRefundCustomer ? rMain * r70 : rMain;
    governmentSupportMain = refundBaseTotal * mainCoeff;
    governmentSupportStamp = (revenueExclTax + materialCost) * 0.0003 * giveCes;
    governmentSupportTaxExtra = refundBaseTotal * 0.1 * giveTaxExtra;
    governmentSupport =
      governmentSupportMain + governmentSupportStamp + governmentSupportTaxExtra;
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
    taxBaseTotal,
    taxPerTon,
    discountPerTon,
    interestPerTon,
    discountTranche1,
    discountTranche2,
    immediateRefundPerTon,
    governmentSupportPerTon,
    refundBaseTotal,
    governmentSupportMain,
    governmentSupportStamp,
    governmentSupportTaxExtra,
  };
}

/** 将 DB 读出的 previous_value（TEXT 字符串或 JSON 对象）规范为 JSON 字符串 */
export function normalizePreviousValueRaw(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith('{') || t.startsWith('[')) return t;
    return null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    try {
      return JSON.stringify(raw);
    } catch {
      return null;
    }
  }
  return null;
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
        return {
          id: Number(r.id),
          paramKey: r.paramKey,
          nameCn: r.nameCn,
          category: r.category,
          subCategory: r.subCategory,
          steelMill: r.steelMill,
          effectiveDate,
          value: processDecimal(r.value),
          previousValueRaw: normalizePreviousValueRaw(r.previousValue),
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
