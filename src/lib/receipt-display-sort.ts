/** 首页展示「白天」时段：7:00–19:00（含端点） */
export const RECEIPT_DAYTIME_HOUR_START = 7;
export const RECEIPT_DAYTIME_HOUR_END = 19;

export function isReceiptDaytimeHour(hour: number): boolean {
  return hour >= RECEIPT_DAYTIME_HOUR_START && hour <= RECEIPT_DAYTIME_HOUR_END;
}

function receiptDisplaySortKey(d: Date): [number, number, number] {
  const hour = d.getHours();
  const isDaytime = isReceiptDaytimeHour(hour);
  const cal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // 0=白天优先，1=非白天靠后
  return [isDaytime ? 0 : 1, cal.getTime(), d.getTime()];
}

/** 首页交易表展示排序：7–19点优先，日期新→旧，同组内时间新→旧 */
export function compareReceiptOrderTimeForDisplay(
  a: Date | null | undefined,
  b: Date | null | undefined
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const ka = receiptDisplaySortKey(new Date(a));
  const kb = receiptDisplaySortKey(new Date(b));
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (kb[1] !== ka[1]) return kb[1] - ka[1];
  return kb[2] - ka[2];
}
