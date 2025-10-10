'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import InstantThumbnail from './instant-thumbnail';
import dayjs from 'dayjs';

interface TableData {
  id: number;
  saleMemberId: string;
  saleMemberName: string;
  taxInclu: string | number;
  unitpriceIncluTax: string | number;
  wasteTypeName: string;
  weight: string | number;
  orderTime: string;
  carNumber: string;
  carBrand: string;
  hasImage: boolean;
  progressiveUrls?: any;
  thumbnailSource?: 'database' | 'cdn';
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

interface ProgressiveTableWithPaginationProps {
  title: string;
  subtitle: string;
  bgColor: string;
  fetchBatchData: (params: { page: number; limit: number }) => Promise<{
    data: TableData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
      currentBatch?: string;
    };
  }>;
  itemsPerPage?: number;
}

// 单行骨架屏组件
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="h-15 w-15 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </td>
    </tr>
  );
}

// 分页组件
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = (): (number | string)[] => {
    const delta = 2;
    const range = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      if (totalPages > 1) rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 rounded-b-lg">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            显示第 <span className="font-medium">{startItem}</span> 到 <span className="font-medium">{endItem}</span> 条，
            共 <span className="font-medium">{totalItems}</span> 条记录
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="分页">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">上一页</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            
            {getPageNumbers().map((pageNum, idx) => (
              pageNum === '...' ? (
                <span
                  key={`dots-${idx}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:outline-offset-0"
                >
                  ...
                </span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(Number(pageNum))}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:z-20 focus:outline-offset-0 ${
                    currentPage === pageNum
                      ? 'bg-blue-300 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : 'text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              )
            ))}
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">下一页</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function ProgressiveTableWithPagination({
  title,
  subtitle,
  bgColor,
  fetchBatchData,
  itemsPerPage = 10
}: ProgressiveTableWithPaginationProps) {
  const [currentPageData, setCurrentPageData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: itemsPerPage,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  
  // 用于缓存已加载的页面数据
  const pageCache = useRef<{ [key: number]: TableData[] }>({});
  const isInitialMount = useRef(true);

  // 加载指定页面的数据
  const loadPageData = useCallback(async (page: number, showPageLoading = true) => {
    try {
      // 如果数据已缓存，直接使用
      if (pageCache.current[page]) {
        setCurrentPageData(pageCache.current[page]);
        setCurrentPage(page);
        return;
      }

      if (showPageLoading && page !== 1) {
        setPageLoading(true);
      } else if (page === 1) {
        setLoading(true);
      }
      
      setError(null);
      
      console.log(`🚀 开始加载${title}第${page}页数据...`);
      const result = await fetchBatchData({ page, limit: itemsPerPage });
      
      // 缓存数据
      pageCache.current[page] = result.data;
      
      setCurrentPageData(result.data);
      setPagination(result.pagination);
      setCurrentPage(page);
      
      console.log(`✅ ${title}第${page}页数据加载完成: ${result.data.length} 条`);
      
    } catch (err) {
      console.error(`❌ 加载${title}第${page}页数据失败:`, err);
      setError(`加载第${page}页数据失败，请稍后重试`);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [title, fetchBatchData, itemsPerPage]);

  // 仅用于预加载的函数（不会更改当前页面状态）
  const preloadPageData = useCallback(async (page: number) => {
    try {
      // 如果数据已缓存，跳过
      if (pageCache.current[page]) {
        return;
      }
      
      console.log(`🔄 后台预加载${title}第${page}页数据...`);
      const result = await fetchBatchData({ page, limit: itemsPerPage });
      
      // 仅缓存数据，不更改当前页面状态
      pageCache.current[page] = result.data;
      
      console.log(`✅ ${title}第${page}页数据预加载完成: ${result.data.length} 条`);
      
    } catch (err) {
      console.warn(`⚠️ 预加载${title}第${page}页数据失败:`, err);
    }
  }, [title, fetchBatchData, itemsPerPage]);

  // 处理页面切换
  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage && page >= 1 && page <= pagination.totalPages) {
      loadPageData(page);
    }
  }, [currentPage, pagination.totalPages, loadPageData]);

  // 初始加载第一页
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadPageData(1, false);
    }
  }, [loadPageData]);

  // 后台预加载策略（在第一页加载完成后，预加载第2-3页）
  useEffect(() => {
    if (!loading && currentPage === 1 && pagination.totalPages > 1) {
      // 延迟预加载第2页和第3页
      setTimeout(() => {
        if (pagination.totalPages >= 2 && !pageCache.current[2]) {
          preloadPageData(2).catch(() => {}); // 静默失败
        }
      }, 1000);
      
      setTimeout(() => {
        if (pagination.totalPages >= 3 && !pageCache.current[3]) {
          preloadPageData(3).catch(() => {}); // 静默失败
        }
      }, 2000);
    }
  }, [loading, currentPage, pagination.totalPages, loadPageData, preloadPageData]);

  // 如果正在加载第一页，显示完整骨架屏
  if (loading) {
    return (
      <div className={`${bgColor} shadow-xl rounded-lg overflow-hidden mb-8`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: Math.min(5, itemsPerPage) }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 如果有错误，显示错误状态
  if (error) {
    return (
      <div className={`${bgColor} shadow-xl rounded-lg overflow-hidden mb-8`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-medium">{error}</p>
            <button 
              onClick={() => loadPageData(1, false)} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgColor} shadow-xl rounded-lg overflow-hidden mb-8 stable-scrollbar`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {subtitle} (第 {currentPage}/{pagination.totalPages} 页，共 {pagination.total} 条记录)
          {pageLoading && (
            <span className="ml-2 inline-flex items-center">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1 inline-block"></span>
              加载中...
            </span>
          )}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                序号
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                关键信息
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                类型/重量
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                价格信息
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                供应商
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                时间
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {/* 页面切换时的加载骨架屏 */}
            {pageLoading ? (
              Array.from({ length: Math.min(itemsPerPage, 10) }).map((_, i) => (
                <RowSkeleton key={`loading-${i}`} />
              ))
            ) : (
              currentPageData.map((row, index) => (
                <tr 
                  key={`${row.id}-${currentPage}-${index}`} 
                  className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 opacity-0 animate-fadeIn`}
                  style={{ 
                    animationDelay: `${Math.min(index * 50, 500)}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {row.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {row.hasImage && row.progressiveUrls && (
                        <div className="flex-shrink-0">
                          <InstantThumbnail 
                            progressiveUrls={row.progressiveUrls}
                            alt="交易图片"
                            className="h-15 w-15 rounded-lg object-cover border border-gray-200 dark:border-gray-600 shadow-xl"
                            thumbnailSource={row.thumbnailSource}
                          />
                        </div>
                      )}
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{row.carNumber}</div>
                        <div className="text-gray-500 dark:text-gray-400">{row.carBrand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mb-1">
                        {row.wasteTypeName}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">重量: {parseFloat(String(row.weight)).toFixed(3)}T</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">总价: ¥{(Math.round(Number(row.taxInclu || 0)/1.01*0.9945)).toFixed(2)}</div>
                      <div className="text-gray-500 dark:text-gray-400">单价: ¥{(Math.round(Number(row.unitpriceIncluTax || 0)/1.01*0.9945)).toFixed(2)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{row.saleMemberName}</div>
                      <div className="text-gray-500 dark:text-gray-400">ID: {row.saleMemberId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div>
                      <div className="font-medium">
                        {dayjs(row.orderTime).format('YYYY-MM-DD')}
                      </div>
                      <div className="text-xs">
                        {dayjs(row.orderTime).format('HH:mm:ss')}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {currentPageData.length === 0 && !pageLoading && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">暂无数据</p>
            <p className="mt-2">目前没有可显示的交易记录</p>
          </div>
        </div>
      )}
      
      <Pagination
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        totalItems={pagination.total}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}

// 添加CSS动画类和滚动条稳定样式
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
  
  /* 防止滚动条抖动的样式 */
  .stable-scrollbar {
    overflow-y: scroll !important;
    scrollbar-gutter: stable;
  }
  
  /* 为不同浏览器提供滚动条稳定性 */
  html {
    overflow-y: scroll;
    scrollbar-gutter: stable;
  }
  
  /* 确保页面内容区域宽度稳定 */
  body {
    overflow-x: hidden;
  }
`;

// 动态注入样式
if (typeof document !== 'undefined') {
  // 检查是否已经注入过样式，避免重复
  const existingStyle = document.getElementById('progressive-table-styles');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'progressive-table-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // 确保html元素有稳定的滚动条
    document.documentElement.style.overflowY = 'scroll';
    document.documentElement.style.scrollbarGutter = 'stable';
  }
} 