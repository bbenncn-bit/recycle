'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import InstantThumbnail from './instant-thumbnail';
import dayjs from 'dayjs';

interface TableData {
  id: number;
  saleMemberId: string | null;
  saleMemberName: string | null;
  taxInclu: string | number | null;
  unitpriceIncluTax: string | number | null;
  wasteTypeName: string | null;
  weight: string | number | null;
  orderTime: Date | string | null;
  carNumber: string | null;
  carBrand: string | null;
  hasImage: boolean;
  progressiveUrls?: any;
  thumbnailSource?: 'database' | 'cdn';
}

interface ProgressiveTableProps {
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

// 加载更多按钮组件
function LoadMoreButton({ 
  isLoading, 
  hasMore, 
  onLoadMore, 
  loadedCount, 
  totalCount 
}: {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadedCount: number;
  totalCount: number;
}) {
  if (!hasMore) return null;

  return (
    <tr>
      <td colSpan={6} className="px-6 py-4 text-center">
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              加载中...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              加载更多 ({loadedCount}/{totalCount})
            </>
          )}
        </button>
      </td>
    </tr>
  );
}

export default function ProgressiveTable({
  title,
  subtitle,
  bgColor,
  fetchBatchData,
  itemsPerPage = 10
}: ProgressiveTableProps) {
  const [data, setData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: itemsPerPage,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  
  const isInitialMount = useRef(true);

  // 加载第一批数据
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🚀 开始加载${title}的第一批数据...`);
      const result = await fetchBatchData({ page: 1, limit: itemsPerPage });
      
      setData(result.data);
      setPagination(result.pagination);
      
      console.log(`✅ ${title}第一批数据加载完成: ${result.data.length} 条`);
      
      // 如果有更多数据，短暂延迟后自动加载第二批
      if (result.pagination.hasMore && result.data.length > 0) {
        setTimeout(() => {
          loadMoreData();
        }, 300);
      }
      
    } catch (err) {
      console.error(`❌ 加载${title}数据失败:`, err);
      setError(`加载${title}数据失败，请稍后重试`);
    } finally {
      setLoading(false);
    }
  }, [title, fetchBatchData, itemsPerPage]);

  // 加载更多数据
  const loadMoreData = useCallback(async () => {
    if (loadingMore || !pagination.hasMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;
      
      console.log(`🔄 加载${title}第${nextPage}批数据...`);
      const result = await fetchBatchData({ page: nextPage, limit: itemsPerPage });
      
      // 使用函数式更新确保数据正确合并
      setData(prev => [...prev, ...result.data]);
      setPagination(result.pagination);
      
      console.log(`✅ ${title}第${nextPage}批数据加载完成: +${result.data.length} 条`);
      
    } catch (err) {
      console.error(`❌ 加载更多${title}数据失败:`, err);
      // 不显示错误，静默失败，用户可以重试
    } finally {
      setLoadingMore(false);
    }
  }, [title, fetchBatchData, itemsPerPage, pagination, loadingMore]);

  // 初始加载
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadInitialData();
    }
  }, [loadInitialData]);

  // 如果正在加载第一批数据，显示完整骨架屏
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
              {Array.from({ length: 5 }).map((_, i) => (
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
              onClick={loadInitialData} 
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
          {subtitle} {pagination.total > 0 && `(已加载 ${data.length}/${pagination.total} 条记录)`}
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
            {data.map((row, index) => (
              <tr 
                key={`${row.id}-${index}`} 
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
            ))}
            
            {/* 加载更多行的骨架屏 */}
            {loadingMore && Array.from({ length: Math.min(3, itemsPerPage) }).map((_, i) => (
              <RowSkeleton key={`skeleton-${i}`} />
            ))}
            
            {/* 加载更多按钮 */}
            <LoadMoreButton
              isLoading={loadingMore}
              hasMore={pagination.hasMore}
              onLoadMore={loadMoreData}
              loadedCount={data.length}
              totalCount={pagination.total}
            />
          </tbody>
        </table>
      </div>
      
      {data.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">暂无数据</p>
            <p className="mt-2">目前没有可显示的交易记录</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 添加CSS动画类
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
`;

// 动态注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 