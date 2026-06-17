// 服务端图片处理工具
export interface ImageProcessingConfig {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

// 生成缩略图URL的智能策略 - 激进压缩至2%大小
export function generateThumbnailUrl(
  originalUrl: string, 
  config: ImageProcessingConfig = {}
): string {
  // 2%压缩策略：尺寸缩小到14% (√0.02 ≈ 0.14) + 质量10%
  const { quality = 10, width = 48, height = 48, format = 'webp' } = config;
  
  if (!originalUrl) return '';
  
  try {
    // 检测CDN类型并生成对应的缩略图URL
    const url = new URL(originalUrl);
    const separator = originalUrl.includes('?') ? '&' : '?';
    
    // 阿里云OSS - 激进压缩
    if (url.hostname.includes('aliyuncs.com')) {
      return `${originalUrl}${separator}x-oss-process=image/resize,w_${width},h_${height},m_fill/quality,q_${quality}/format,${format}/interlace,1`;
    }
    
    // 腾讯云COS - 激进压缩
    if (url.hostname.includes('myqcloud.com')) {
      return `${originalUrl}${separator}imageMogr2/thumbnail/${width}x${height}!/quality/${quality}/format/${format}/interlace/1`;
    }
    
    // 七牛云 - 激进压缩
    if (url.hostname.includes('qiniudn.com') || url.hostname.includes('clouddn.com')) {
      return `${originalUrl}${separator}imageView2/1/w/${width}/h/${height}/q/${quality}/format/${format}/interlace/1`;
    }
    
    // 又拍云 - 激进压缩
    if (url.hostname.includes('upaiyun.com')) {
      return `${originalUrl}${separator}!/fw/${width}/fh/${height}/quality/${quality}/format/${format}`;
    }
    
    // 通用参数 - 激进压缩
    return `${originalUrl}${separator}w=${width}&h=${height}&q=${quality}&format=${format}&fit=cover&auto=compress`;
  } catch (error) {
    // URL解析失败时，使用备用压缩策略
    console.warn('URL解析失败，使用备用压缩策略:', error);
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}w=${width}&h=${height}&q=${quality}&format=webp&fit=cover&auto=compress`;
  }
}

// 生成多级压缩URL（用于渐进加载）
export function generateProgressiveUrls(originalUrl: string): {
  tiny: string;     // 2% - 极小缩略图
  small: string;    // 5% - 小缩略图  
  medium: string;   // 15% - 中等缩略图
  original: string; // 原图
} {
  if (!originalUrl) {
    return { tiny: '', small: '', medium: '', original: '' };
  }
  
  return {
    tiny: generateThumbnailUrl(originalUrl, { quality: 10, width: 48, height: 48 }),
    small: generateThumbnailUrl(originalUrl, { quality: 20, width: 80, height: 80 }),
    medium: generateThumbnailUrl(originalUrl, { quality: 40, width: 120, height: 120 }),
    original: originalUrl
  };
}

// 解析图片数组中的第一个有效 URL
function normalizeImageUrlEntry(entry: unknown): string | null {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const s = entry.trim();
    if (!s || s === 'null' || s === 'undefined' || s === '[]') return null;
    return s;
  }
  if (typeof entry === 'object') {
    const obj = entry as Record<string, unknown>;
    const candidate = obj.url ?? obj.imgUrl ?? obj.imageUrl ?? obj.src;
    if (typeof candidate === 'string') return normalizeImageUrlEntry(candidate);
  }
  return null;
}

export function parseImageUrls(imgUrls: unknown): string | null {
  if (!imgUrls) return null;

  try {
    if (typeof imgUrls === 'string') {
      const trimmed = imgUrls.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[]') {
        return null;
      }
      if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed) as unknown;
        if (!Array.isArray(parsed)) return null;
        for (const entry of parsed) {
          const url = normalizeImageUrlEntry(entry);
          if (url) return url;
        }
        return null;
      }
      if (trimmed.includes(',')) {
        for (const part of trimmed.split(',')) {
          const url = normalizeImageUrlEntry(part);
          if (url) return url;
        }
        return null;
      }
      return normalizeImageUrlEntry(trimmed);
    }

    if (Array.isArray(imgUrls)) {
      for (const entry of imgUrls) {
        const url = normalizeImageUrlEntry(entry);
        if (url) return url;
      }
    }

    return null;
  } catch (error) {
    console.warn('解析图片 URL 失败:', error);
    return null;
  }
}

// 预生成缩略图数据（服务端使用）- 包含多级压缩
export function preprocessImageData(data: any[]): any[] {
  return data.map(item => {
    const originalUrl = parseImageUrls(item.imgUrls);
    const progressiveUrls = originalUrl ? generateProgressiveUrls(originalUrl) : null;
    
    return {
      ...item,
      originalImageUrl: originalUrl,
      thumbnailUrl: progressiveUrls?.tiny || null,  // 使用最小的2%压缩图
      smallThumbnailUrl: progressiveUrls?.small || null,
      mediumThumbnailUrl: progressiveUrls?.medium || null,
      progressiveUrls,
      hasImage: !!originalUrl
    };
  });
} 