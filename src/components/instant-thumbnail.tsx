'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  
  // 新增模态框相关状态
  const [modalImageSrc, setModalImageSrc] = useState<string>('');
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);

  // 确保只在客户端渲染Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // 调试信息
  useEffect(() => {
    console.log('InstantThumbnail progressiveUrls:', progressiveUrls);
    console.log('InstantThumbnail showModal:', showModal);
  }, [progressiveUrls, showModal]);

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

  // 模态框原始图片加载逻辑
  useEffect(() => {
    if (!showModal) {
      setIsLoadingOriginal(false);
      setOriginalLoaded(false);
      setModalImageSrc(''); // 清空模态框图片源
      return;
    }

    // 检查progressiveUrls是否有效
    if (!progressiveUrls || !progressiveUrls.original) {
      console.warn('progressiveUrls无效，关闭模态框');
      setShowModal(false);
      return;
    }

    // 模态框打开时，先显示中等质量图片，同时开始加载原始图片
    const bestAvailableImage = progressiveUrls.medium || progressiveUrls.small || currentSrc;
    
    console.log('模态框打开，最佳可用图片:', bestAvailableImage);
    console.log('原始图片URL:', progressiveUrls.original);
    
    // 确保有有效的图片URL才设置
    if (bestAvailableImage && bestAvailableImage.trim() !== '') {
      setModalImageSrc(bestAvailableImage);
      setIsLoadingOriginal(true);
      setOriginalLoaded(false);

      // 在后台加载原始图片
      const img = new Image();
      img.onload = () => {
        console.log('原始图片加载成功');
        setIsLoadingOriginal(false);
        // 先切换到原始图片源，但保持originalLoaded为false以触发过渡动画
        setTimeout(() => {
          setModalImageSrc(progressiveUrls.original);
          // 短暂延迟后设置为已加载，触发从模糊到清晰的过渡
          setTimeout(() => {
            setOriginalLoaded(true);
          }, 100);
        }, 200);
      };
      img.onerror = () => {
        console.error('原始图片加载失败:', progressiveUrls.original);
        setIsLoadingOriginal(false);
        console.warn('原始图片加载失败，保持使用中等质量图片');
      };
      img.src = progressiveUrls.original;
    } else {
      // 如果没有可用的图片，关闭模态框
      setShowModal(false);
      console.warn('没有可用的图片URL');
    }

  }, [showModal, progressiveUrls, currentSrc]);

  if (imageError || !progressiveUrls.tiny) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center`}>
        <span className="text-xs text-gray-400">无图片</span>
      </div>
    );
  }

  const handleThumbnailClick = () => {
    console.log('缩略图被点击，progressiveUrls:', progressiveUrls);
    console.log('将showModal设置为true');
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

  // 模态框组件
  const Modal = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4"
      style={{ 
        zIndex: 999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
      onClick={handleBackdropClick}
    >
      {/* 关闭按钮 - 只在图片加载完成后显示 */}
      {originalLoaded && modalImageSrc === progressiveUrls.original && (
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 bg-black bg-opacity-60 text-white rounded-full p-3 hover:bg-opacity-80 transition-colors shadow-lg"
          style={{ zIndex: 999999 }}
          title="关闭 (ESC)"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      )}
      
      {/* 加载指示器 - 图片正上方，只有转圈圈 */}
      {isLoadingOriginal && (
        <div 
          className="absolute flex items-center justify-center"
          style={{ 
            zIndex: 999999,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, calc(-50% - 45vh))', // 放在图片正上方
            marginBottom: '1rem'
          }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent opacity-90"></div>
        </div>
      )}
      
      {/* 图片容器 - 强制大尺寸显示 */}
      {modalImageSrc && modalImageSrc.trim() !== '' ? (
        <img 
          src={modalImageSrc === progressiveUrls.original ? progressiveUrls.original : modalImageSrc} 
          alt={alt}
          className="object-contain rounded-lg shadow-2xl"
          style={{
            width: '80vw',
            height: '80vh',
            filter: originalLoaded && modalImageSrc === progressiveUrls.original 
              ? 'none' 
              : isLoadingOriginal 
                ? 'blur(4px) brightness(0.9) contrast(1.1)' 
                : 'blur(3px) brightness(0.95)',
            transform: originalLoaded && modalImageSrc === progressiveUrls.original 
              ? 'scale(1)' 
              : 'scale(1.01)',
            opacity: originalLoaded && modalImageSrc === progressiveUrls.original ? 1 : 0.9,
            transition: 'all 1500ms ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div 
          className="bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center"
          style={{ 
            width: '80vw', 
            height: '80vh'
          }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
            <span className="text-gray-500 dark:text-gray-400">图片加载中...</span>
          </div>
        </div>
      )}
    </div>
  );

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

      {/* 使用Portal渲染大图模态框到body */}
      {showModal && mounted && createPortal(<Modal />, document.body)}
    </>
  );
} 