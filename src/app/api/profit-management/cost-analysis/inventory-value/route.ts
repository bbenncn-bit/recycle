import { NextResponse } from 'next/server';
import { getInventoryValueAnalysisRows } from '@/lib/services/material-inventory-value-analysis';

export async function GET() {
  try {
    const rows = await getInventoryValueAnalysisRows();
    return NextResponse.json({ success: true, data: { rows } });
  } catch (error) {
    console.error('inventory-value API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      },
      { status: 500 }
    );
  }
}
