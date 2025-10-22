'use server';

import { ReceiptfcService } from '@/lib/services/receipt-service';

export async function getReceiptfcData() {
  return await ReceiptfcService.getLatestData();
}