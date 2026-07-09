import { NextResponse } from 'next/server';
import { assertInventoryOpsAuthorized } from '@/lib/inventory-ops-request-auth';
import { exportProcessingCostInputByMonth } from '@/lib/services/processing-cost-input-query-service';

export const maxDuration = 120;

export async function GET(request: Request) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month')?.trim() ?? '';
    if (!month) {
      return NextResponse.json(
        { success: false, error: '请提供 month 参数（YYYY-MM）' },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: '月份须为 YYYY-MM 格式' },
        { status: 400 }
      );
    }

    const { buffer, filename } = await exportProcessingCostInputByMonth(month);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
