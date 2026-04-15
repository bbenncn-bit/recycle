import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prismadb';
import { parseWarehouseDate } from '@/lib/services/profit-service';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: '请传入 startDate 与 endDate' }, { status: 400 });
    }

    const startDate = normalizeDateBoundary(startDateStr, false);
    const endDate = normalizeDateBoundary(endDateStr, true);
    if (!startDate || !endDate || startDate > endDate) {
      return NextResponse.json({ error: '日期范围不合法' }, { status: 400 });
    }

    // 仅汇总基地收货：收货单号 receipt_no 以 SH 开头（如 SH2601150013），排除 TH 等基地买货单
    const rows = await prisma.purchaseWarehouse.findMany({
      select: {
        receiptNo: true,
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
        OR: [
          { warehouseDate: { not: null } },
          { inboundTime: { not: null } },
        ],
      },
      orderBy: {
        warehouseDate: 'asc',
      },
    });

    const filtered = rows.filter((row) => {
      const rn = (row.receiptNo || '').trim();
      if (!rn.toUpperCase().startsWith('SH')) return false;
      const dateByWarehouse = parseWarehouseDate(row.warehouseDate);
      const dateByInbound = parseInboundTime(row.inboundTime);
      const date = dateByWarehouse || dateByInbound;
      return !!date && date >= startDate && date <= endDate;
    });

    // 按 库区 + 毛料类型 汇总：总扣杂、总结算吨位、总结算金额、平均采购单价、平均扣杂率
    const grouped = new Map<
      string,
      {
        area: string;
        material: string;
        totalDeduction: number;
        totalQty: number;
        totalAmount: number;
      }
    >();

    for (const row of filtered) {
      const area = (row.warehouseArea || '未分区').trim() || '未分区';
      const material = (row.material || '未分类').trim() || '未分类';
      const qty = row.estimatedDryBasis != null ? Number(row.estimatedDryBasis.toString()) : 0;
      const deduction = row.deduction != null ? Number(row.deduction.toString()) : 0;
      const amount =
        row.totalPriceExcludingTax != null
          ? Number(row.totalPriceExcludingTax.toString())
          : (row.unitPriceExcludingTax != null ? Number(row.unitPriceExcludingTax.toString()) : 0) * qty;

      const key = `${area}__${material}`;
      const existing = grouped.get(key) || {
        area,
        material,
        totalDeduction: 0,
        totalQty: 0,
        totalAmount: 0,
      };
      existing.totalDeduction += Number.isFinite(deduction) ? deduction : 0;
      existing.totalQty += Number.isFinite(qty) ? qty : 0;
      existing.totalAmount += Number.isFinite(amount) ? amount : 0;
      grouped.set(key, existing);
    }

    const exportRows = Array.from(grouped.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((item, index) => {
        const avgUnitPrice = item.totalQty > 0 ? item.totalAmount / item.totalQty : 0;
        const avgDeductionRate = item.totalQty > 0 ? (item.totalDeduction / item.totalQty) * 100 : 0;
        const totalAmountWan = item.totalAmount / 10000;
        return {
          序号: index + 1,
          库区: item.area,
          毛料类型: item.material,
          '总扣杂/吨': Number(item.totalDeduction.toFixed(3)),
          '总结算吨位/吨': Number(item.totalQty.toFixed(3)),
          '总结算金额/万元': Number(totalAmountWan.toFixed(4)),
          '平均采购单价/元': Number(avgUnitPrice.toFixed(2)),
          平均扣杂率: `${avgDeductionRate.toFixed(2)}%`,
        };
      });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('毛料汇总');

    const columns = [
      { header: '序号', key: '序号' },
      { header: '库区', key: '库区' },
      { header: '毛料类型', key: '毛料类型' },
      { header: '总扣杂/吨', key: '总扣杂/吨' },
      { header: '总结算吨位/吨', key: '总结算吨位/吨' },
      { header: '总结算金额/万元', key: '总结算金额/万元' },
      { header: '平均采购单价/元', key: '平均采购单价/元' },
      { header: '平均扣杂率', key: '平均扣杂率' },
    ] as const;

    sheet.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: Math.max(12, c.header.length + 2),
    }));

    exportRows.forEach((row) => sheet.addRow(row));

    // 统一字体与边框
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.font = {
          name: 'Microsoft YaHei',
          size: 11,
          bold: rowNumber === 1,
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // 头行强调
    const headerRow = sheet.getRow(1);
    headerRow.height = 22;

    // 按内容自动扩宽，避免挤在一起
    sheet.columns.forEach((col) => {
      let maxLength = col.width ?? 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const text = cell.value == null ? '' : String(cell.value);
        maxLength = Math.max(maxLength, text.length + 4);
      });
      col.width = Math.min(Math.max(maxLength, 12), 40);
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `毛料采购汇总_${startDateStr}_至_${endDateStr}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('导出成本分析数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 }
    );
  }
}

