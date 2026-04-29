/**
 * 采购入库单行定位到 MaterialStorage.storage_area 时，须与 Excel、滚存、云同步一致：
 * 优先库区 warehouse_area，空则回退仓库 warehouse（ERP 常把两者填成一致，或仅填仓库）。
 */
export function purchaseInboundStorageArea(row: {
  warehouse?: string | null;
  warehouseArea?: string | null;
}): string {
  const a = (row.warehouseArea ?? '').toString().trim();
  const w = (row.warehouse ?? '').toString().trim();
  return a || w;
}
