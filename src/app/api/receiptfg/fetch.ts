'use server';

import { pool } from '@/lib/db';
import { preprocessImageData } from '@/lib/image-utils';

export async function getReceiptfgData() {
  try {
    // 首先检查优化视图是否存在
    const [viewExists] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_schema = DATABASE() 
      AND table_name = 'v_receiptfg_with_thumbnails'
    `);
    
    const hasOptimizedView = (viewExists as any[])[0]?.count > 0;
    
    let rows;
    
    if (hasOptimizedView) {
      // 使用优化的视图查询，先获取最新日期，然后获取该日期的全部数据
      const [latestDateResult] = await pool.query(`
        SELECT DATE(orderTime) as latestDate 
        FROM v_receiptfg_with_thumbnails 
        WHERE orderTime IS NOT NULL 
        ORDER BY orderTime DESC 
        LIMIT 1
      `);
      
      const latestDate = (latestDateResult as any[])[0]?.latestDate;
      
      if (latestDate) {
        [rows] = await pool.query(`
          SELECT 
            id, saleMemberId, saleMemberName, taxInclu, unitpriceIncluTax,
            wasteTypeName, imgUrls, weight, orderTime, carNumber,
            carBrand, createTime, queryDate,
            tinyThumbnail, smallThumbnail, mediumThumbnail, thumbnailProcessed
          FROM v_receiptfg_with_thumbnails 
          WHERE DATE(orderTime) = ? 
          ORDER BY orderTime DESC
        `, [latestDate]);
      } else {
        // 如果没有找到日期，返回空数组
        rows = [];
      }
    } else {
      // 回退到原始表结构，但尝试直接从表中获取缩略图字段
      console.log('⚠️  优化视图不存在，尝试直接从表获取缩略图字段');
      
      // 检查表是否有缩略图字段
      const [columnExists] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'receiptfg' 
        AND column_name = 'tinyThumbnail'
      `);
      
      const hasThumbnailColumns = (columnExists as any[])[0]?.count > 0;
      
      // 先获取最新日期
      const [latestDateResult] = await pool.query(`
        SELECT DATE(orderTime) as latestDate 
        FROM receiptfg 
        WHERE orderTime IS NOT NULL 
        ORDER BY orderTime DESC 
        LIMIT 1
      `);
      
      const latestDate = (latestDateResult as any[])[0]?.latestDate;
      
      if (latestDate) {
        if (hasThumbnailColumns) {
          [rows] = await pool.query(`
            SELECT 
              id, saleMemberId, saleMemberName, taxInclu, unitpriceIncluTax,
              wasteTypeName, imgUrls, weight, orderTime, carNumber,
              carBrand, createTime, queryDate,
              tinyThumbnail, smallThumbnail, mediumThumbnail, thumbnailProcessed
            FROM receiptfg 
            WHERE DATE(orderTime) = ? 
            ORDER BY orderTime DESC
          `, [latestDate]);
        } else {
          [rows] = await pool.query(`
            SELECT 
              id, saleMemberId, saleMemberName, taxInclu, unitpriceIncluTax,
              wasteTypeName, imgUrls, weight, orderTime, carNumber,
              carBrand, createTime, queryDate
            FROM receiptfg 
            WHERE DATE(orderTime) = ? 
            ORDER BY orderTime DESC
          `, [latestDate]);
        }
      } else {
        // 如果没有找到日期，返回空数组
        rows = [];
      }
    }
    
    // 增强的数据预处理：优先使用数据库缩略图
    const processedData = (rows as any[]).map(item => {
      // 如果数据库中已有预生成的缩略图，直接使用
      if ((hasOptimizedView || item.hasOwnProperty('tinyThumbnail')) && 
          item.thumbnailProcessed && 
          item.tinyThumbnail) {
        return {
          ...item,
          originalImageUrl: parseImageUrls(item.imgUrls),
          thumbnailUrl: item.tinyThumbnail, // 数据库中的base64缩略图
          smallThumbnailUrl: item.smallThumbnail,
          mediumThumbnailUrl: item.mediumThumbnail,
          progressiveUrls: {
            tiny: item.tinyThumbnail, // 瞬间显示的base64图片
            small: item.smallThumbnail,
            medium: item.mediumThumbnail,
            original: parseImageUrls(item.imgUrls) || ''
          },
          hasImage: !!item.tinyThumbnail,
          thumbnailSource: 'database' // 标记缩略图来源
        };
      } else {
        // 降级到原有的CDN压缩策略
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
          thumbnailSource: 'cdn' // 标记缩略图来源
        };
      }
    });
    
    return processedData;
    
  } catch (error) {
    console.error('❌ 获取receiptfg数据失败:', error);
    throw error;
  }
}

// 解析图片URL的辅助函数
function parseImageUrls(imgUrls: any): string | null {
  if (!imgUrls) return null;
  
  try {
    // 如果是字符串，尝试解析为JSON数组
    if (typeof imgUrls === 'string') {
      // 处理可能的JSON字符串
      if (imgUrls.trim().startsWith('[')) {
        const parsed = JSON.parse(imgUrls);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      }
      // 处理逗号分隔的字符串
      if (imgUrls.includes(',')) {
        const urls = imgUrls.split(',').map(url => url.trim()).filter(Boolean);
        return urls.length > 0 ? urls[0] : null;
      }
      // 单个URL字符串
      return imgUrls.trim() || null;
    }
    
    // 如果已经是数组
    if (Array.isArray(imgUrls)) {
      return imgUrls.length > 0 ? imgUrls[0] : null;
    }
    
    return null;
  } catch (error) {
    console.warn('解析图片 URL 失败:', error);
    return null;
  }
}

// 生成CDN压缩URL的函数（作为备用）
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