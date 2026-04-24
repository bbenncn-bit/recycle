import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate } from '@/lib/services/profit-service';
import { isBaseSelfReceipt } from '@/lib/cost-receipt-classification';
import { parseProductionDate } from '@/lib/services/lifo-material-cost-service';
import {
  getClosingStateThroughDate,
  getOpeningStateFirstDayOfMonth,
  MATERIAL_INVENTORY_ROLL_START,
} from '@/lib/services/material-storage-inventory-service';
import { extractCompositionFromProcessingRow } from '@/lib/services/processing-order-delete-service';

function normalizeDateBoundary(dateStr: string, endOfDay: boolean): Date | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function parseInboundTime(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    return parseFloat(String((v as { toString(): string }).toString())) || 0;
  }
  return 0;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
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

async function buildSummaryWorkbook(startDate: Date, endDate: Date, startDateStr: string, endDateStr: string) {
  const rows = await prisma.purchaseWarehouse.findMany({
    select: {
      receiptNo: true,
      warehouse: true,
      warehouseDate: true,
      inboundTime: true,
      warehouseArea: true,
      material: true,
      estimatedDryBasis: true,
      deduction: true,
      unitPriceExcludingTax: true,
      totalPriceExcludingTax: true,
    },
    where: {
      receiptNo: { startsWith: 'SH' },
      OR: [{ warehouseDate: { not: null } }, { inboundTime: { not: null } }],
    },
  });

  const dayStart = new Date(endDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(endDate);
  dayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1, 0, 0, 0, 0);

  type Agg = {
    area: string;
    material: string;
    dayDeduction: number;
    dayQty: number;
    dayAmount: number;
    monthDeduction: number;
    monthQty: number;
    monthAmount: number;
  };
  const grouped = new Map<string, Agg>();

  for (const row of rows) {
    if (!isBaseSelfReceipt(row.receiptNo, row.warehouse)) continue;
    const d = parseWarehouseDate(row.warehouseDate) || parseInboundTime(row.inboundTime);
    if (!d) continue;
    if (d < monthStart || d > dayEnd) continue;

    const area = (row.warehouseArea || '未分区').trim() || '未分区';
    const material = (row.material || '未分类').trim() || '未分类';
    const qty = toNum(row.estimatedDryBasis);
    const deduction = toNum(row.deduction);
    const amount = toNum(row.totalPriceExcludingTax) || toNum(row.unitPriceExcludingTax) * qty;
    const key = `${area}__${material}`;
    const cur = grouped.get(key) || {
      area,
      material,
      dayDeduction: 0,
      dayQty: 0,
      dayAmount: 0,
      monthDeduction: 0,
      monthQty: 0,
      monthAmount: 0,
    };

    cur.monthDeduction += deduction;
    cur.monthQty += qty;
    cur.monthAmount += amount;
    if (d >= dayStart && d <= dayEnd) {
      cur.dayDeduction += deduction;
      cur.dayQty += qty;
      cur.dayAmount += amount;
    }
    grouped.set(key, cur);
  }

  const list = Array.from(grouped.values()).sort((a, b) => b.monthAmount - a.monthAmount);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('毛料采购结算汇总');
  sheet.columns = [
    { header: '库区', key: 'c1', width: 14 },
    { header: '系统物料', key: 'c2', width: 14 },
    { header: '品名', key: 'c3', width: 14 },
    { header: '扣杂', key: 'c4', width: 10 },
    { header: '结算吨位', key: 'c5', width: 12 },
    { header: '结算金额', key: 'c6', width: 14 },
    { header: '采购均价', key: 'c7', width: 12 },
    { header: '扣杂率', key: 'c8', width: 10 },
    { header: '扣杂', key: 'c9', width: 10 },
    { header: '结算吨位', key: 'c10', width: 12 },
    { header: '结算金额', key: 'c11', width: 14 },
    { header: '采购均价', key: 'c12', width: 12 },
    { header: '扣杂率', key: 'c13', width: 10 },
    { header: '占比', key: 'c14', width: 10 },
  ];

  sheet.mergeCells('A1:N1');
  sheet.getCell('A1').value = `2026年毛料采购结算汇总总表（带票不含税价）`;
  sheet.getCell('A1').font = { name: 'Microsoft YaHei', bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `${endDateStr} 当日`;
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A2').font = { name: 'Microsoft YaHei', bold: true, size: 10 };
  sheet.mergeCells('I2:N2');
  sheet.getCell('I2').value = `本月累计（${formatYmd(monthStart)} ~ ${endDateStr}）`;
  sheet.getCell('I2').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('I2').font = { name: 'Microsoft YaHei', bold: true, size: 10 };

  const headerRowIdx = 3;
  sheet.getRow(headerRowIdx).values = [
    '库区',
    '系统物料',
    '品名',
    '扣杂',
    '结算吨位',
    '结算金额',
    '采购均价',
    '扣杂率',
    '扣杂',
    '结算吨位',
    '结算金额',
    '采购均价',
    '扣杂率',
    '占比',
  ];

  let dayDeductionTotal = 0;
  let dayQtyTotal = 0;
  let dayAmountTotal = 0;
  let monthDeductionTotal = 0;
  let monthQtyTotal = 0;
  let monthAmountTotal = 0;
  const dayRateList: number[] = [];
  const monthRateList: number[] = [];

  list.forEach((r) => {
    dayDeductionTotal += r.dayDeduction;
    dayQtyTotal += r.dayQty;
    dayAmountTotal += r.dayAmount;
    monthDeductionTotal += r.monthDeduction;
    monthQtyTotal += r.monthQty;
    monthAmountTotal += r.monthAmount;
    dayRateList.push(r.dayQty > 0 ? (r.dayDeduction / r.dayQty) * 100 : 0);
    monthRateList.push(r.monthQty > 0 ? (r.monthDeduction / r.monthQty) * 100 : 0);
  });

  const monthAmountWanTotal = monthAmountTotal / 10000;
  let rowIdx = headerRowIdx + 1;
  for (const r of list) {
    const dayAvgPrice = r.dayQty > 0 ? r.dayAmount / r.dayQty : 0;
    const monthAvgPrice = r.monthQty > 0 ? r.monthAmount / r.monthQty : 0;
    const dayRate = r.dayQty > 0 ? (r.dayDeduction / r.dayQty) * 100 : 0;
    const monthRate = r.monthQty > 0 ? (r.monthDeduction / r.monthQty) * 100 : 0;
    const monthShare = monthAmountWanTotal > 0 ? (r.monthAmount / 10000 / monthAmountWanTotal) * 100 : 0;
    sheet.getRow(rowIdx).values = [
      r.area,
      r.material,
      r.material,
      Number(r.dayDeduction.toFixed(3)),
      Number(r.dayQty.toFixed(3)),
      Number(r.dayAmount.toFixed(2)),
      Number(dayAvgPrice.toFixed(2)),
      `${dayRate.toFixed(2)}%`,
      Number(r.monthDeduction.toFixed(3)),
      Number(r.monthQty.toFixed(3)),
      Number(r.monthAmount.toFixed(2)),
      Number(monthAvgPrice.toFixed(2)),
      `${monthRate.toFixed(2)}%`,
      `${monthShare.toFixed(2)}%`,
    ];
    rowIdx++;
  }

  const totalDayAvg = dayQtyTotal > 0 ? dayAmountTotal / dayQtyTotal : 0;
  const totalMonthAvg = monthQtyTotal > 0 ? monthAmountTotal / monthQtyTotal : 0;
  const avgDayRate = dayRateList.length > 0 ? dayRateList.reduce((a, b) => a + b, 0) / dayRateList.length : 0;
  const avgMonthRate = monthRateList.length > 0 ? monthRateList.reduce((a, b) => a + b, 0) / monthRateList.length : 0;
  sheet.getRow(rowIdx).values = [
    '合计',
    '',
    '',
    Number(dayDeductionTotal.toFixed(3)),
    Number(dayQtyTotal.toFixed(3)),
    Number(dayAmountTotal.toFixed(2)),
    Number(totalDayAvg.toFixed(2)),
    `${avgDayRate.toFixed(2)}%`,
    Number(monthDeductionTotal.toFixed(3)),
    Number(monthQtyTotal.toFixed(3)),
    Number(monthAmountTotal.toFixed(2)),
    Number(totalMonthAvg.toFixed(2)),
    `${avgMonthRate.toFixed(2)}%`,
    '100.00%',
  ];
  sheet.getRow(rowIdx).font = { name: 'Microsoft YaHei', bold: true, size: 10 };

  applyTableBorderAndHeader(sheet, headerRowIdx, rowIdx, 1, 14);
  // 分组标题与表头同框
  applyTableBorderAndHeader(sheet, 2, 2, 1, 8);
  applyTableBorderAndHeader(sheet, 2, 2, 9, 14);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const filename = `毛料采购汇总_${startDateStr}_至_${endDateStr}.xlsx`;
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

async function buildInventoryWorkbook(startDate: Date, endDate: Date, startDateStr: string, endDateStr: string) {
  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(endDate);
  endDay.setHours(23, 59, 59, 999);
  const dayBeforeStart = new Date(startDay);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);

  // 毛料：期初/入库/加工领取/期末（按 库区+毛料）
  let openingRows = await getOpeningStateFirstDayOfMonth(startDay.getFullYear(), startDay.getMonth() + 1);
  if (dayBeforeStart.getTime() >= MATERIAL_INVENTORY_ROLL_START.getTime()) {
    openingRows = await getClosingStateThroughDate(formatYmd(dayBeforeStart));
  }
  const closingRows = await getClosingStateThroughDate(formatYmd(endDay));
  const openingMap = new Map(openingRows.map((r) => [`${r.storageArea}\0${r.materialType}`, r]));
  const closingMap = new Map(closingRows.map((r) => [`${r.storageArea}\0${r.materialType}`, r]));

  const inMap = new Map<string, number>();
  const purchases = await prisma.purchaseWarehouse.findMany({
    where: {
      warehouseDate: { not: null, gte: formatYmd(startDay), lte: formatYmd(endDay) },
    },
    select: {
      receiptNo: true,
      warehouse: true,
      warehouseArea: true,
      material: true,
      warehouseDate: true,
      status: true,
      estimatedDryBasis: true,
    },
  });
  for (const p of purchases) {
    if (!isBaseSelfReceipt(p.receiptNo, p.warehouse)) continue;
    if ((p.status || '').includes('红冲') || (p.status || '').includes('撤销')) continue;
    const d = parseWarehouseDate(p.warehouseDate);
    if (!d || d < startDay || d > endDay) continue;
    const key = `${(p.warehouseArea || '').trim()}\0${(p.material || '').trim()}`;
    inMap.set(key, (inMap.get(key) || 0) + toNum(p.estimatedDryBasis));
  }

  const consumeMap = new Map<string, number>();
  const processingRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    'SELECT * FROM `ProcessingCostInput` WHERE production_date IS NOT NULL'
  );
  for (const r of processingRows) {
    const d = parseProductionDate((r.production_date as string | null) || null);
    if (!d || d < startDay || d > endDay) continue;
    for (const item of extractCompositionFromProcessingRow(r)) {
      const wh = (item.warehouse || '').toString().trim();
      const mat = (item.material || '').toString().trim();
      const tons = toNum(item.tons);
      if (!wh || !mat || tons <= 0) continue;
      const key = `${wh}\0${mat}`;
      consumeMap.set(key, (consumeMap.get(key) || 0) + tons);
    }
  }

  type MaterialLedgerRow = {
    area: string;
    material: string;
    opening: number;
    inbound: number;
    consume: number;
    closing: number;
  };
  const materialKeys = new Set<string>([
    ...openingMap.keys(),
    ...closingMap.keys(),
    ...inMap.keys(),
    ...consumeMap.keys(),
  ]);
  const materialRows: MaterialLedgerRow[] = Array.from(materialKeys).map((k) => {
    const [area, material] = k.split('\0');
    return {
      area,
      material,
      opening: toNum(openingMap.get(k)?.qty),
      inbound: toNum(inMap.get(k)),
      consume: toNum(consumeMap.get(k)),
      closing: toNum(closingMap.get(k)?.qty),
    };
  });
  materialRows.sort((a, b) => a.area.localeCompare(b.area) || a.material.localeCompare(b.material));

  // 成品：期初库存/加工量/销售出库/期末库存（按 成品+仓库）
  const currentStocks = await prisma.productStock.findMany({
    select: { productName: true, warehouseCode: true, stockQty: true },
  });
  const currentMap = new Map<string, number>();
  const stockRows = currentStocks
    .map((r) => ({
      product: (r.productName || '').trim(),
      warehouse: (r.warehouseCode || '').trim(),
      stockQty: toNum(r.stockQty),
    }))
    .filter((r) => r.product && r.warehouse);
  const productToKeys = new Map<string, string[]>();
  currentStocks.forEach((r) => {
    const key = `${(r.productName || '').trim()}\0${(r.warehouseCode || '').trim()}`;
    currentMap.set(key, toNum(r.stockQty));
    const p = (r.productName || '').trim();
    if (p) {
      if (!productToKeys.has(p)) productToKeys.set(p, []);
      productToKeys.get(p)!.push(key);
    }
  });

  const resolveStockKey = (productNameRaw: string | null | undefined, warehouseRaw: string | null | undefined): string | null => {
    const product = (productNameRaw || '').trim();
    const warehouse = (warehouseRaw || '').trim();
    if (!product) return null;
    const exact = `${product}\0${warehouse}`;
    if (warehouse && currentMap.has(exact)) return exact;
    const keys = productToKeys.get(product) || [];
    if (keys.length === 1) return keys[0];
    return null;
  };

  const processInRange = new Map<string, number>();
  const processAfterEnd = new Map<string, number>();
  const pRows = await prisma.processingCostInput.findMany({
    where: { productionDate: { not: null } },
    select: { productName: true, productWarehouse: true, dailyProcessQty: true, productionDate: true },
  });
  for (const r of pRows) {
    const d = parseProductionDate(r.productionDate);
    if (!d) continue;
    const key = resolveStockKey(r.productName, r.productWarehouse);
    if (!key) continue;
    const qty = toNum(r.dailyProcessQty);
    if (qty <= 0) continue;
    if (d > endDay) processAfterEnd.set(key, (processAfterEnd.get(key) || 0) + qty);
    else if (d >= startDay) processInRange.set(key, (processInRange.get(key) || 0) + qty);
  }

  const saleInRange = new Map<string, number>();
  const saleAfterEnd = new Map<string, number>();
  const sRows = await prisma.deliverySettlement.findMany({
    where: { deliveryDate: { not: null } },
    select: { productType: true, warehouse: true, settlementQuantity: true, deliveryDate: true },
  });
  for (const r of sRows) {
    const d = parseWarehouseDate(r.deliveryDate);
    if (!d) continue;
    const key = resolveStockKey(r.productType, r.warehouse);
    if (!key) continue;
    const qty = toNum(r.settlementQuantity);
    if (qty <= 0) continue;
    if (d > endDay) saleAfterEnd.set(key, (saleAfterEnd.get(key) || 0) + qty);
    else if (d >= startDay) saleInRange.set(key, (saleInRange.get(key) || 0) + qty);
  }

  const productRows = stockRows.map((sr) => {
    const key = `${sr.product}\0${sr.warehouse}`;
    const current = currentMap.get(key) || 0;
    const pAfter = processAfterEnd.get(key) || 0;
    const sAfter = saleAfterEnd.get(key) || 0;
    const inferredClosing = current - pAfter + sAfter;
    const pRange = processInRange.get(key) || 0;
    const sRange = saleInRange.get(key) || 0;
    const inferredOpening = inferredClosing - pRange + sRange;

    // 报表展示口径：期初不展示负值；若因历史错账反推为负，则按 0 展示并由本期流转重算期末
    const opening = Math.max(0, inferredOpening);
    const closing = Math.max(0, opening + pRange - sRange);

    return { product: sr.product, warehouse: sr.warehouse, opening, process: pRange, sales: sRange, closing };
  });
  productRows.sort((a, b) => a.product.localeCompare(b.product) || a.warehouse.localeCompare(b.warehouse));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('基地收货与成品统计');
  sheet.columns = [
    { header: 'A', width: 6 },
    { header: 'B', width: 16 },
    { header: 'C', width: 16 },
    { header: 'D', width: 16 },
    { header: 'E', width: 16 },
    { header: 'F', width: 16 },
    { header: 'G', width: 16 },
  ];
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = `基地收货/加工/成品统计（${startDateStr} ~ ${endDateStr}）`;
  sheet.getCell('A1').font = { name: 'Microsoft YaHei', bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  let row = 3;
  sheet.getRow(row).values = ['', '毛料库区', '毛料类型', '期初库存(吨)', '本期采购入库(吨)', '本期加工领取(吨)', '期末库存(吨)'];
  row++;
  let mo = 0, mi = 0, mc = 0, me = 0;
  for (const r of materialRows) {
    sheet.getRow(row).values = ['', r.area, r.material, Number(r.opening.toFixed(3)), Number(r.inbound.toFixed(3)), Number(r.consume.toFixed(3)), Number(r.closing.toFixed(3))];
    mo += r.opening; mi += r.inbound; mc += r.consume; me += r.closing;
    row++;
  }
  sheet.getRow(row).values = ['', '合计', '', Number(mo.toFixed(3)), Number(mi.toFixed(3)), Number(mc.toFixed(3)), Number(me.toFixed(3))];
  sheet.getRow(row).font = { name: 'Microsoft YaHei', bold: true, size: 10 };
  applyTableBorderAndHeader(sheet, 3, row, 2, 7);

  row += 2;
  const productHeaderRow = row;
  sheet.getRow(row).values = ['', '成品名称', '成品仓库', '期初库存(吨)', '加工量(吨)', '销售出库(吨)', '期末库存(吨)'];
  row++;
  let po = 0, pp = 0, ps = 0, pe = 0;
  for (const r of productRows) {
    sheet.getRow(row).values = ['', r.product, r.warehouse, Number(r.opening.toFixed(3)), Number(r.process.toFixed(3)), Number(r.sales.toFixed(3)), Number(r.closing.toFixed(3))];
    po += r.opening; pp += r.process; ps += r.sales; pe += r.closing;
    row++;
  }
  sheet.getRow(row).values = ['', '合计', '', Number(po.toFixed(3)), Number(pp.toFixed(3)), Number(ps.toFixed(3)), Number(pe.toFixed(3))];
  sheet.getRow(row).font = { name: 'Microsoft YaHei', bold: true, size: 10 };
  applyTableBorderAndHeader(sheet, productHeaderRow, row, 2, 7);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const filename = `基地收货与成品统计_${startDateStr}_至_${endDateStr}.xlsx`;
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const mode = (searchParams.get('mode') || 'summary').trim();
    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: '请传入 startDate 与 endDate' }, { status: 400 });
    }

    const startDate = normalizeDateBoundary(startDateStr, false);
    const endDate = normalizeDateBoundary(endDateStr, true);
    if (!startDate || !endDate || startDate > endDate) {
      return NextResponse.json({ error: '日期范围不合法' }, { status: 400 });
    }
    if (mode === 'inventory') {
      return await buildInventoryWorkbook(startDate, endDate, startDateStr, endDateStr);
    }
    return await buildSummaryWorkbook(startDate, endDate, startDateStr, endDateStr);
  } catch (error) {
    console.error('导出成本分析数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 }
    );
  }
}

