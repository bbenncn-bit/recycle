/** 解析日期字符串为 Date（无 Node/DB 依赖，可在客户端使用） */
export function parseWarehouseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+\d{1,2}:\d{1,2}:\d{1,2})?$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+\d{1,2}:\d{1,2}:\d{1,2})?$/,
    /^(\d{4})(\d{2})(\d{2})$/,
    /^(\d{4})年(\d{1,2})月(\d{1,2})日?$/,
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      if (year < 1900 || year > 2100) continue;
      if (month < 0 || month > 11) continue;
      if (day < 1 || day > 31) continue;
      const date = new Date(year, month, day);
      if (
        !isNaN(date.getTime()) &&
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }

  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    if (year >= 1900 && year <= 2100) return date;
  }

  return null;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
