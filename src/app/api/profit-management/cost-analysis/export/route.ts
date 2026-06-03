import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate } from '@/lib/services/profit-service';
import { isBaseSelfReceipt } from '@/lib/cost-receipt-classification';
import { purchaseInboundStorageArea } from '@/lib/purchase-warehouse-location';
import { parseProductionDate } from '@/lib/services/lifo-material-cost-service';
import {
  buildMaterialStorageKeyResolver,
  getClosingStateThroughDate,
  getOpeningStateFirstDayOfMonth,
  loadMaterialStorageCatalog,
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

type QtyAmountAgg = { qty: number; amount: number };

function addQtyAmount(map: Map<string, QtyAmountAgg>, key: string, qty: number, amount: number) {
  if (qty === 0 && amount === 0) return;
  const cur = map.get(key) || { qty: 0, amount: 0 };
  cur.qty += qty;
  cur.amount += amount;
  map.set(key, cur);
}

function weightedUnitPrice(agg: QtyAmountAgg | undefined): number {
  if (!agg || agg.qty <= 0) return 0;
  return agg.amount / agg.qty;
}

const LEDGER_COL_COUNT = 14;
const LEDGER_LAST_COL = 1 + LEDGER_COL_COUNT;

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

  // 毛料：仅 MaterialStorage 标准目录（库区 + 毛料类型）；加工耗用 alias 须映射到 material_type
  const materialCatalog = await loadMaterialStorageCatalog();
  const resolveMaterialKey = buildMaterialStorageKeyResolver(materialCatalog);

  let openingRows = await getOpeningStateFirstDayOfMonth(startDay.getFullYear(), startDay.getMonth() + 1);
  if (dayBeforeStart.getTime() >= MATERIAL_INVENTORY_ROLL_START.getTime()) {
    openingRows = await getClosingStateThroughDate(formatYmd(dayBeforeStart));
  }
  const openingMap = new Map(openingRows.map((r) => [`${r.storageArea}\0${r.materialType}`, r]));

  const inMap = new Map<string, number>();
  const inPurchaseAgg = new Map<string, QtyAmountAgg>();
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
      totalPriceExcludingTax: true,
      unitPriceExcludingTax: true,
    },
  });
  for (const p of purchases) {
    if (!isBaseSelfReceipt(p.receiptNo, p.warehouse)) continue;
    if ((p.status || '').includes('红冲') || (p.status || '').includes('撤销')) continue;
    const d = parseWarehouseDate(p.warehouseDate);
    if (!d || d < startDay || d > endDay) continue;
    const area = purchaseInboundStorageArea(p);
    const material = (p.material || '').trim();
    const key = resolveMaterialKey(area, material);
    if (!key) continue;
    const qty = toNum(p.estimatedDryBasis);
    let amount = toNum(p.totalPriceExcludingTax);
    if (!amount && qty) amount = toNum(p.unitPriceExcludingTax) * qty;
    inMap.set(key, (inMap.get(key) || 0) + qty);
    addQtyAmount(inPurchaseAgg, key, qty, amount);
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
      if (!mat || tons <= 0) continue;
      const key = resolveMaterialKey(wh, mat);
      if (!key) continue;
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
  // 期末数量按本表口径：期初 + 本期采购入库 − 本期加工领取（与金额列一致，不用滚存快照以免与 alias 加工耗用脱节）
  const materialRows: MaterialLedgerRow[] = materialCatalog.map((entry) => {
    const opening = toNum(openingMap.get(entry.key)?.qty);
    const inbound = toNum(inMap.get(entry.key));
    const consume = toNum(consumeMap.get(entry.key));
    return {
      area: entry.storageArea,
      material: entry.materialType,
      opening,
      inbound,
      consume,
      closing: opening + inbound - consume,
    };
  });

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
  const processInRangeAgg = new Map<string, QtyAmountAgg>();
  const processBeforeStartAgg = new Map<string, QtyAmountAgg>();
  const pRows = await prisma.processingCostInput.findMany({
    where: { productionDate: { not: null } },
    select: {
      productName: true,
      productWarehouse: true,
      dailyProcessQty: true,
      dailyProcessAmount: true,
      dailyProcessPrice: true,
      productionDate: true,
    },
  });
  for (const r of pRows) {
    const d = parseProductionDate(r.productionDate);
    if (!d) continue;
    const key = resolveStockKey(r.productName, r.productWarehouse);
    if (!key) continue;
    const qty = toNum(r.dailyProcessQty);
    if (qty <= 0) continue;
    let amount = toNum(r.dailyProcessAmount);
    if (!amount) {
      const px = toNum(r.dailyProcessPrice);
      if (px) amount = px * qty;
    }
    if (d > endDay) processAfterEnd.set(key, (processAfterEnd.get(key) || 0) + qty);
    else if (d >= startDay) {
      processInRange.set(key, (processInRange.get(key) || 0) + qty);
      addQtyAmount(processInRangeAgg, key, qty, amount);
    } else if (d < startDay) {
      addQtyAmount(processBeforeStartAgg, key, qty, amount);
    }
  }

  const saleInRange = new Map<string, number>();
  const saleAfterEnd = new Map<string, number>();
  const saleInRangeAgg = new Map<string, QtyAmountAgg>();
  const sRows = await prisma.deliverySettlement.findMany({
    where: { deliveryDate: { not: null } },
    select: {
      productType: true,
      warehouse: true,
      settlementQuantity: true,
      totalSettlementAmount: true,
      deliveryDate: true,
    },
  });
  for (const r of sRows) {
    const d = parseWarehouseDate(r.deliveryDate);
    if (!d) continue;
    const key = resolveStockKey(r.productType, r.warehouse);
    if (!key) continue;
    const qty = toNum(r.settlementQuantity);
    if (qty <= 0) continue;
    const amount = toNum(r.totalSettlementAmount);
    if (d > endDay) saleAfterEnd.set(key, (saleAfterEnd.get(key) || 0) + qty);
    else if (d >= startDay) {
      saleInRange.set(key, (saleInRange.get(key) || 0) + qty);
      addQtyAmount(saleInRangeAgg, key, qty, amount);
    }
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

  const materialHeader = [
    '',
    '毛料库区',
    '毛料类型',
    '期初数量(吨)',
    '期初平均单价（元）',
    '期初总金额（元）',
    '本期采购入库数量(吨)',
    '本期采购平均单价（元）',
    '本期采购入库总金额（元）',
    '本期加工领取数量(吨)',
    '本期加工领取单价（元）',
    '本期加工领取总金额（元）',
    '期末库存数量(吨)',
    '期末库存单价（元）',
    '期末库存总金额（元）',
  ];

  const productHeader = [
    '',
    '成品名称',
    '成品仓库',
    '期初库存数量(吨)',
    '期初平均单价（元）',
    '期初总金额（元）',
    '加工数量(吨)',
    '本期成品入库单价（元）',
    '本期成品入库总金额（元）',
    '本期销售出库数量(吨)',
    '本期销售出库单价(元)',
    '本期销售出库总金额(元)',
    '期末库存数量(吨)',
    '期末库存单价（元）',
    '期末库存总金额（元）',
  ];

  type MaterialExportRow = {
    area: string;
    material: string;
    openingQty: number;
    openingPrice: number;
    openingAmount: number;
    inboundQty: number;
    inboundPrice: number;
    inboundAmount: number;
    consumeQty: number;
    consumePrice: number;
    consumeAmount: number;
    closingQty: number;
    closingPrice: number;
    closingAmount: number;
  };

  const materialExportRows: MaterialExportRow[] = materialRows.map((r) => {
    const key = `${r.area}\0${r.material}`;
    const openingPrice = r.opening > 0 ? toNum(openingMap.get(key)?.price) : 0;
    const openingAmount = r.opening * openingPrice;
    const inAgg = inPurchaseAgg.get(key);
    const inboundPrice = weightedUnitPrice(inAgg);
    const inboundAmount = r.inbound * inboundPrice;
    const consumeDenom = r.opening + r.inbound;
    const consumePrice =
      consumeDenom > 0 ? (openingAmount + inboundAmount) / consumeDenom : 0;
    const consumeAmount = r.consume * consumePrice;
    const closingAmount = openingAmount + inboundAmount - consumeAmount;
    const closingPrice = r.closing > 0 ? closingAmount / r.closing : 0;
    return {
      area: r.area,
      material: r.material,
      openingQty: r.opening,
      openingPrice,
      openingAmount,
      inboundQty: r.inbound,
      inboundPrice,
      inboundAmount,
      consumeQty: r.consume,
      consumePrice,
      consumeAmount,
      closingQty: r.closing,
      closingPrice,
      closingAmount,
    };
  });

  type ProductExportRow = {
    product: string;
    warehouse: string;
    openingQty: number;
    openingPrice: number;
    openingAmount: number;
    processQty: number;
    processPrice: number;
    processAmount: number;
    salesQty: number;
    salesPrice: number;
    salesAmount: number;
    closingQty: number;
    closingPrice: number;
    closingAmount: number;
  };

  const productExportRows: ProductExportRow[] = productRows.map((r) => {
    const key = `${r.product}\0${r.warehouse}`;
    const openingPrice = r.opening > 0 ? weightedUnitPrice(processBeforeStartAgg.get(key)) : 0;
    const openingAmount = r.opening * openingPrice;
    const processPrice = weightedUnitPrice(processInRangeAgg.get(key));
    const processAmount = r.process * processPrice;
    const salesPrice = weightedUnitPrice(saleInRangeAgg.get(key));
    const salesAmount = r.sales * salesPrice;
    const closingAmount = openingAmount + processAmount - salesAmount;
    const closingPrice = r.closing > 0 ? closingAmount / r.closing : 0;
    return {
      product: r.product,
      warehouse: r.warehouse,
      openingQty: r.opening,
      openingPrice,
      openingAmount,
      processQty: r.process,
      processPrice,
      processAmount,
      salesQty: r.sales,
      salesPrice,
      salesAmount,
      closingQty: r.closing,
      closingPrice,
      closingAmount,
    };
  });

  const sumMaterialTotals = (rows: MaterialExportRow[]) => {
    const t = {
      openingQty: 0,
      openingAmount: 0,
      inboundQty: 0,
      inboundAmount: 0,
      consumeQty: 0,
      consumeAmount: 0,
      closingQty: 0,
      closingAmount: 0,
    };
    for (const r of rows) {
      t.openingQty += r.openingQty;
      t.openingAmount += r.openingAmount;
      t.inboundQty += r.inboundQty;
      t.inboundAmount += r.inboundAmount;
      t.consumeQty += r.consumeQty;
      t.consumeAmount += r.consumeAmount;
      t.closingQty += r.closingQty;
      t.closingAmount += r.closingAmount;
    }
    return t;
  };

  const sumProductTotals = (rows: ProductExportRow[]) => {
    const t = {
      openingQty: 0,
      openingAmount: 0,
      processQty: 0,
      processAmount: 0,
      salesQty: 0,
      salesAmount: 0,
      closingQty: 0,
      closingAmount: 0,
    };
    for (const r of rows) {
      t.openingQty += r.openingQty;
      t.openingAmount += r.openingAmount;
      t.processQty += r.processQty;
      t.processAmount += r.processAmount;
      t.salesQty += r.salesQty;
      t.salesAmount += r.salesAmount;
      t.closingQty += r.closingQty;
      t.closingAmount += r.closingAmount;
    }
    return t;
  };

  const materialRowToValues = (r: MaterialExportRow): (string | number)[] => [
    '',
    r.area,
    r.material,
    Number(r.openingQty.toFixed(3)),
    Number(r.openingPrice.toFixed(2)),
    Number(r.openingAmount.toFixed(2)),
    Number(r.inboundQty.toFixed(3)),
    Number(r.inboundPrice.toFixed(2)),
    Number(r.inboundAmount.toFixed(2)),
    Number(r.consumeQty.toFixed(3)),
    Number(r.consumePrice.toFixed(2)),
    Number(r.consumeAmount.toFixed(2)),
    Number(r.closingQty.toFixed(3)),
    Number(r.closingPrice.toFixed(2)),
    Number(r.closingAmount.toFixed(2)),
  ];

  const productRowToValues = (r: ProductExportRow): (string | number)[] => [
    '',
    r.product,
    r.warehouse,
    Number(r.openingQty.toFixed(3)),
    Number(r.openingPrice.toFixed(2)),
    Number(r.openingAmount.toFixed(2)),
    Number(r.processQty.toFixed(3)),
    Number(r.processPrice.toFixed(2)),
    Number(r.processAmount.toFixed(2)),
    Number(r.salesQty.toFixed(3)),
    Number(r.salesPrice.toFixed(2)),
    Number(r.salesAmount.toFixed(2)),
    Number(r.closingQty.toFixed(3)),
    Number(r.closingPrice.toFixed(2)),
    Number(r.closingAmount.toFixed(2)),
  ];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('基地毛料与成品统计');
  for (let c = 1; c <= LEDGER_LAST_COL; c++) {
    sheet.getColumn(c).width = c === 1 ? 4 : 14;
  }

  const titleMergeEnd = String.fromCharCode(64 + LEDGER_LAST_COL);
  sheet.mergeCells(`A1:${titleMergeEnd}1`);
  sheet.getCell('A1').value = `基地毛料统计（${startDateStr} ~ ${endDateStr}）`;
  sheet.getCell('A1').font = { name: 'Microsoft YaHei', bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  let row = 2;
  const materialHeaderRow = row;
  sheet.getRow(row).values = materialHeader;
  row++;
  for (const r of materialExportRows) {
    sheet.getRow(row).values = materialRowToValues(r);
    row++;
  }
  const mTotal = sumMaterialTotals(materialExportRows);
  sheet.getRow(row).values = [
    '',
    '合计',
    '',
    Number(mTotal.openingQty.toFixed(3)),
    mTotal.openingQty > 0 ? Number((mTotal.openingAmount / mTotal.openingQty).toFixed(2)) : 0,
    Number(mTotal.openingAmount.toFixed(2)),
    Number(mTotal.inboundQty.toFixed(3)),
    mTotal.inboundQty > 0 ? Number((mTotal.inboundAmount / mTotal.inboundQty).toFixed(2)) : 0,
    Number(mTotal.inboundAmount.toFixed(2)),
    Number(mTotal.consumeQty.toFixed(3)),
    mTotal.consumeQty > 0 ? Number((mTotal.consumeAmount / mTotal.consumeQty).toFixed(2)) : 0,
    Number(mTotal.consumeAmount.toFixed(2)),
    Number(mTotal.closingQty.toFixed(3)),
    mTotal.closingQty > 0 ? Number((mTotal.closingAmount / mTotal.closingQty).toFixed(2)) : 0,
    Number(mTotal.closingAmount.toFixed(2)),
  ];
  sheet.getRow(row).font = { name: 'Microsoft YaHei', bold: true, size: 10 };
  applyTableBorderAndHeader(sheet, materialHeaderRow, row, 2, LEDGER_LAST_COL);

  row += 2;
  sheet.mergeCells(`A${row}:${titleMergeEnd}${row}`);
  sheet.getCell(`A${row}`).value = `基地成品统计（${startDateStr} ~ ${endDateStr}）`;
  sheet.getCell(`A${row}`).font = { name: 'Microsoft YaHei', bold: true, size: 14 };
  sheet.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  row++;
  const productHeaderRow = row;
  sheet.getRow(row).values = productHeader;
  row++;
  for (const r of productExportRows) {
    sheet.getRow(row).values = productRowToValues(r);
    row++;
  }
  const pTotal = sumProductTotals(productExportRows);
  sheet.getRow(row).values = [
    '',
    '合计',
    '',
    Number(pTotal.openingQty.toFixed(3)),
    pTotal.openingQty > 0 ? Number((pTotal.openingAmount / pTotal.openingQty).toFixed(2)) : 0,
    Number(pTotal.openingAmount.toFixed(2)),
    Number(pTotal.processQty.toFixed(3)),
    pTotal.processQty > 0 ? Number((pTotal.processAmount / pTotal.processQty).toFixed(2)) : 0,
    Number(pTotal.processAmount.toFixed(2)),
    Number(pTotal.salesQty.toFixed(3)),
    pTotal.salesQty > 0 ? Number((pTotal.salesAmount / pTotal.salesQty).toFixed(2)) : 0,
    Number(pTotal.salesAmount.toFixed(2)),
    Number(pTotal.closingQty.toFixed(3)),
    pTotal.closingQty > 0 ? Number((pTotal.closingAmount / pTotal.closingQty).toFixed(2)) : 0,
    Number(pTotal.closingAmount.toFixed(2)),
  ];
  sheet.getRow(row).font = { name: 'Microsoft YaHei', bold: true, size: 10 };
  applyTableBorderAndHeader(sheet, productHeaderRow, row, 2, LEDGER_LAST_COL);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const filename = `基地毛料与成品统计_${startDateStr}_至_${endDateStr}.xlsx`;
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

