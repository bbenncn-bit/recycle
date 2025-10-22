'use server';

import { ReceiptfgService } from '@/lib/services/receipt-service';

export async function getReceiptfgData() {
  return await ReceiptfgService.getLatestData();
}