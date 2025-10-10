'use server';

import { pool } from '@/lib/db';

interface BatchParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export async function getReceiptfgDataBatch({ page = 1, limit = 10, offset }: BatchParams = {}) {
  try {
    // 计算实际的偏移量
    const actualOffset = offset !== undefined ? offset : (page - 1) * limit;
    
    console.log(`🔄 获取废钢数据 - 页码: ${page}, 限制: ${limit}, 偏移: ${actualOffset}`);
    
    // 首先检查优化视图是否存在
    const [viewExists] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_schema = DATABASE() 
      AND table_name = 'v_receiptfg_with_thumbnails'
    `);
    
    const hasOptimizedView = (viewExists as any[])[0]?.count > 0;
    
    // 获取最新日期
    const [latestDateResult] = await pool.query(`
      SELECT DATE(orderTime) as latestDate 
      FROM ${hasOptimizedView ? 'v_receiptfg_with_thumbnails' : 'receiptfg'}
      WHERE orderTime IS NOT NULL 
      ORDER BY orderTime DESC 
      LIMIT 1
    `);
    
    const latestDate = (latestDateResult as any[])[0]?.latestDate;
    
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

    let rows, totalCountResult;
    
    if (hasOptimizedView) {
      // 使用优化视图进行分批查询
      [rows] = await pool.query(`
        SELECT 
          id, saleMemberId, saleMemberName, taxInclu, unitpriceIncluTax,
          wasteTypeName, imgUrls, weight, orderTime, carNumber,
          carBrand, createTime, queryDate,
          tinyThumbnail, smallThumbnail, mediumThumbnail, thumbnailProcessed
        FROM v_receiptfg_with_thumbnails 
        WHERE DATE(orderTime) = ? 
        ORDER BY orderTime DESC, id DESC
        LIMIT ? OFFSET ?
      `, [latestDate, limit, actualOffset]);
      
      // 获取总数
      [totalCountResult] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM v_receiptfg_with_thumbnails 
        WHERE DATE(orderTime) = ?
      `, [latestDate]);
    } else {
      // 检查表是否有缩略图字段
      const [columnExists] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'receiptfg' 
        AND column_name = 'tinyThumbnail'
      `);
      
      const hasThumbnailColumns = (columnExists as any[])[0]?.count > 0;
      
      if (hasThumbnailColumns) {
        [rows] = await pool.query(`
          SELECT 
            id, saleMemberId, saleMemberName, taxInclu, unitpriceIncluTax,
            wasteTypeName, imgUrls, weight, orderTime, carNumber,
            carBrand, createTime, queryDate,
            tinyThumbnail, smallThumbnail, mediumThumbnail, thumbnailProcessed
          FROM receiptfg 
          WHERE DATE(orderTime) = ? 
          ORDER BY orderTime DESC, id DESC
          LIMIT ? OFFSET ?
        `, [latestDate, limit, actualOffset]);
      } else {
        [rows] = await pool.query(`
          SELECT 
            id, saleMemberId, saleMemberName, taxInclu, unitpriceIncluTax,
            wasteTypeName, imgUrls, weight, orderTime, carNumber,
            carBrand, createTime, queryDate
          FROM receiptfg 
          WHERE DATE(orderTime) = ? 
          ORDER BY orderTime DESC, id DESC
          LIMIT ? OFFSET ?
        `, [latestDate, limit, actualOffset]);
      }
      
      // 获取总数
      [totalCountResult] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM receiptfg 
        WHERE DATE(orderTime) = ?
      `, [latestDate]);
    }
    
    const total = (totalCountResult as any[])[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    
    // 数据预处理
    const processedData = (rows as any[]).map(item => {
      // 如果数据库中已有预生成的缩略图，直接使用
      if ((hasOptimizedView || item.hasOwnProperty('tinyThumbnail')) && 
          item.thumbnailProcessed && 
          item.tinyThumbnail) {
        return {
          ...item,
          originalImageUrl: parseImageUrls(item.imgUrls),
          thumbnailUrl: item.tinyThumbnail,
          smallThumbnailUrl: item.smallThumbnail,
          mediumThumbnailUrl: item.mediumThumbnail,
          progressiveUrls: {
            tiny: item.tinyThumbnail,
            small: item.smallThumbnail,
            medium: item.mediumThumbnail,
            original: parseImageUrls(item.imgUrls) || ''
          },
          hasImage: !!item.tinyThumbnail,
          thumbnailSource: 'database'
        };
      } else {
        // 降级到CDN压缩策略
        const originalUrl = parseImageUrls(item.imgUrls);
        const progressiveUrls = originalUrl ? generateProgressiveUrls(originalUrl) : null;
        
        return {
          ...item,
          originalImageUrl: originalUrl,
          thumbnailUrl: progressiveUrls?.tiny || null,
          smallThumbnailUrl: progressiveUrls?.small || null,
          mediumThumbnailUrl: progressiveUrls?.medium || null,
          progressiveUrls,
          hasImage: !!originalUrl,
          thumbnailSource: 'cdn'
        };
      }
    });
    
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
    console.error('❌ 分批获取receiptfg数据失败:', error);
    throw error;
  }
}

// 解析图片URL的辅助函数
function parseImageUrls(imgUrls: any): string | null {
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

// 生成CDN压缩URL的函数
function generateProgressiveUrls(originalUrl: string): {
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