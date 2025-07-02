'use client';

import { useState, useEffect } from 'react';
import { getReceiptfcData } from './api/receiptfc/fetch';
import { getReceiptfgData } from './api/receiptfg/fetch';
import InstantThumbnail from '../components/instant-thumbnail';
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

// 骨架屏组件
function TableSkeleton({ bgColor }: { bgColor: string }) {
  return (
    <div className={`${bgColor} shadow-xl rounded-lg overflow-hidden mb-8 animate-pulse`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-600">
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
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          <div className="flex space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 加载状态指示器
function LoadingIndicator({ tableName }: { tableName: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          正在加载 {tableName} 数据...
        </span>
      </div>
    </div>
  );
}

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
                      ? 'bg-blue-200 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
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

export default function Page() {
  const [fcData, setFcData] = useState<TableData[]>([]);
  const [fgData, setFgData] = useState<TableData[]>([]);
  const [fcCurrentPage, setFcCurrentPage] = useState(1);
  const [fgCurrentPage, setFgCurrentPage] = useState(1);
  const [fcLoading, setFcLoading] = useState(true);
  const [fgLoading, setFgLoading] = useState(true);
  const [fcError, setFcError] = useState<string | null>(null);
  const [fgError, setFgError] = useState<string | null>(null);
  
  const itemsPerPage = 10;

  useEffect(() => {
    // 并行加载，但独立处理每个数据源
    const fetchFcData = async () => {
      try {
        setFcLoading(true);
        const result = await getReceiptfcData();
        setFcData(result);
        setFcError(null);
      } catch (error) {
        console.error('获取FC数据失败:', error);
        setFcError('加载报废车数据失败，请稍后重试');
      } finally {
        setFcLoading(false);
      }
    };

    const fetchFgData = async () => {
      try {
        setFgLoading(true);
        const result = await getReceiptfgData();
        setFgData(result);
        setFgError(null);
      } catch (error) {
        console.error('获取FG数据失败:', error);
        setFgError('加载废钢数据失败，请稍后重试');
      } finally {
        setFgLoading(false);
      }
    };

    // 并行启动，独立完成
    fetchFcData();
    fetchFgData();
  }, []);

  const renderTable = (
    data: TableData[], 
    tableTitle: string, 
    tableSubtitle: string, 
    bgColor: string,
    currentPage: number,
    onPageChange: (page: number) => void,
    loading: boolean,
    error: string | null
  ) => {
    // 如果正在加载，显示骨架屏
    if (loading) {
      return (
        <div>
          <TableSkeleton bgColor={bgColor} />
        </div>
      );
    }

    // 如果有错误，显示错误状态
    if (error) {
      return (
        <div className={`${bgColor} shadow-xl rounded-lg overflow-hidden mb-8`}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{tableTitle}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{tableSubtitle}</p>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 dark:text-red-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-lg font-medium">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                重新加载
              </button>
            </div>
          </div>
        </div>
      );
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);

    return (
      <div className={`${bgColor} shadow-xl rounded-lg overflow-hidden mb-8`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{tableTitle}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {tableSubtitle} (总计 {data.length} 条记录)
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
              {currentData.map((row, index) => (
                <tr key={row.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group`}>
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
            </tbody>
          </table>
        </div>
        
        {data.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              <p className="text-lg font-medium">暂无数据</p>
              <p className="mt-2">目前没有可显示的交易记录</p>
            </div>
          </div>
        )}
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={data.length}
          itemsPerPage={itemsPerPage}
        />
      </div>
    );
  };

  // 计算统计数据，只有当数据加载完成且无错误时才计算
  const getTotalAmount = () => {
    const fcAmount = fcLoading || fcError ? 0 : fcData.reduce((sum, item) => sum + Number(item.taxInclu || 0), 0);
    const fgAmount = fgLoading || fgError ? 0 : fgData.reduce((sum, item) => sum + Number(item.taxInclu || 0), 0);
    return fcAmount + fgAmount;
  };

  return (
    <main className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">再生资源交易数据表</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            查看每天再生资源交易记录和详细信息
          </p>
        </div>
        
        {/* FC 数据表 */}
        {renderTable(
          fcData, 
          "报废车 数据", 
          `最新日期的全天交易记录`,
          "bg-white dark:bg-gray-800",
          fcCurrentPage,
          setFcCurrentPage,
          fcLoading,
          fcError
        )}
        
        {/* FG 数据表 */}
        {renderTable(
          fgData, 
          "废钢铁 数据", 
          `最新日期的全天交易记录`,
          "bg-blue-50 dark:bg-gray-800",
          fgCurrentPage,
          setFgCurrentPage,
          fgLoading,
          fgError
        )}
        
        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {fcLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                fcData.length
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">报废车 交易记录</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {fgLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                fgData.length
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">废钢铁 交易记录</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {fcLoading || fgLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                fcData.length + fgData.length
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总交易记录</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {fcLoading || fgLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                `¥${getTotalAmount().toLocaleString()}`
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总交易金额</div>
          </div>
        </div>
      </div>
    </main>
  );
}