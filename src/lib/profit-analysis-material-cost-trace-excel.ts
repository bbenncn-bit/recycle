/**
 * 利润分析 — 材料成本 LIFO 跟踪表 Excel 导出（按结算单 → 加工单 → 毛料）
 */

import type ExcelJS from 'exceljs';

export type MaterialCostTraceSaleRow = {
  deliveryNumber: string;
  deliveryDate: string;
  productDisplayName?: string;
  productType?: string;
  warehouse?: string;
  customer: string;
  settlementQuantity: number;
  materialCost: number;
  productionRecords?: Array<{
    id: number;
    productionDate: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    materials?: Array<{
      material: string;
      qty: number;
      price: number;
      cost: number;
    }>;
  }>;
};

type Snapshot = {
  totalQty: number;
  unitCost: number;
  totalCost: number;
  productionDate: string;
  materials: Array<{ material: string; qty: number; price: number; cost: number }>;
};

function parseDeliveryDateForSort(str: string): Date | null {
  const t = str?.trim();
  if (!t) return null;
  const d = new Date(t);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) return d;
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) return new Date(+mdy[3], +mdy[1] - 1, +mdy[2]);
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}

function getMonthKey(deliveryDate: string): string {
  const d = parseDeliveryDateForSort(deliveryDate);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDeliveryDateNoYear(deliveryDate: string): string {
  const d = parseDeliveryDateForSort(deliveryDate);
  if (d) return `${d.getMonth() + 1}/${d.getDate()}`;
  return deliveryDate.trim();
}

function money(n: number): number {
  return Number((n ?? 0).toFixed(4));
}

function money2(n: number): number {
  return Number((n ?? 0).toFixed(2));
}

function colLetter(col: number): string {
  let n = col;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function applyHeaderStyle(sheet: ExcelJS.Worksheet, rowIdx: number, colCount: number) {
  const row = sheet.getRow(rowIdx);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { name: 'Microsoft YaHei', bold: true, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2EFDA' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}

function applyBodyBorder(
  sheet: ExcelJS.Worksheet,
  fromRow: number,
  toRow: number,
  colCount: number
) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.font = { name: 'Microsoft YaHei', size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
  }
}

async function fetchSnapshots(ids: number[]): Promise<Map<number, Snapshot>> {
  const map = new Map<number, Snapshot>();
  if (ids.length === 0) return map;
  const res = await fetch('/api/profit-management/profit-analysis/material-cost-trace-hydrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`补全加工单投料失败 HTTP ${res.status}`);
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: Record<string, Snapshot>;
  };
  if (!json.success || !json.data) {
    throw new Error(json.error || '补全加工单投料失败');
  }
  for (const [k, v] of Object.entries(json.data)) {
    map.set(Number(k), v);
  }
  return map;
}

type MaterialLine = {
  materialName: string;
  materialQty: number | '';
  materialPrice: number | '';
  materialCost: number | '';
};

type ProcessGroup = {
  processId: number | string;
  processDate: string;
  usedQty: number;
  batchUnitCost: number;
  batchCost: number;
  materials: MaterialLine[];
};

type SaleGroup = {
  month: string;
  deliveryNumber: string;
  deliveryDate: string;
  productName: string;
  customer: string;
  settlementQty: number;
  pageMaterialCost: number;
  processes: ProcessGroup[];
};

function mergeVerticalCols(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  cols: number[]
) {
  if (endRow <= startRow) return;
  for (const c of cols) {
    try {
      sheet.mergeCells(startRow, c, endRow, c);
    } catch {
      // 已合并或非法范围时忽略
    }
    const cell = sheet.getCell(startRow, c);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}

function applySaleBlockFill(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  colCount: number,
  alt: boolean
) {
  const fg = alt ? 'FFF3F8F4' : 'FFFFFFFF';
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getRow(r).getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fg },
      };
    }
  }
}

/**
 * 生成材料成本 LIFO 跟踪表并下载
 */
export async function downloadProfitMaterialCostTraceExcel(
  rows: MaterialCostTraceSaleRow[],
  options: {
    filenameBase: string;
    includeMonthColumn: boolean;
    reportTitle: string;
  }
): Promise<void> {
  const sorted = [...rows].sort((a, b) => {
    const da = parseDeliveryDateForSort(a.deliveryDate)?.getTime() ?? 0;
    const db = parseDeliveryDateForSort(b.deliveryDate)?.getTime() ?? 0;
    if (da !== db) return da - db;
    return (a.deliveryNumber || '').localeCompare(b.deliveryNumber || '');
  });

  const needIds = new Set<number>();
  for (const sale of sorted) {
    for (const rec of sale.productionRecords ?? []) {
      const id = Number(rec.id);
      if (!(id > 0)) continue;
      if (!rec.materials || rec.materials.length === 0) needIds.add(id);
    }
  }
  const snapshots = await fetchSnapshots([...needIds]);

  const saleGroups: SaleGroup[] = [];
  const verify: Array<{
    month: string;
    deliveryNumber: string;
    deliveryDate: string;
    productName: string;
    customer: string;
    settlementQty: number;
    pageMaterialCost: number;
    detailMaterialCost: number;
    batchCostSum: number;
    diffVsPage: number;
    processCount: number;
    materialLineCount: number;
  }> = [];

  for (const sale of sorted) {
    const productName =
      (sale.productDisplayName || '').trim() ||
      (sale.warehouse || '').trim() ||
      (sale.productType || '').trim() ||
      '—';
    const month = getMonthKey(sale.deliveryDate);
    const pageCost = sale.materialCost ?? 0;
    const records = sale.productionRecords ?? [];
    let detailMaterialCost = 0;
    let batchCostSum = 0;
    let materialLineCount = 0;
    const processes: ProcessGroup[] = [];

    if (records.length === 0) {
      processes.push({
        processId: '—',
        processDate: '—',
        usedQty: 0,
        batchUnitCost: 0,
        batchCost: 0,
        materials: [
          {
            materialName: '（无 LIFO 加工单明细）',
            materialQty: '',
            materialPrice: '',
            materialCost: '',
          },
        ],
      });
    } else {
      for (const rec of records) {
        batchCostSum += rec.totalCost ?? 0;
        const id = Number(rec.id);
        let materials = rec.materials ?? [];
        if ((!materials || materials.length === 0) && id > 0 && snapshots.has(id)) {
          const snap = snapshots.get(id)!;
          const ratio = snap.totalQty > 0 ? (rec.quantity || 0) / snap.totalQty : 0;
          materials = snap.materials.map((m) => ({
            material: m.material,
            qty: m.qty * ratio,
            price: m.price,
            cost: m.cost * ratio,
          }));
        }

        const materialLines: MaterialLine[] =
          !materials || materials.length === 0
            ? [
                {
                  materialName: '（该加工单无投料明细）',
                  materialQty: '',
                  materialPrice: '',
                  materialCost: '',
                },
              ]
            : materials.map((m) => {
                materialLineCount += 1;
                detailMaterialCost += m.cost ?? 0;
                return {
                  materialName: m.material || '—',
                  materialQty: money(m.qty ?? 0),
                  materialPrice: money2(m.price ?? 0),
                  materialCost: money2(m.cost ?? 0),
                };
              });

        processes.push({
          processId: id || '—',
          processDate: rec.productionDate || '—',
          usedQty: money(rec.quantity ?? 0),
          batchUnitCost: money2(rec.unitCost ?? 0),
          batchCost: money2(rec.totalCost ?? 0),
          materials: materialLines,
        });
      }
    }

    saleGroups.push({
      month,
      deliveryNumber: sale.deliveryNumber,
      deliveryDate: formatDeliveryDateNoYear(sale.deliveryDate),
      productName,
      customer: sale.customer,
      settlementQty: sale.settlementQuantity,
      pageMaterialCost: money2(pageCost),
      processes,
    });

    verify.push({
      month,
      deliveryNumber: sale.deliveryNumber,
      deliveryDate: formatDeliveryDateNoYear(sale.deliveryDate),
      productName,
      customer: sale.customer,
      settlementQty: sale.settlementQuantity,
      pageMaterialCost: money2(pageCost),
      detailMaterialCost: money2(detailMaterialCost),
      batchCostSum: money2(batchCostSum),
      diffVsPage: money2(detailMaterialCost - pageCost),
      processCount: records.length,
      materialLineCount,
    });
  }

  const ExcelJSModule = (await import('exceljs')).default;
  const wb = new ExcelJSModule.Workbook();
  wb.creator = 'pxrecycle';

  // —— 明细跟踪表（发货单合并 → 加工单合并 → 毛料明细）——
  const detailHeaders = options.includeMonthColumn
    ? [
        '月份',
        '发货单号',
        '发货日期',
        '成品名称',
        '客户',
        '结算量(吨)',
        '销售明细材料成本(元)',
        '加工单ID',
        '加工日期',
        '消耗成品吨数',
        '批次单位材料成本(元/吨)',
        '加工单分摊材料成本(元)',
        '毛料名称',
        '毛料吨数(分摊)',
        '毛料单价(元/吨)',
        '毛料成本(元)',
      ]
    : [
        '发货单号',
        '发货日期',
        '成品名称',
        '客户',
        '结算量(吨)',
        '销售明细材料成本(元)',
        '加工单ID',
        '加工日期',
        '消耗成品吨数',
        '批次单位材料成本(元/吨)',
        '加工单分摊材料成本(元)',
        '毛料名称',
        '毛料吨数(分摊)',
        '毛料单价(元/吨)',
        '毛料成本(元)',
      ];

  const wsDetail = wb.addWorksheet('材料成本跟踪明细', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  const detailColCount = detailHeaders.length;
  const hasMonth = options.includeMonthColumn;
  // 结算单层级列（纵向合并）
  const saleCols = hasMonth
    ? [1, 2, 3, 4, 5, 6, 7]
    : [1, 2, 3, 4, 5, 6];
  // 加工单层级列（纵向合并）
  const processCols = hasMonth
    ? [8, 9, 10, 11, 12]
    : [7, 8, 9, 10, 11];

  wsDetail.mergeCells(`A1:${colLetter(detailColCount)}1`);
  wsDetail.getCell('A1').value = options.reportTitle;
  wsDetail.getCell('A1').font = { name: 'Microsoft YaHei', bold: true, size: 14 };
  wsDetail.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  wsDetail.getRow(1).height = 28;

  wsDetail.mergeCells(`A2:${colLetter(detailColCount)}2`);
  wsDetail.getCell('A2').value =
    '结构：发货单号（结算单）纵向合并 → 其下各加工单合并 → 再下列各毛料明细。LIFO：结算单匹配多张加工单；同加工单多种毛料时加工单列合并。同结算单「毛料成本」合计 = 「销售明细材料成本」。';
  wsDetail.getCell('A2').font = { name: 'Microsoft YaHei', size: 9, color: { argb: 'FF555555' } };
  wsDetail.getCell('A2').alignment = { vertical: 'middle', wrapText: true };
  wsDetail.getRow(2).height = 36;

  const detailHeaderRow = 3;
  wsDetail.getRow(detailHeaderRow).values = detailHeaders;
  applyHeaderStyle(wsDetail, detailHeaderRow, detailColCount);

  let rIdx = detailHeaderRow + 1;
  let saleAlt = false;
  for (const sale of saleGroups) {
    const saleStart = rIdx;
    for (const proc of sale.processes) {
      const processStart = rIdx;
      for (let mi = 0; mi < proc.materials.length; mi++) {
        const mat = proc.materials[mi];
        const isFirstOfSale = rIdx === saleStart;
        const isFirstOfProcess = rIdx === processStart;
        const values: (string | number)[] = [];
        if (hasMonth) {
          values.push(isFirstOfSale ? sale.month : '');
        }
        values.push(
          isFirstOfSale ? sale.deliveryNumber : '',
          isFirstOfSale ? sale.deliveryDate : '',
          isFirstOfSale ? sale.productName : '',
          isFirstOfSale ? sale.customer : '',
          isFirstOfSale ? sale.settlementQty : '',
          isFirstOfSale ? sale.pageMaterialCost : '',
          isFirstOfProcess ? proc.processId : '',
          isFirstOfProcess ? proc.processDate : '',
          isFirstOfProcess ? proc.usedQty : '',
          isFirstOfProcess ? proc.batchUnitCost : '',
          isFirstOfProcess ? proc.batchCost : '',
          mat.materialName,
          mat.materialQty,
          mat.materialPrice,
          mat.materialCost
        );
        wsDetail.getRow(rIdx).values = values;
        rIdx += 1;
      }
      mergeVerticalCols(wsDetail, processStart, rIdx - 1, processCols);
    }
    const saleEnd = rIdx - 1;
    mergeVerticalCols(wsDetail, saleStart, saleEnd, saleCols);
    applySaleBlockFill(wsDetail, saleStart, saleEnd, detailColCount, saleAlt);
    saleAlt = !saleAlt;
  }

  if (rIdx - 1 >= detailHeaderRow) {
    applyBodyBorder(wsDetail, detailHeaderRow + 1, rIdx - 1, detailColCount);
  }
  const detailWidths = options.includeMonthColumn
    ? [10, 14, 10, 16, 10, 10, 16, 10, 12, 12, 16, 16, 14, 12, 12, 12]
    : [14, 10, 16, 10, 10, 16, 10, 12, 12, 16, 16, 14, 12, 12, 12];
  detailWidths.forEach((w, i) => {
    wsDetail.getColumn(i + 1).width = w;
  });

  // —— 结算单核对 ——
  const verifyHeaders = options.includeMonthColumn
    ? [
        '月份',
        '发货单号',
        '发货日期',
        '成品名称',
        '客户',
        '结算量(吨)',
        '销售明细材料成本(元)',
        '明细毛料成本合计(元)',
        '加工单分摊成本合计(元)',
        '毛料合计−页面材料成本',
        '加工单数',
        '毛料行数',
      ]
    : [
        '发货单号',
        '发货日期',
        '成品名称',
        '客户',
        '结算量(吨)',
        '销售明细材料成本(元)',
        '明细毛料成本合计(元)',
        '加工单分摊成本合计(元)',
        '毛料合计−页面材料成本',
        '加工单数',
        '毛料行数',
      ];
  const wsVerify = wb.addWorksheet('结算单核对', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });
  const verifyColCount = verifyHeaders.length;
  wsVerify.mergeCells(`A1:${colLetter(verifyColCount)}1`);
  wsVerify.getCell('A1').value = `${options.reportTitle} — 结算单核对`;
  wsVerify.getCell('A1').font = { name: 'Microsoft YaHei', bold: true, size: 13 };
  wsVerify.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  const verifyHeaderRow = 2;
  wsVerify.getRow(verifyHeaderRow).values = verifyHeaders;
  applyHeaderStyle(wsVerify, verifyHeaderRow, verifyColCount);

  let vIdx = verifyHeaderRow + 1;
  for (const v of verify) {
    const core = [
      v.deliveryNumber,
      v.deliveryDate,
      v.productName,
      v.customer,
      v.settlementQty,
      v.pageMaterialCost,
      v.detailMaterialCost,
      v.batchCostSum,
      v.diffVsPage,
      v.processCount,
      v.materialLineCount,
    ];
    wsVerify.getRow(vIdx).values = options.includeMonthColumn ? [v.month, ...core] : core;
    vIdx += 1;
  }
  if (vIdx - 1 >= verifyHeaderRow) {
    applyBodyBorder(wsVerify, verifyHeaderRow + 1, vIdx - 1, verifyColCount);
  }
  const verifyWidths = options.includeMonthColumn
    ? [10, 14, 10, 16, 10, 10, 16, 16, 16, 16, 10, 10]
    : [14, 10, 16, 10, 10, 16, 16, 16, 16, 10, 10];
  verifyWidths.forEach((w, i) => {
    wsVerify.getColumn(i + 1).width = w;
  });

  // —— 口径说明 ——
  const wsNote = wb.addWorksheet('口径说明');
  wsNote.getColumn(1).width = 110;
  const notes = [
    '【材料成本 LIFO 跟踪表口径】',
    '1. 展示结构（三级）：发货单号（结算单）合并为一块 → 其下多张加工单各合并一块 → 再下列出该加工单分摊到的各毛料。',
    '2. 路径：结算单 → LIFO 匹配加工单（ProcessingCostInput）→ 加工单投料毛料（吨×单价）。',
    '3. 加工单分摊材料成本 = 批次单位材料成本 × 本结算消耗成品吨数；批次单位材料成本 = 该加工单投料总成本 ÷ 成品产量。',
    '4. 毛料吨数/毛料成本按「消耗成品吨数 ÷ 加工单产量」比例分摊；毛料单价取加工单录入时的采购/库存单价。',
    '5. 「结算单核对」页：明细毛料成本合计应与销售明细利润分析中的材料成本(元)一致（允许四舍五入差异）。',
    '6. 相邻结算单用浅色底纹交替，便于扫读。',
  ];
  notes.forEach((line, i) => {
    const cell = wsNote.getCell(i + 1, 1);
    cell.value = line;
    cell.font = { name: 'Microsoft YaHei', size: 10 };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.filenameBase}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
