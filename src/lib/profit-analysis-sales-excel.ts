/**
 * 利润分析 — 销售明细 Excel 导出（客户端，样式对齐成本分析导出）
 */

import type ExcelJS from 'exceljs';

export type ProfitSalesDetailExcelRow = {
  deliveryNumber: string;
  deliveryDate: string;
  productType: string;
  productDisplayName: string;
  warehouse: string;
  customer: string;
  netWeight: number;
  settlementQuantity: number;
  transitLoss: number;
  revenue: number;
  materialCost: number;
  processingCost: number;
  otherCosts: number;
  /** 其它成本分解 */
  transportCost: number;
  taxCost: number;
  discountCost: number;
  interestCost: number;
  otherIncome: number;
  /** 其它收入分解 */
  immediateRefund: number;
  governmentSupport: number;
  profit: number;
  profitPerNetTon: number;
};

const FORMULA_NOTES: string[] = [
  '【公式说明】（与页面中带蓝色ℹ️的列及吨钢毛利口径一致）',
  '· 发货日期：导出为月/日（不含年份）；完整日期见源数据。',
  '· 净重(吨)：DeliverySettlement.net_weight。',
  '· 磅差(吨)：DeliverySettlement.transitloss 参与后台材料核算量；当前导出表不单独列出该列。',
  '· 材料成本(元)：按材料核算量做 LIFO，匹配投产记录与材料单价后汇总。',
  '· 其它成本项(元) = 运输费 + 税费 + 贴现费用 + 回款周期资金利息；口径见 ProfitParamConfig。',
  '· 运输费 / 税费 / 贴现费用 / 回款周期资金利息：为其它成本项的分解细项（贴现费用仅萍钢）。',
  '· 其它收入项(元) = 即征即退 + 政府扶持资金。',
  '· 即征即退 / 政府扶持资金：为其它收入项的分解细项。',
  '· 利润(元)：销售收入÷1.13（不含税）− 材料成本 − 加工成本 − 其它成本项 + 其它收入项。',
  '· 吨钢毛利(元/吨)：利润(元) ÷ 净重(吨)；净重为 0 时导出为「—」。',
];

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

function compareDeliveryDate(a: string, b: string): number {
  const da = parseDeliveryDateForSort(a);
  const db = parseDeliveryDateForSort(b);
  if (da && db) return da.getTime() - db.getTime();
  if (da) return -1;
  if (db) return 1;
  return a.localeCompare(b);
}

function getMonthKeyFromDeliveryDate(deliveryDate: string): string {
  const d = parseDeliveryDateForSort(deliveryDate);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDeliveryDateNoYearExcel(deliveryDate: string): string {
  const d = parseDeliveryDateForSort(deliveryDate);
  if (d) return `${d.getMonth() + 1}/${d.getDate()}`;
  return deliveryDate.trim();
}

function fmtProfitPerTon(v: number, netWeight: number): string {
  if (!(netWeight > 0)) return '—';
  return v.toFixed(2);
}

/** 1-based 列号 → Excel 列字母（支持 >26） */
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

function applyTableBorderAndHeader(
  sheet: ExcelJS.Worksheet,
  fromRow: number,
  toRow: number,
  fromCol: number,
  toCol: number
) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = fromCol; c <= toCol; c++) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (r === fromRow) {
        cell.font = { name: 'Microsoft YaHei', bold: true, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      } else {
        cell.font = { name: 'Microsoft YaHei', size: 10 };
      }
    }
  }
}

function money(n: number | undefined | null): number {
  return Number((n ?? 0).toFixed(2));
}

/**
 * 生成工作簿并触发浏览器下载
 */
export async function downloadProfitSalesDetailsExcel(
  rows: ProfitSalesDetailExcelRow[],
  options: {
    filenameBase: string;
    includeMonthColumn: boolean;
    /** 表头标题，如「2026年5月销售利润分析详表」 */
    reportTitle: string;
  }
): Promise<void> {
  const ExcelJSModule = (await import('exceljs')).default;
  const wb = new ExcelJSModule.Workbook();
  wb.creator = 'pxrecycle';
  const ws = wb.addWorksheet('销售明细利润');

  const headers = options.includeMonthColumn
    ? [
        '月份',
        '发货单号',
        '发货日期',
        '成品名称',
        '发往客户',
        '净重(吨)',
        '结算量(吨)',
        '销售收入-含税(元)',
        '材料成本(元)',
        '加工成本(元)',
        '其它成本项(元)',
        '运输费(元)',
        '税费(元)',
        '贴现费用(元)',
        '回款周期资金利息(元)',
        '其它收入项(元)',
        '即征即退(元)',
        '政府扶持资金(元)',
        '利润(元)',
        '吨钢毛利(元/吨)',
      ]
    : [
        '发货单号',
        '发货日期',
        '成品名称',
        '发往客户',
        '净重(吨)',
        '结算量(吨)',
        '销售收入-含税(元)',
        '材料成本(元)',
        '加工成本(元)',
        '其它成本项(元)',
        '运输费(元)',
        '税费(元)',
        '贴现费用(元)',
        '回款周期资金利息(元)',
        '其它收入项(元)',
        '即征即退(元)',
        '政府扶持资金(元)',
        '利润(元)',
        '吨钢毛利(元/吨)',
      ];

  const colCount = headers.length;
  const lastColLetter = colLetter(colCount);

  ws.mergeCells(`A1:${lastColLetter}1`);
  ws.getCell('A1').value = options.reportTitle;
  ws.getCell('A1').font = { name: 'Microsoft YaHei', bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  const headerRowIdx = 3;
  ws.getRow(headerRowIdx).values = headers;

  const sortedRows = [...rows].sort((a, b) => {
    const byDate = compareDeliveryDate(a.deliveryDate, b.deliveryDate);
    if (byDate !== 0) return byDate;
    return (a.deliveryNumber || '').localeCompare(b.deliveryNumber || '');
  });

  let dataRowIdx = headerRowIdx + 1;
  for (const sale of sortedRows) {
    const name =
      (sale.productDisplayName || '').trim() ||
      (sale.warehouse || '').trim() ||
      sale.productType;
    const month = getMonthKeyFromDeliveryDate(sale.deliveryDate);
    const ppn = fmtProfitPerTon(sale.profitPerNetTon ?? 0, sale.netWeight ?? 0);

    const core = [
      sale.deliveryNumber,
      formatDeliveryDateNoYearExcel(sale.deliveryDate),
      name,
      sale.customer,
      Number((sale.netWeight ?? 0).toFixed(2)),
      Number(sale.settlementQuantity.toFixed(2)),
      money(sale.revenue),
      money(sale.materialCost),
      money(sale.processingCost),
      money(sale.otherCosts),
      money(sale.transportCost),
      money(sale.taxCost),
      money(sale.discountCost),
      money(sale.interestCost),
      money(sale.otherIncome),
      money(sale.immediateRefund),
      money(sale.governmentSupport),
      money(sale.profit),
      ppn,
    ];

    if (options.includeMonthColumn) {
      ws.getRow(dataRowIdx).values = [month, ...core];
    } else {
      ws.getRow(dataRowIdx).values = core;
    }
    dataRowIdx += 1;
  }

  const lastDataRow = dataRowIdx - 1;
  if (lastDataRow >= headerRowIdx) {
    applyTableBorderAndHeader(ws, headerRowIdx, lastDataRow, 1, colCount);
  }

  ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];

  const colWidths = options.includeMonthColumn
    ? [10, 14, 10, 18, 10, 10, 10, 14, 12, 12, 12, 12, 12, 12, 16, 12, 12, 14, 12, 14]
    : [14, 10, 18, 10, 10, 10, 14, 12, 12, 12, 12, 12, 12, 16, 12, 12, 14, 12, 14];
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let noteRowIdx = lastDataRow + 2;
  for (const line of FORMULA_NOTES) {
    ws.mergeCells(noteRowIdx, 1, noteRowIdx, colCount);
    const cell = ws.getCell(noteRowIdx, 1);
    cell.value = line;
    cell.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF333333' } };
    cell.alignment = { vertical: 'top', wrapText: true, horizontal: 'left' };
    noteRowIdx += 1;
  }

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
