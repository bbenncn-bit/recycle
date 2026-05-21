import { NextResponse } from 'next/server';
import { assertInventoryOpsAuthorized } from '@/lib/inventory-ops-request-auth';
import { listProcessingCostInputByMonth } from '@/lib/services/processing-cost-input-query-service';

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
    const data = await listProcessingCostInputByMonth(month);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
