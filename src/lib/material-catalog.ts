/**
 * 2026-04-01 起：以下毛料别名仅消化 MaterialStorage 库存，不再新采购（PurchaseWarehouse 不应再出现对应库区+物料）。
 * 与 MaterialStorage.alias_name 一致。
 */
export const MATERIAL_DISPOSE_ONLY_ALIASES = [
  'MLKM2',
  'MLKM',
  'MLKQ1M2',
  'MLKQ1M0',
  'MLKQ1M6',
] as const;

export function isMaterialDisposeOnlyAlias(alias: string | null | undefined): boolean {
  const a = (alias || '').trim();
  return (MATERIAL_DISPOSE_ONLY_ALIASES as readonly string[]).includes(a);
}
