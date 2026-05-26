import { NextRequest, NextResponse } from 'next/server';
import { assertInventoryOpsAuthorized } from '@/lib/inventory-ops-request-auth';
import { verifyOpsSessionFromRequest } from '@/lib/ops-auth';
import {
  getMaterialStorageForEntry,
  getMyProcessingCostList,
  getProductStockForEntry,
  insertProcessingCost,
  productStockTransfer,
  type InsertProcessingCostPayload,
  type ProductionMaterialLine,
} from '@/lib/services/production-entry-service';
import { WAREHOUSE_LIST } from '@/lib/warehouse-materials-config';

function webOperatorOpenid(username: string): string {
  return `web:${username}`;
}

export async function GET(request: NextRequest) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  const session = await verifyOpsSessionFromRequest(request);
  const username = session?.username ?? '';

  const { searchParams } = request.nextUrl;
  if (searchParams.get('orders') === '1') {
    const list = await getMyProcessingCostList(webOperatorOpenid(username));
    return NextResponse.json({ success: true, list });
  }

  const [productList, warehouseMaterials] = await Promise.all([
    getProductStockForEntry(),
    getMaterialStorageForEntry(),
  ]);

  return NextResponse.json({
    success: true,
    productList,
    warehouseList: [...WAREHOUSE_LIST],
    warehouseMaterials,
    operator: { username, openid: webOperatorOpenid(username) },
  });
}

export async function POST(request: NextRequest) {
  const denied = await assertInventoryOpsAuthorized(request);
  if (denied) return denied;

  const session = await verifyOpsSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '无效 JSON' }, { status: 400 });
  }

  const action = (body.action as string) || 'insert';

  if (action === 'transfer') {
    const result = await productStockTransfer({
      productName: String(body.productName || ''),
      fromWarehouse: String(body.fromWarehouse || ''),
      toProductName: String(body.toProductName || ''),
      toWarehouse: String(body.toWarehouse || ''),
      quantity: Number(body.quantity),
      operatorOpenid: webOperatorOpenid(session.username),
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  const payload: InsertProcessingCostPayload = {
    productName: String(body.productName || ''),
    productWarehouse: String(body.productWarehouse || ''),
    productTons: Number(body.productTons),
    productionDate: String(body.productionDate || ''),
    materialComposition: Array.isArray(body.materialComposition)
      ? (body.materialComposition as ProductionMaterialLine[])
      : [],
    operatorOpenid: webOperatorOpenid(session.username),
    createBy: webOperatorOpenid(session.username),
    name: session.username,
  };

  const result = await insertProcessingCost(payload);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }
  return NextResponse.json({
    success: true,
    id: result.id,
    productStockUpdate: result.productStockUpdate,
  });
}
