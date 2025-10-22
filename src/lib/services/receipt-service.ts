import { prisma } from '@/lib/prismadb';

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

/**
 * 报废车数据服务
 */
export class ReceiptfcService {
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

      // 获取最新日期
      const latestDate = await this.getLatestOrderDate();
      if (!latestDate) {
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

      // 正确计算当天的开始和结束时间（UTC）
      const dateStart = new Date(latestDate);
      dateStart.setUTCHours(0, 0, 0, 0); // 当天开始
      
      const dateEnd = new Date(dateStart);
      dateEnd.setUTCDate(dateEnd.getUTCDate() + 1); // 下一天开始

      console.log(`🔍 分页查询报废车数据 - 日期范围: ${dateStart.toISOString()} 到 ${dateEnd.toISOString()}`);

      // 获取分页数据
      const [data, total] = await Promise.all([
        prisma.receiptfc.findMany({
          where: {
            orderTime: {
              gte: dateStart,
              lt: dateEnd
            }
          },
          orderBy: {
            orderTime: 'desc'
          },
          skip: actualOffset,
          take: limit
        }),
        prisma.receiptfc.count({
          where: {
            orderTime: {
              gte: dateStart,
              lt: dateEnd
            }
          }
        })
      ]);

      const processedData = this.processReceiptData(data);
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      console.log(`✅ 成功获取 ${processedData.length} 条报废车数据 (${actualOffset + 1}-${actualOffset + processedData.length}/${total})`);

      return {
        data: processedData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
          currentBatch: `${actualOffset + 1}-${actualOffset + processedData.length}`
        }
      };
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
      const originalUrl = this.parseImageUrls(item.imgUrls);
      const progressiveUrls = originalUrl ? this.generateProgressiveUrls(originalUrl) : null;

      return {
        ...item,
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

  /**
   * 解析图片URL
   */
  private static parseImageUrls(imgUrls: any): string | null {
    if (!imgUrls) return null;

    try {
      if (typeof imgUrls === 'string') {
        if (imgUrls.trim().startsWith('[')) {
          const parsed = JSON.parse(imgUrls);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        }
        if (imgUrls.includes(',')) {
          const urls = imgUrls.split(',').map(url => url.trim()).filter(Boolean);
          return urls.length > 0 ? urls[0] : null;
        }
        return imgUrls.trim() || null;
      }

      if (Array.isArray(imgUrls)) {
        return imgUrls.length > 0 ? imgUrls[0] : null;
      }

      return null;
    } catch (error) {
      console.warn('解析图片 URL 失败:', error);
      return null;
    }
  }

  /**
   * 生成CDN压缩URL
   */
  private static generateProgressiveUrls(originalUrl: string): {
    tiny: string;
    small: string;
    medium: string;
    original: string;
  } {
    if (!originalUrl) {
      return { tiny: '', small: '', medium: '', original: '' };
    }

    const separator = originalUrl.includes('?') ? '&' : '?';

    return {
      tiny: `${originalUrl}${separator}w=48&h=48&q=10&format=webp&fit=cover`,
      small: `${originalUrl}${separator}w=80&h=80&q=25&format=webp&fit=cover`,
      medium: `${originalUrl}${separator}w=120&h=120&q=40&format=webp&fit=cover`,
      original: originalUrl
    };
  }
}

/**
 * 废钢数据服务
 */
export class ReceiptfgService {
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

      // 获取最新日期
      const latestDate = await this.getLatestOrderDate();
      if (!latestDate) {
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

      // 正确计算当天的开始和结束时间（UTC）
      const dateStart = new Date(latestDate);
      dateStart.setUTCHours(0, 0, 0, 0); // 当天开始
      
      const dateEnd = new Date(dateStart);
      dateEnd.setUTCDate(dateEnd.getUTCDate() + 1); // 下一天开始

      console.log(`🔍 分页查询废钢数据 - 日期范围: ${dateStart.toISOString()} 到 ${dateEnd.toISOString()}`);

      // 获取分页数据
      const [data, total] = await Promise.all([
        prisma.receiptfg.findMany({
          where: {
            orderTime: {
              gte: dateStart,
              lt: dateEnd
            }
          },
          orderBy: {
            orderTime: 'desc'
          },
          skip: actualOffset,
          take: limit
        }),
        prisma.receiptfg.count({
          where: {
            orderTime: {
              gte: dateStart,
              lt: dateEnd
            }
          }
        })
      ]);

      const processedData = this.processReceiptData(data);
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      console.log(`✅ 成功获取 ${processedData.length} 条废钢数据 (${actualOffset + 1}-${actualOffset + processedData.length}/${total})`);

      return {
        data: processedData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
          currentBatch: `${actualOffset + 1}-${actualOffset + processedData.length}`
        }
      };
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
      const originalUrl = this.parseImageUrls(item.imgUrls);
      const progressiveUrls = originalUrl ? this.generateProgressiveUrls(originalUrl) : null;

      return {
        ...item,
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

  /**
   * 解析图片URL
   */
  private static parseImageUrls(imgUrls: any): string | null {
    if (!imgUrls) return null;

    try {
      if (typeof imgUrls === 'string') {
        if (imgUrls.trim().startsWith('[')) {
          const parsed = JSON.parse(imgUrls);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        }
        if (imgUrls.includes(',')) {
          const urls = imgUrls.split(',').map(url => url.trim()).filter(Boolean);
          return urls.length > 0 ? urls[0] : null;
        }
        return imgUrls.trim() || null;
      }

      if (Array.isArray(imgUrls)) {
        return imgUrls.length > 0 ? imgUrls[0] : null;
      }

      return null;
    } catch (error) {
      console.warn('解析图片 URL 失败:', error);
      return null;
    }
  }

  /**
   * 生成CDN压缩URL
   */
  private static generateProgressiveUrls(originalUrl: string): {
    tiny: string;
    small: string;
    medium: string;
    original: string;
  } {
    if (!originalUrl) {
      return { tiny: '', small: '', medium: '', original: '' };
    }

    const separator = originalUrl.includes('?') ? '&' : '?';

    return {
      tiny: `${originalUrl}${separator}w=48&h=48&q=10&format=webp&fit=cover`,
      small: `${originalUrl}${separator}w=80&h=80&q=25&format=webp&fit=cover`,
      medium: `${originalUrl}${separator}w=120&h=120&q=40&format=webp&fit=cover`,
      original: originalUrl
    };
  }
}
