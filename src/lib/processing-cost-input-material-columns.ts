/**
 * 加工表 ProcessingCostInput 毛料数量列：2026-04 起与 MaterialStorage.alias_name 一致（前缀 + _qty / _price）。
 * 与云函数 mysql MATERIAL_ALIAS_COLUMN_PREFIXES、删除回滚逻辑保持一致。
 */
/** Prisma 字段名（camelCase）与 alias 前缀对应，用于写入 ProcessingCostInput */
export const MATERIAL_ALIAS_PRISMA_FIELDS: Record<
  string,
  { qty: string; price: string }
> = {
  MSLKM4: { qty: 'mslkm4Qty', price: 'mslkm4Price' },
  MSLKM2: { qty: 'mslkm2Qty', price: 'mslkm2Price' },
  MSLKM: { qty: 'mslkmQty', price: 'mslkmPrice' },
  MSLKM0: { qty: 'mslkm0Qty', price: 'mslkm0Price' },
  MSLKM6: { qty: 'mslkm6Qty', price: 'mslkm6Price' },
  MJSJM4: { qty: 'mjsjm4Qty', price: 'mjsjm4Price' },
  MJSJM2: { qty: 'mjsjm2Qty', price: 'mjsjm2Price' },
  MCKKM: { qty: 'mckkmQty', price: 'mckkmPrice' },
  MCKKM0: { qty: 'mckkm0Qty', price: 'mckkm0Price' },
  MGJKM0: { qty: 'mgjkm0Qty', price: 'mgjkm0Price' },
  MGJKM10: { qty: 'mgjkm10Qty', price: 'mgjkm10Price' },
  MLKM2: { qty: 'mlkm2Qty', price: 'mlkm2Price' },
  MLKM: { qty: 'mlkmQty', price: 'mlkmPrice' },
  MLKQ1M2: { qty: 'mlkq1m2Qty', price: 'mlkq1m2Price' },
  MLKQ1M0: { qty: 'mlkq1m0Qty', price: 'mlkq1m0Price' },
  MLKQ1M6: { qty: 'mlkq1m6Qty', price: 'mlkq1m6Price' },
  FL1: { qty: 'fl1Qty', price: 'fl1Price' },
};

export const MATERIAL_ALIAS_PREFIXES = [
  'MSLKM4',
  'MSLKM2',
  'MSLKM',
  'MSLKM0',
  'MSLKM6',
  'MJSJM4',
  'MJSJM2',
  'MCKKM',
  'MCKKM0',
  'MGJKM0',
  'MGJKM10',
  'MLKM2',
  'MLKM',
  'MLKQ1M2',
  'MLKQ1M0',
  'MLKQ1M6',
  'FL1',
] as const;

/** 与库存 alias 对应的展示名（利润/LIFO 材料构成） */
export const ALIAS_PREFIX_LABEL: Record<string, string> = {
  MSLKM4: 'M散料库M4',
  MSLKM2: 'M散料库M2',
  MSLKM: 'M散料库统料M',
  MSLKM0: 'M散料库M0',
  MSLKM6: 'M散料库M6',
  MJSJM4: 'M脚手架M4',
  MJSJM2: 'M脚手架M2',
  MCKKM: 'M车壳库统料M',
  MCKKM0: 'M车壳库M0',
  MGJKM0: 'M钢筋库M0',
  MGJKM10: 'M钢筋库M10',
  MLKM2: '毛料库M2',
  MLKM: '毛料库统料M',
  MLKQ1M2: '毛料库区一M2',
  MLKQ1M0: '毛料库区一M0',
  MLKQ1M6: '毛料库区一M6',
  FL1: '辅料1',
};

/**
 * 旧库仍可能存在的 M 列（老口径）；新库仅有 alias 列 + material_composition。
 */
export const LEGACY_MATERIAL_QTY_LABELS: Record<string, string> = {
  M1_qty: '优质毛料M1',
  M2_qty: '重型折旧毛料M2',
  M3_qty: '重型加工毛料M3',
  M4_qty: '中型折旧毛料M4',
  M5_qty: 'M5',
  M6_qty: '小型折旧毛料M6',
  M7_qty: '小型加工毛料M7',
  M8_qty: '轻薄折旧毛料M8',
  M9_qty: '轻薄加工毛料M9',
  wireRope_qty: '钢丝绳',
  carShell_qty: '汽车小轿壳',
  pigIron_qty: '生铁毛料',
  scrap_qty: '渣钢',
  carDismantle_qty: '汽拆',
  transfer_qty: '移库',
  auxiliary_qty: '辅料',
  material1_qty: 'material1',
  material2_qty: 'material2',
  material3_qty: 'material3',
  material4_qty: 'material4',
  material5_qty: 'material5',
};

let cachedQtyFieldLabels: Record<string, string> | null = null;

/** LIFO / 材料成本：qty 列名 -> 展示材料名 */
export function normalizeMaterialAlias(value: string | null | undefined): string {
  return (value || '').toString().trim().toUpperCase();
}

export function getColumnPrefixByMaterial(item: {
  material: string;
  shortName?: string;
}): string | null {
  const alias = normalizeMaterialAlias(item.shortName);
  if (alias && MATERIAL_ALIAS_PREFIXES.includes(alias as (typeof MATERIAL_ALIAS_PREFIXES)[number])) {
    return alias;
  }
  const materialName = (item.material || '').trim();
  if (materialName === '辅料1' || materialName === 'FL1') return 'FL1';
  return null;
}

export function getProcessingCostMaterialQtyFieldLabels(): Record<string, string> {
  if (cachedQtyFieldLabels) return cachedQtyFieldLabels;
  const out: Record<string, string> = { ...LEGACY_MATERIAL_QTY_LABELS };
  for (const p of MATERIAL_ALIAS_PREFIXES) {
    out[`${p}_qty`] = ALIAS_PREFIX_LABEL[p] ?? p;
  }
  cachedQtyFieldLabels = out;
  return out;
}
