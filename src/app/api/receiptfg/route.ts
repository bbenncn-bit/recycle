import { NextResponse } from "next/server";
import { ReceiptfgService } from "@/lib/services/receipt-service";

export async function GET() {
  try {
    const data = await ReceiptfgService.getLatestData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 获取废钢数据失败:', error);
    return NextResponse.json(
      { error: '获取数据失败' },
      { status: 500 }
    );
  }
}