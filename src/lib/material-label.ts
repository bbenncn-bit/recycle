/**
 * 料型名称规范化：对齐不同入库单、不同月份间 material 字段的细微差异（全角/半角、空白等），
 * 便于「当月 vs 上月」均价按同一毛料类型对比。
 */
export function normalizeMaterialCategoryLabel(
  material: string | null | undefined
): string {
  if (material == null) return '未知类型';
  const trimmed = String(material).trim();
  if (!trimmed) return '未知类型';
  return trimmed
    .normalize('NFKC')
    .replace(/[\u3000\u00a0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
