/**
 * 成本分析：基地收货 / 基地买货 收货单口径（PurchaseWarehouse.receipt_no + warehouse）
 * - 基地收货：SH 开头，且仓库不为下列三库
 * - 基地买货：TH 开头，或 SH 开头且仓库为下列三库
 *
 * 说明：下列三库在「成本」图上仍归基地买货；但现场有真实在库，
 * 「中心基地库存」口径（滚存 / 库存价值分析）应计入，见 isCentralBaseStockReceipt。
 */

export const WAREHOUSES_MOVED_FROM_BASE_SELF_TO_BASE_PURCHASE = [
  '优质毛料库',
  'M钢渣粒子',
  'MP废钢库',
] as const;

const EXCLUDED = new Set<string>(
  WAREHOUSES_MOVED_FROM_BASE_SELF_TO_BASE_PURCHASE.map((s) => s.trim())
);

export function normalizeWarehouseName(warehouse: string | null | undefined): string {
  return (warehouse || '').trim();
}

/** 基地收货（成本口径）：SH 且仓库不在剔除列表 */
export function isBaseSelfReceipt(
  receiptNo: string | null | undefined,
  warehouse: string | null | undefined
): boolean {
  const rn = (receiptNo || '').trim().toUpperCase();
  if (!rn.startsWith('SH')) return false;
  const w = normalizeWarehouseName(warehouse);
  if (EXCLUDED.has(w)) return false;
  return true;
}

/** 基地买货（成本口径）：TH，或 SH 且仓库在剔除列表 */
export function isBasePurchaseReceipt(
  receiptNo: string | null | undefined,
  warehouse: string | null | undefined
): boolean {
  const rn = (receiptNo || '').trim().toUpperCase();
  const w = normalizeWarehouseName(warehouse);
  if (rn.startsWith('TH')) return true;
  if (rn.startsWith('SH') && EXCLUDED.has(w)) return true;
  return false;
}

/**
 * 中心基地实物库存入库：凡 SH 均计入（含优质毛料库 / M钢渣粒子 / MP废钢库）；
 * 仅剔除 TH 贸易直送。用于库存滚存与毛料库存价值分析。
 */
export function isCentralBaseStockReceipt(
  receiptNo: string | null | undefined,
  _warehouse?: string | null | undefined
): boolean {
  const rn = (receiptNo || '').trim().toUpperCase();
  return rn.startsWith('SH');
}

export function classifyCostReceipt(
  receiptNo: string | null | undefined,
  warehouse: string | null | undefined
): 'baseSelf' | 'basePurchase' | 'collaboration' {
  if (isBaseSelfReceipt(receiptNo, warehouse)) return 'baseSelf';
  if (isBasePurchaseReceipt(receiptNo, warehouse)) return 'basePurchase';
  return 'collaboration';
}
