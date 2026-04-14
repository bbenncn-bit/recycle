import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
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

    const rows = await prisma.purchaseWarehouse.findMany({
      select: {
        warehouseDate: true,
        inboundTime: true,
        material: true,
        estimatedDryBasis: true,
        deduction: true,
        unitPriceExcludingTax: true,
        totalPriceExcludingTax: true,
      },
      where: {
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
      const dateByWarehouse = parseWarehouseDate(row.warehouseDate);
      const dateByInbound = parseInboundTime(row.inboundTime);
      const date = dateByWarehouse || dateByInbound;
      return !!date && date >= startDate && date <= endDate;
    });

    // 按毛料类型汇总：总扣杂、总结算吨位、总结算金额、平均采购单价、平均扣杂率
    const grouped = new Map<
      string,
      {
        material: string;
        totalDeduction: number;
        totalQty: number;
        totalAmount: number;
      }
    >();

    for (const row of filtered) {
      const material = (row.material || '未分类').trim() || '未分类';
      const qty = row.estimatedDryBasis != null ? Number(row.estimatedDryBasis.toString()) : 0;
      const deduction = row.deduction != null ? Number(row.deduction.toString()) : 0;
      const amount =
        row.totalPriceExcludingTax != null
          ? Number(row.totalPriceExcludingTax.toString())
          : (row.unitPriceExcludingTax != null ? Number(row.unitPriceExcludingTax.toString()) : 0) * qty;

      const existing = grouped.get(material) || {
        material,
        totalDeduction: 0,
        totalQty: 0,
        totalAmount: 0,
      };
      existing.totalDeduction += Number.isFinite(deduction) ? deduction : 0;
      existing.totalQty += Number.isFinite(qty) ? qty : 0;
      existing.totalAmount += Number.isFinite(amount) ? amount : 0;
      grouped.set(material, existing);
    }

    const exportRows = Array.from(grouped.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((item, index) => {
        const avgUnitPrice = item.totalQty > 0 ? item.totalAmount / item.totalQty : 0;
        const avgDeductionRate = item.totalQty > 0 ? (item.totalDeduction / item.totalQty) * 100 : 0;
        return {
          序号: index + 1,
          毛料类型: item.material,
          总扣杂: Number(item.totalDeduction.toFixed(3)),
          总结算吨位: Number(item.totalQty.toFixed(3)),
          总结算金额: Number(item.totalAmount.toFixed(2)),
          平均采购单价: Number(avgUnitPrice.toFixed(2)),
          平均扣杂率: `${avgDeductionRate.toFixed(2)}%`,
        };
      });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '成本分析导出');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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

