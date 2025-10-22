'use server';

import { ReceiptfgService } from '@/lib/services/receipt-service';
import { PaginationParams } from '@/lib/services/receipt-service';

export async function getReceiptfgDataBatch(params: PaginationParams = {}) {
  return await ReceiptfgService.getBatchData(params);
} 