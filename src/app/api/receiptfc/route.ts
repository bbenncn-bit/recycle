import { NextResponse } from "next/server";
import { ReceiptfcService } from "@/lib/services/receipt-service";

export async function GET() {
  try {
    const data = await ReceiptfcService.getLatestData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 获取报废车数据失败:', error);
    return NextResponse.json(
      { error: '获取数据失败' },
      { status: 500 }
    );
  }
}



