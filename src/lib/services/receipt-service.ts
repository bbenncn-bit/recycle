import { prisma } from '@/lib/prismadb';
import { compareReceiptOrderTimeForDisplay } from '@/lib/receipt-display-sort';
import { generateProgressiveUrls, parseImageUrls } from '@/lib/image-utils';
import { HOME_DEFAULT_DATE_KEY } from '@/lib/receipt-home-dates';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 将 YYYY-MM-DD 解析为本地日历日的 [start, end)（用于用户选择的交易日） */
function localDayRangeFromDateKey(dateKey: string): { start: Date; end: Date } | null {
  if (!DATE_KEY_RE.test(dateKey)) return null;
  const parts = dateKey.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const end = new Date(y, mo - 1, d + 1, 0, 0, 0, 0);
  return { start, end };
}

function getHomeDefaultWindow(): {
  yesterdayStart: Date;
  todayStart: Date;
  todayTwoAM: Date;
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const todayTwoAM = new Date(todayStart);
  todayTwoAM.setHours(2, 0, 0, 0);
  return { yesterdayStart, todayStart, todayTwoAM };
}

export interface ReceiptData {
  id: number;
  saleMemberId: string | null;
  saleMemberName: string | null;
  taxInclu: any | null; // Prisma Decimal 类型
  unitpriceIncluTax: any | null; // Prisma Decimal 类型
  wasteTypeName: string | null;
  imgUrls: string | null;
  weight: any | null; // Prisma Decimal 类型
  orderTime: Date | null;
  carNumber: string | null;
  carBrand: string | null;
  createTime: Date | null;
  queryDate: Date | null;
}

export interface ProcessedReceiptData extends ReceiptData {
  originalImageUrl: string | null;
  thumbnailUrl: string | null;
  smallThumbnailUrl: string | null;
  mediumThumbnailUrl: string | null;
  progressiveUrls: {
    tiny: string;
    small: string;
    medium: string;
    original: string;
  } | null;
  hasImage: boolean;
  thumbnailSource: 'database' | 'cdn';
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  /** YYYY-MM-DD（本地日）或 HOME_DEFAULT（今日00:00-02:00 + 昨日全天） */
  date?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    currentBatch?: string;
  };
}

/** 按展示排序分页（白天优先）：一次取全量字段，避免二次按 id 查询丢字段 */
async function fetchReceiptfcPageSorted(
  where: Record<string, unknown>,
  page: number,
  limit: number,
  actualOffset: number,
  processFn: (data: ReceiptData[]) => ProcessedReceiptData[]
): Promise<PaginatedResult<ProcessedReceiptData>> {
  const rows = await prisma.receiptfc.findMany({ where });
  rows.sort((a, b) => compareReceiptOrderTimeForDisplay(a.orderTime, b.orderTime));
  const total = rows.length;
  const slice = rows.slice(actualOffset, actualOffset + limit);
  const processedData = processFn(slice as ReceiptData[]);
  const totalPages = Math.ceil(total / limit);
  return {
    data: processedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      currentBatch:
        processedData.length > 0
          ? `${actualOffset + 1}-${actualOffset + processedData.length}`
          : undefined,
    },
  };
}

async function fetchReceiptfgPageSorted(
  where: Record<string, unknown>,
  page: number,
  limit: number,
  actualOffset: number,
  processFn: (data: ReceiptData[]) => ProcessedReceiptData[]
): Promise<PaginatedResult<ProcessedReceiptData>> {
  const rows = await prisma.receiptfg.findMany({ where });
  rows.sort((a, b) => compareReceiptOrderTimeForDisplay(a.orderTime, b.orderTime));
  const total = rows.length;
  const slice = rows.slice(actualOffset, actualOffset + limit);
  const processedData = processFn(slice as ReceiptData[]);
  const totalPages = Math.ceil(total / limit);
  return {
    data: processedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      currentBatch:
        processedData.length > 0
          ? `${actualOffset + 1}-${actualOffset + processedData.length}`
          : undefined,
    },
  };
}

/**
 * 报废车数据服务
 */
export class ReceiptfcService {
  private static async resolveOrderTimeWhere(
    params: PaginationParams
  ): Promise<Record<string, unknown> | null> {
    if (params.date) {
      if (params.date === HOME_DEFAULT_DATE_KEY) {
        const { yesterdayStart, todayStart, todayTwoAM } = getHomeDefaultWindow();
        return {
          OR: [
            { orderTime: { gte: yesterdayStart, lt: todayStart } },
            { orderTime: { gte: todayStart, lt: todayTwoAM } },
          ],
        };
      }
      const r = localDayRangeFromDateKey(params.date);
      if (r) return { orderTime: { gte: r.start, lt: r.end } };
    }
    const latestDate = await this.getLatestOrderDate();
    if (!latestDate) return null;
    const dateStart = new Date(latestDate);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
    return { orderTime: { gte: dateStart, lt: dateEnd } };
  }

  /**
   * 获取最新日期的报废车数据
   */
  static async getLatestData(): Promise<ProcessedReceiptData[]> {
    try {
      // 获取最新日期
      const latestDate = await this.getLatestOrderDate();
      if (!latestDate) {
        return [];
      }

      // 正确计算当天的开始和结束时间（UTC）
      const dateStart = new Date(latestDate);
      dateStart.setUTCHours(0, 0, 0, 0); // 当天开始
      
      const dateEnd = new Date(dateStart);
      dateEnd.setUTCDate(dateEnd.getUTCDate() + 1); // 下一天开始

      console.log(`🔍 查询报废车数据 - 日期范围: ${dateStart.toISOString()} 到 ${dateEnd.toISOString()}`);

      // 获取该日期的所有数据
      const data = await prisma.receiptfc.findMany({
        where: {
          orderTime: {
            gte: dateStart,
            lt: dateEnd
          }
        },
        orderBy: {
          orderTime: 'desc'
        }
      });

      console.log(`✅ 找到 ${data.length} 条报废车数据`);

      return this.processReceiptData(data);
    } catch (error) {
      console.error('❌ 获取报废车数据失败:', error);
      throw error;
    }
  }

  /**
   * 分页获取报废车数据
   */
  static async getBatchData(params: PaginationParams = {}): Promise<PaginatedResult<ProcessedReceiptData>> {
    try {
      const { page = 1, limit = 10, offset } = params;
      const actualOffset = offset !== undefined ? offset : (page - 1) * limit;

      console.log(`🔄 获取报废车数据 - 页码: ${page}, 限制: ${limit}, 偏移: ${actualOffset}`);

      const where = await this.resolveOrderTimeWhere(params);
      if (!where) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false
          }
        };
      }

      console.log(`🔍 分页查询报废车数据 - 日期筛选: ${params.date || 'latest-day'}`);

      return fetchReceiptfcPageSorted(
        where,
        page,
        limit,
        actualOffset,
        (data) => this.processReceiptData(data)
      );
    } catch (error) {
      console.error('❌ 分批获取报废车数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取最新订单日期
   */
  private static async getLatestOrderDate(): Promise<Date | null> {
    const latestRecord = await prisma.receiptfc.findFirst({
      where: {
        orderTime: {
          not: null
        }
      },
      orderBy: {
        orderTime: 'desc'
      },
      select: {
        orderTime: true
      }
    });

    return latestRecord?.orderTime || null;
  }

  /**
   * 处理收据数据，添加图片处理逻辑
   */
  private static processReceiptData(data: ReceiptData[]): ProcessedReceiptData[] {
    return data.map(item => {
      const originalUrl = parseImageUrls(item.imgUrls);
      const progressiveUrls = originalUrl ? generateProgressiveUrls(originalUrl) : null;

      return {
        ...item,
        taxInclu: item.taxInclu ? item.taxInclu.toString() : null,
        unitpriceIncluTax: item.unitpriceIncluTax ? item.unitpriceIncluTax.toString() : null,
        weight: item.weight ? item.weight.toString() : null,
        originalImageUrl: originalUrl,
        thumbnailUrl: progressiveUrls?.tiny || null,
        smallThumbnailUrl: progressiveUrls?.small || null,
        mediumThumbnailUrl: progressiveUrls?.medium || null,
        progressiveUrls,
        hasImage: !!originalUrl,
        thumbnailSource: 'cdn' as const
      };
    });
  }
}

/**
 * 废钢数据服务
 */
export class ReceiptfgService {
  private static async resolveOrderTimeWhere(
    params: PaginationParams
  ): Promise<Record<string, unknown> | null> {
    if (params.date) {
      if (params.date === HOME_DEFAULT_DATE_KEY) {
        const { yesterdayStart, todayStart, todayTwoAM } = getHomeDefaultWindow();
        return {
          OR: [
            { orderTime: { gte: yesterdayStart, lt: todayStart } },
            { orderTime: { gte: todayStart, lt: todayTwoAM } },
          ],
        };
      }
      const r = localDayRangeFromDateKey(params.date);
      if (r) return { orderTime: { gte: r.start, lt: r.end } };
    }
    const latestDate = await this.getLatestOrderDate();
    if (!latestDate) return null;
    const dateStart = new Date(latestDate);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
    return { orderTime: { gte: dateStart, lt: dateEnd } };
  }

  /**
   * 获取最新日期的废钢数据
   */
  static async getLatestData(): Promise<ProcessedReceiptData[]> {
    try {
      // 获取最新日期
      const latestDate = await this.getLatestOrderDate();
      if (!latestDate) {
        return [];
      }

      // 正确计算当天的开始和结束时间（UTC）
      const dateStart = new Date(latestDate);
      dateStart.setUTCHours(0, 0, 0, 0); // 当天开始
      
      const dateEnd = new Date(dateStart);
      dateEnd.setUTCDate(dateEnd.getUTCDate() + 1); // 下一天开始

      console.log(`🔍 查询废钢数据 - 日期范围: ${dateStart.toISOString()} 到 ${dateEnd.toISOString()}`);

      // 获取该日期的所有数据
      const data = await prisma.receiptfg.findMany({
        where: {
          orderTime: {
            gte: dateStart,
            lt: dateEnd
          }
        },
        orderBy: {
          orderTime: 'desc'
        }
      });

      console.log(`✅ 找到 ${data.length} 条废钢数据`);
      return this.processReceiptData(data);
    } catch (error) {
      console.error('❌ 获取废钢数据失败:', error);
      throw error;
    }
  }

  /**
   * 分页获取废钢数据
   */
  static async getBatchData(params: PaginationParams = {}): Promise<PaginatedResult<ProcessedReceiptData>> {
    try {
      const { page = 1, limit = 10, offset } = params;
      const actualOffset = offset !== undefined ? offset : (page - 1) * limit;

      console.log(`🔄 获取废钢数据 - 页码: ${page}, 限制: ${limit}, 偏移: ${actualOffset}`);

      const where = await this.resolveOrderTimeWhere(params);
      if (!where) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false
          }
        };
      }

      console.log(`🔍 分页查询废钢数据 - 日期筛选: ${params.date || 'latest-day'}`);

      return fetchReceiptfgPageSorted(
        where,
        page,
        limit,
        actualOffset,
        (data) => this.processReceiptData(data)
      );
    } catch (error) {
      console.error('❌ 分批获取废钢数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取最新订单日期
   */
  private static async getLatestOrderDate(): Promise<Date | null> {
    const latestRecord = await prisma.receiptfg.findFirst({
      where: {
        orderTime: {
          not: null
        }
      },
      orderBy: {
        orderTime: 'desc'
      },
      select: {
        orderTime: true
      }
    });

    return latestRecord?.orderTime || null;
  }

  /**
   * 处理收据数据，添加图片处理逻辑
   */
  private static processReceiptData(data: ReceiptData[]): ProcessedReceiptData[] {
    return data.map(item => {
      const originalUrl = parseImageUrls(item.imgUrls);
      const progressiveUrls = originalUrl ? generateProgressiveUrls(originalUrl) : null;

      return {
        ...item,
        taxInclu: item.taxInclu ? item.taxInclu.toString() : null,
        unitpriceIncluTax: item.unitpriceIncluTax ? item.unitpriceIncluTax.toString() : null,
        weight: item.weight ? item.weight.toString() : null,
        originalImageUrl: originalUrl,
        thumbnailUrl: progressiveUrls?.tiny || null,
        smallThumbnailUrl: progressiveUrls?.small || null,
        mediumThumbnailUrl: progressiveUrls?.medium || null,
        progressiveUrls,
        hasImage: !!originalUrl,
        thumbnailSource: 'cdn' as const
      };
    });
  }
}
