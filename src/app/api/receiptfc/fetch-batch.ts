'use server';

import { ReceiptfcService } from '@/lib/services/receipt-service';
import { PaginationParams } from '@/lib/services/receipt-service';

export async function getReceiptfcDataBatch(params: PaginationParams = {}) {
  return await ReceiptfcService.getBatchData(params);
} 