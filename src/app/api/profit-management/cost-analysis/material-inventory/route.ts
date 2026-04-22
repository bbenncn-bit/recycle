import { NextResponse } from 'next/server';
import {
  getClosingStateThroughDate,
  getOpeningStateFirstDayOfMonth,
} from '@/lib/services/material-storage-inventory-service';

function parseYmd(s: string | null): { y: number; m: number; d: number } | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return { y, m, d };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearRaw = searchParams.get('year');
    const monthRaw = searchParams.get('month');
    const closingDate = searchParams.get('closingDate');

    const year = yearRaw ? parseInt(yearRaw, 10) : NaN;
    const month = monthRaw ? parseInt(monthRaw, 10) : NaN;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: '请传入合法 year、month' }, { status: 400 });
    }

    const openingRows = await getOpeningStateFirstDayOfMonth(year, month);
    const openingPayload = openingRows.map((r) => ({
      storageArea: r.storageArea,
      materialType: r.materialType,
      qty: Number(r.qty.toFixed(4)),
      price: Number(r.price.toFixed(4)),
      amount: Number((r.qty * r.price).toFixed(2)),
    }));

    let closingPayload: typeof openingPayload | null = null;
    if (closingDate) {
      const parsed = parseYmd(closingDate);
      if (!parsed) {
        return NextResponse.json({ success: false, error: 'closingDate 须为 YYYY-MM-DD' }, { status: 400 });
      }
      const closingRows = await getClosingStateThroughDate(closingDate);
      closingPayload = closingRows.map((r) => ({
        storageArea: r.storageArea,
        materialType: r.materialType,
        qty: Number(r.qty.toFixed(4)),
        price: Number(r.price.toFixed(4)),
        amount: Number((r.qty * r.price).toFixed(2)),
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        opening: openingPayload,
        closingAsOf: closingDate,
        closing: closingPayload,
      },
    });
  } catch (error) {
    console.error('material-inventory API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      },
      { status: 500 }
    );
  }
}
