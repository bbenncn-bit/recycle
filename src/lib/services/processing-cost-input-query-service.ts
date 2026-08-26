import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prismadb';
import {
  ALIAS_PREFIX_LABEL,
  MATERIAL_ALIAS_PREFIXES,
} from '@/lib/processing-cost-input-material-columns';

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const n = parseFloat(String((v as { toString(): string }).toString()));
    return Number.isNaN(n) ? null : n;
  }
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

function parseJsonField(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw;
  return null;
}

function getRowField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
    const lower = k.toLowerCase();
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase() === lower) return row[rk];
    }
  }
  return undefined;
}

function formatDateTime(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const mo = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    const h = String(v.getHours()).padStart(2, '0');
    const mi = String(v.getMinutes()).padStart(2, '0');
    const s = String(v.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
  }
  return String(v).trim();
}

function pickOperator(row: Record<string, unknown>): string {
  const name = String(getRowField(row, 'name') ?? '').trim();
  const createBy = String(getRowField(row, 'createBy', 'create_by') ?? '').trim();
  const openid = String(getRowField(row, 'openid', 'cloudOpenid', '_openid') ?? '').trim();
  if (name) return name;
  if (createBy) return createBy;
  if (openid) return openid;
  return '';
}

/** 解析加工日期并得到 YYYY-MM */
export function getProductionMonthKey(productionDate: string | null | undefined): string | null {
  const t = (productionDate ?? '').trim();
  if (!t) return null;
  const d = new Date(t);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    return `${mdy[3]}-${String(parseInt(mdy[1], 10)).padStart(2, '0')}`;
  }
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(parseInt(iso[2], 10)).padStart(2, '0')}`;
  }
  return null;
}

function getMaterialWarehousePrefixes(row: Record<string, unknown>): string[] | null {
  const mwRaw = parseJsonField(
    getRowField(row, 'material_warehouses', 'materialWarehouses')
  );
  if (!mwRaw || typeof mwRaw !== 'object' || Array.isArray(mwRaw)) return null;
  const keys = Object.keys(mwRaw as Record<string, unknown>).filter((k) => k.trim());
  return keys.length > 0 ? keys : null;
}

export type MaterialFeedLine = {
  alias: string;
  materialName: string;
  warehouse: string;
  tons: number;
  unitPrice: number | null;
  amount: number | null;
};

/** 解析本单有投料量的毛料明细（qty>0） */
export function extractMaterialFeedLines(row: Record<string, unknown>): MaterialFeedLine[] {
  const lines: MaterialFeedLine[] = [];
  const allowed = getMaterialWarehousePrefixes(row);
  const mwRaw = parseJsonField(
    getRowField(row, 'material_warehouses', 'materialWarehouses')
  );
  const mwMap =
    mwRaw && typeof mwRaw === 'object' && !Array.isArray(mwRaw)
      ? (mwRaw as Record<string, unknown>)
      : {};

  const pushLine = (
    alias: string,
    tons: number,
    unitPrice: number | null,
    warehouseHint?: string
  ) => {
    if (!alias || tons <= 0) return;
    if (allowed && !allowed.includes(alias)) return;
    const warehouse =
      String(warehouseHint ?? mwMap[alias] ?? '').trim() ||
      String(getRowField(row, 'product_warehouse', 'productWarehouse') ?? '').trim();
    const amount =
      unitPrice != null && Number.isFinite(unitPrice) ? tons * unitPrice : null;
    lines.push({
      alias,
      materialName: ALIAS_PREFIX_LABEL[alias] ?? alias,
      warehouse,
      tons,
      unitPrice,
      amount,
    });
  };

  const compRaw = parseJsonField(
    getRowField(row, 'material_composition', 'materialComposition')
  );
  if (Array.isArray(compRaw) && compRaw.length > 0) {
    for (const it of compRaw as Array<Record<string, unknown>>) {
      const alias = String(it.material ?? it.shortName ?? '').trim();
      const tons = toNum(it.tons ?? it.quantity);
      if (!alias || tons == null || tons <= 0) continue;
      const colPrice = toNum(getRowField(row, `${alias}_price`, `${alias}Price`));
      const jsonPrice = toNum(it.currentPrice ?? it.price);
      const unitPrice = colPrice ?? jsonPrice;
      const wh = String(it.warehouse ?? '').trim();
      pushLine(alias, tons, unitPrice, wh || undefined);
    }
    if (lines.length > 0) return lines;
  }

  const prefixList = allowed ?? [...MATERIAL_ALIAS_PREFIXES];
  for (const prefix of prefixList) {
    const qty = toNum(getRowField(row, `${prefix}_qty`, `${prefix}Qty`));
    if (qty == null || qty <= 0) continue;
    const price = toNum(getRowField(row, `${prefix}_price`, `${prefix}Price`));
    pushLine(prefix, qty, price);
  }

  // 旧库 M1~M9 等 legacy 列
  for (let i = 1; i <= 9; i++) {
    const qty = toNum(getRowField(row, `M${i}_qty`, `m${i}Qty`));
    if (qty == null || qty <= 0) continue;
    const price = toNum(getRowField(row, `M${i}_price`, `m${i}Price`));
    pushLine(`M${i}`, qty, price);
  }

  return lines;
}

/** 投料组成：按 material_warehouses 中的毛料种类，取对应 XXX_qty / XXX_price；仅展示 qty>0 */
export function formatMaterialFeedComposition(row: Record<string, unknown>): string {
  const lines = extractMaterialFeedLines(row);
  if (lines.length === 0) return '—';
  return lines
    .map(
      (l) =>
        `${l.materialName} ${l.tons}吨${l.unitPrice != null ? `，单价${l.unitPrice}` : ''}`
    )
    .join('；');
}

export type ProcessingCostInputListItem = {
  id: number;
  productName: string;
  productWarehouse: string;
  productionDate: string;
  materialFeed: string;
  materialLines: MaterialFeedLine[];
  /** 投料总成本 Σ(吨×单价)，利润分析 LIFO 材料成本依据 */
  materialCostTotal: number;
  dailyProcessQty: number;
  /** 材料单价：投料总成本/成品吨数（有投料时）；否则回退库内 dailyProcess_price */
  dailyProcessPrice: number | null;
  /** 材料成本金额：优先投料总成本；无投料明细时回退库内 dailyProcess_amount */
  dailyProcessAmount: number;
  /** 库内原始成品库估价金额（历史可能按 ProductStock 单价写入，仅对照用） */
  stockValuationAmount: number;
  operator: string;
  createBy: string;
  openid: string;
  createdAt: string;
  updatedAt: string;
};

async function loadRawRowsForMonth(month: string): Promise<Record<string, unknown>[]> {
  const m = month.trim();
  if (!/^\d{4}-\d{2}$/.test(m)) {
    throw new Error('月份须为 YYYY-MM 格式');
  }

  const rawRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ProcessingCostInput WHERE production_date IS NOT NULL AND TRIM(production_date) <> '' ORDER BY production_date ASC, id ASC`
  );

  return rawRows.filter((row) => {
    const prodDate = String(getRowField(row, 'production_date', 'productionDate') ?? '').trim();
    return getProductionMonthKey(prodDate) === m;
  });
}

function mapRowToListItem(row: Record<string, unknown>): ProcessingCostInputListItem {
  const prodDate = String(getRowField(row, 'production_date', 'productionDate') ?? '').trim();
  const qty =
    toNum(getRowField(row, 'dailyProcess_qty', 'dailyProcessQty', 'product_tons', 'productTons')) ??
    0;
  const stockValuationAmount =
    toNum(getRowField(row, 'dailyProcess_amount', 'dailyProcessAmount')) ?? 0;
  const stockPrice = toNum(getRowField(row, 'dailyProcess_price', 'dailyProcessPrice'));
  const materialLines = extractMaterialFeedLines(row);
  const materialCostTotal = materialLines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const useFeed = materialCostTotal > 0;
  const dailyProcessAmount = useFeed ? materialCostTotal : stockValuationAmount;
  const dailyProcessPrice = useFeed
    ? qty > 0
      ? materialCostTotal / qty
      : null
    : stockPrice;

  return {
    id: Number(row.id),
    productName: String(getRowField(row, 'product_name', 'productName') ?? '').trim() || '—',
    productWarehouse:
      String(getRowField(row, 'product_warehouse', 'productWarehouse') ?? '').trim() || '',
    productionDate: prodDate,
    materialFeed: formatMaterialFeedComposition(row),
    materialLines,
    materialCostTotal,
    dailyProcessQty: qty,
    dailyProcessPrice,
    dailyProcessAmount,
    stockValuationAmount,
    operator: pickOperator(row),
    createBy: String(getRowField(row, 'createBy', 'create_by') ?? '').trim(),
    openid: String(getRowField(row, 'openid', 'cloudOpenid', '_openid') ?? '').trim(),
    createdAt: formatDateTime(getRowField(row, 'created_at', 'createdAt')),
    updatedAt: formatDateTime(getRowField(row, 'updated_at', 'updatedAt')),
  };
}

export async function listProcessingCostInputByMonth(
  month: string
): Promise<{ month: string; rows: ProcessingCostInputListItem[]; total: number }> {
  const m = month.trim();
  const filtered = await loadRawRowsForMonth(m);
  const rows = filtered.map(mapRowToListItem);
  return { month: m, rows, total: rows.length };
}

/** 导出指定月份加工明细 Excel（加工单汇总 + 投料明细两张表） */
export async function exportProcessingCostInputByMonth(
  month: string
): Promise<{ buffer: Buffer; filename: string }> {
  const { rows } = await listProcessingCostInputByMonth(month);
  const [y, mo] = month.split('-');
  const monthCn = `${y}年${parseInt(mo, 10)}月`;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'pxrecycle';
  wb.created = new Date();

  const sheetOrders = wb.addWorksheet('加工单汇总', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheetOrders.columns = [
    { header: '加工单ID', key: 'id', width: 10 },
    { header: '成品名称', key: 'productName', width: 18 },
    { header: '成品库区', key: 'productWarehouse', width: 12 },
    { header: '加工日期', key: 'productionDate', width: 18 },
    { header: '成品吨数', key: 'qty', width: 12 },
    { header: '材料单价(元/吨)', key: 'price', width: 14 },
    { header: '成品金额=投料总成本(元)', key: 'amount', width: 22 },
    { header: '投料组成', key: 'feed', width: 48 },
    { header: '投料总成本(元)', key: 'materialCost', width: 14 },
    { header: '录入人', key: 'operator', width: 14 },
    { header: 'createBy', key: 'createBy', width: 16 },
    { header: 'openid', key: 'openid', width: 28 },
    { header: '录入时间', key: 'createdAt', width: 20 },
    { header: '更新时间', key: 'updatedAt', width: 20 },
  ];
  sheetOrders.getRow(1).font = { bold: true, name: 'Microsoft YaHei', size: 10 };
  sheetOrders.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' },
  };

  for (const r of rows) {
    const materialCost = r.materialCostTotal;
    sheetOrders.addRow({
      id: r.id,
      productName: r.productName,
      productWarehouse: r.productWarehouse,
      productionDate: r.productionDate,
      qty: r.dailyProcessQty,
      price: r.dailyProcessPrice,
      amount: r.dailyProcessAmount,
      feed: r.materialFeed,
      materialCost: materialCost > 0 ? materialCost : null,
      operator: r.operator,
      createBy: r.createBy,
      openid: r.openid,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  const sheetMats = wb.addWorksheet('投料明细', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheetMats.columns = [
    { header: '加工单ID', key: 'id', width: 10 },
    { header: '成品名称', key: 'productName', width: 18 },
    { header: '成品库区', key: 'productWarehouse', width: 12 },
    { header: '加工日期', key: 'productionDate', width: 18 },
    { header: '毛料编码', key: 'alias', width: 12 },
    { header: '毛料名称', key: 'materialName', width: 18 },
    { header: '毛料库区', key: 'warehouse', width: 14 },
    { header: '投料吨数', key: 'tons', width: 12 },
    { header: '采购单价(元/吨)', key: 'unitPrice', width: 14 },
    { header: '投料金额(元)', key: 'amount', width: 14 },
    { header: '录入人', key: 'operator', width: 14 },
    { header: '录入时间', key: 'createdAt', width: 20 },
  ];
  sheetMats.getRow(1).font = { bold: true, name: 'Microsoft YaHei', size: 10 };
  sheetMats.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDDEBF7' },
  };

  for (const r of rows) {
    if (r.materialLines.length === 0) {
      sheetMats.addRow({
        id: r.id,
        productName: r.productName,
        productWarehouse: r.productWarehouse,
        productionDate: r.productionDate,
        alias: '',
        materialName: '（无投料明细）',
        warehouse: '',
        tons: null,
        unitPrice: null,
        amount: null,
        operator: r.operator,
        createdAt: r.createdAt,
      });
      continue;
    }
    for (const line of r.materialLines) {
      sheetMats.addRow({
        id: r.id,
        productName: r.productName,
        productWarehouse: r.productWarehouse,
        productionDate: r.productionDate,
        alias: line.alias,
        materialName: line.materialName,
        warehouse: line.warehouse,
        tons: line.tons,
        unitPrice: line.unitPrice,
        amount: line.amount,
        operator: r.operator,
        createdAt: r.createdAt,
      });
    }
  }

  const sheetNote = wb.addWorksheet('口径说明');
  sheetNote.getColumn(1).width = 100;
  const notes = [
    '【加工明细口径】',
    '· 投料总成本(元) = Σ(各毛料投料吨数 × 采购/库存单价)，来自 ProcessingCostInput 投料列或 material_composition。',
    '· 成品金额 = 投料总成本；材料单价 = 投料总成本 ÷ 成品吨数。二者应相等（同一投料成本）。',
    '· 历史库内 dailyProcess_amount 曾按 ProductStock.current_price×产量写入（成品库估价），与投料成本不同；导出/列表已改按投料成本展示。',
    '· 利润分析「销售明细 → 材料成本」按 LIFO 消耗加工批次：批次单位材料成本 = 该单投料总成本 ÷ 成品吨数，再 × 销售匹配吨数。不使用成品库估价。',
  ];
  notes.forEach((line, i) => {
    const cell = sheetNote.getCell(i + 1, 1);
    cell.value = line;
    cell.font = { name: 'Microsoft YaHei', size: 10 };
  });

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const filename = `加工明细_${monthCn}.xlsx`;
  return { buffer, filename };
}
