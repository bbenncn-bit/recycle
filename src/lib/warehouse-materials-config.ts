/**
 * 库区—毛料—别名（与小程序 warehouseMaterials.js / MaterialStorage 一致；数据库无数据时兜底）
 */
export const WAREHOUSE_LIST = [
  'M散料库',
  'M脚手架',
  'M车壳库',
  'M钢筋库',
  '毛料库',
  '毛料库区一',
] as const;

export type WarehouseMaterialItem = {
  name: string;
  shortName: string;
};

export const WAREHOUSE_MATERIALS: Record<string, WarehouseMaterialItem[]> = {
  M散料库: [
    { name: '中型毛料M4', shortName: 'MSLKM4' },
    { name: '小型毛料M2', shortName: 'MSLKM2' },
    { name: '统料M', shortName: 'MSLKM' },
    { name: '轻薄毛料M0', shortName: 'MSLKM0' },
    { name: '重型毛料M6', shortName: 'MSLKM6' },
  ],
  M脚手架: [
    { name: '中型毛料M4', shortName: 'MJSJM4' },
    { name: '小型毛料M2', shortName: 'MJSJM2' },
  ],
  M车壳库: [
    { name: '统料M', shortName: 'MCKKM' },
    { name: '轻薄毛料M0', shortName: 'MCKKM0' },
  ],
  M钢筋库: [
    { name: '轻薄毛料M0', shortName: 'MGJKM0' },
    { name: '重型毛料M10', shortName: 'MGJKM10' },
  ],
  毛料库: [
    { name: '小型毛料M2', shortName: 'MLKM2' },
    { name: '统料M', shortName: 'MLKM' },
  ],
  毛料库区一: [
    { name: '小型毛料M2', shortName: 'MLKQ1M2' },
    { name: '轻薄毛料M0', shortName: 'MLKQ1M0' },
    { name: '重型毛料M6', shortName: 'MLKQ1M6' },
  ],
};

export function buildStaticWarehouseMaterials(): Record<
  string,
  Array<{ name: string; shortName: string; currentPrice: number; stockQty: number }>
> {
  const out: Record<
    string,
    Array<{ name: string; shortName: string; currentPrice: number; stockQty: number }>
  > = {};
  for (const wh of WAREHOUSE_LIST) {
    out[wh] = (WAREHOUSE_MATERIALS[wh] || []).map((m) => ({
      name: m.name,
      shortName: m.shortName,
      currentPrice: 0,
      stockQty: 0,
    }));
  }
  return out;
}
