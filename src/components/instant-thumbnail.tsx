'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface InstantThumbnailProps {
  progressiveUrls: {
    tiny: string;
    small: string;
    medium: string;
    original: string;
  };
  alt: string;
  className?: string;
  thumbnailSource?: 'database' | 'cdn';
}

export default function InstantThumbnail({ 
  progressiveUrls, 
  alt, 
  className = "",
  thumbnailSource = 'cdn'
}: InstantThumbnailProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // 优化的渐进式加载策略
  useEffect(() => {
    if (!progressiveUrls.tiny) return;

    let isCancelled = false;
    
    const loadSequence = async () => {
      try {
        // 如果是数据库缩略图（base64），立即显示
        if (thumbnailSource === 'database' && progressiveUrls.tiny.startsWith('data:')) {
          if (!isCancelled) {
            setCurrentSrc(progressiveUrls.tiny);
            setIsLoading(false);
          }
          
          // 延迟加载更高质量版本
          setTimeout(async () => {
            if (!isCancelled && progressiveUrls.small && progressiveUrls.small !== progressiveUrls.tiny) {
              setCurrentSrc(progressiveUrls.small);
            }
          }, 200);
          
          // 视口内才加载中等质量图片
          setTimeout(() => {
            if (!isCancelled && progressiveUrls.medium && imgRef.current) {
              const observer = new IntersectionObserver(
                (entries) => {
                  if (entries[0].isIntersecting) {
                    setCurrentSrc(progressiveUrls.medium);
                    observer.disconnect();
                  }
                },
                { threshold: 0.1 }
              );
              observer.observe(imgRef.current);
            }
          }, 500);
          
        } else {
          // CDN缩略图的渐进加载
          setCurrentSrc(progressiveUrls.tiny);
          setIsLoading(false);
          
          // 预加载后续版本
          if (progressiveUrls.small && progressiveUrls.small !== progressiveUrls.tiny) {
            const img = new Image();
            img.onload = () => {
              if (!isCancelled) {
                setCurrentSrc(progressiveUrls.small);
              }
            };
            img.src = progressiveUrls.small;
          }
        }
        
      } catch (error) {
        console.warn('图片加载失败:', error);
        if (!isCancelled) {
          setImageError(true);
          setIsLoading(false);
        }
      }
    };

    loadSequence();
    
    return () => {
      isCancelled = true;
    };
  }, [progressiveUrls, thumbnailSource]);

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  if (imageError || !progressiveUrls.tiny) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center`}>
        <span className="text-xs text-gray-400">无图片</span>
      </div>
    );
  }

  const handleThumbnailClick = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <>
      {/* 瞬间显示的缩略图 */}
      <div className="relative group">
        {isLoading && (
          <div className={`${className} bg-gray-200 dark:bg-gray-600 animate-pulse rounded-lg`}>
          </div>
        )}
        {currentSrc && (
          <img 
            ref={imgRef}
            src={currentSrc} 
            alt={alt}
            className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-all duration-200 cursor-pointer hover:opacity-90 hover:scale-105 shadow-sm hover:shadow-md rounded-lg object-cover`}
            onError={() => setImageError(true)}
            onLoad={() => setIsLoading(false)}
            onClick={handleThumbnailClick}
            title="点击查看大图"
            loading="eager" // 立即加载
          />
        )}
      </div>

      {/* 大图模态框 */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
          onClick={handleBackdropClick}
        >
          <div className="relative max-w-5xl max-h-full">
            {/* 关闭按钮 */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-60 text-white rounded-full p-3 hover:bg-opacity-80 transition-colors shadow-lg"
              title="关闭 (ESC)"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            
            {/* 高质量大图 */}
            <img 
              src={progressiveUrls.original} 
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
} 