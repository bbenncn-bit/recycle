/** 首页默认窗口：今日 00:00-02:00 + 昨日全天 */
export const HOME_DEFAULT_DATE_KEY = 'HOME_DEFAULT';

/**
 * 首页交易表：当前自然月内、从当月 1 日到今天的日期键（YYYY-MM-DD），新→旧。
 * 使用本地日历，与按「本地日」筛选订单一致。
 */
export function getLocalMonthToDateKeysDescending(): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayD = now.getDate();
  const keys: string[] = [];
  for (let d = todayD; d >= 1; d--) {
    keys.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return keys;
}

/** 首页日期下拉选项：默认窗口 + 本月按天 */
export function getHomeDateOptions(): string[] {
  return [HOME_DEFAULT_DATE_KEY, ...getLocalMonthToDateKeysDescending()];
}
