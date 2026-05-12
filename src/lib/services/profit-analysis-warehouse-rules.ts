/**
 * 利润分析：DeliverySettlement.warehouse（成品库区/品种编码）→ 发往客户；
 * 散料（汽拆）/压块（汽拆）等暂不纳入本模块。
 */

function trimText(s: string | null | undefined): string {
  return (s ?? '').trim();
}

/** 是否暂不纳入利润分析（汽拆类） */
export function isExcludedFromProfitAnalysis(
  warehouse: string | null | undefined,
  productType: string | null | undefined,
): boolean {
  const w = trimText(warehouse);
  const p = trimText(productType);
  const blob = `${w}\n${p}`;
  const upper = blob.toUpperCase();

  if (upper.includes('QCSL') || upper.includes('QCYK')) return true;

  const qcPatterns = ['散料（汽拆）', '散料(汽拆)', '压块（汽拆）', '压块(汽拆)'];
  for (const q of qcPatterns) {
    if (blob.includes(q)) return true;
  }
  return false;
}

/**
 * 发往客户：优先根据 warehouse 识别，其次 product_type。
 * 规则：JG→吉钢，PG 系列→萍钢，XG→新钢。
 */
export function deriveProfitAnalysisCustomer(
  warehouse: string | null | undefined,
  productType: string | null | undefined,
): string {
  const fromWh = deriveCustomerFromSingleField(trimText(warehouse));
  if (fromWh) return fromWh;
  return deriveCustomerFromSingleField(trimText(productType));
}

function deriveCustomerFromSingleField(t: string): string {
  if (!t) return '';
  const U = t.toUpperCase();

  // 吉钢（JG = 吉钢拼音首字母）
  if (U.includes('JGSL') || t.includes('JG散料')) return '吉钢';

  // 新钢（需在萍钢 PG 代码匹配之前排除 XGPF 误判）
  if (U.includes('XGPF') || t.includes('XG普废')) return '新钢';

  // 萍钢 — 编码（与小程序/库区简称一致）
  const pgCodes = ['PGSL', 'PGGJYK', 'PGJSJYK', 'PGYK12', 'PGYK34'];
  if (pgCodes.some((c) => U.includes(c))) return '萍钢';
  if (
    t.includes('PG散料') ||
    t.includes('PG钢筋压块') ||
    t.includes('PG脚手架压块') ||
    /PG压块\s*[（(]\s*12\s*类\s*[）)]/.test(t) ||
    /PG压块\s*[（(]\s*34\s*类\s*[）)]/.test(t)
  ) {
    return '萍钢';
  }

  return '';
}
