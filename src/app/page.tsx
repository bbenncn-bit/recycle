'use client';

import { useState, useEffect } from 'react';
// 移除直接导入服务端函数，改为通过API路由获取数据
import { getReceiptfgDataBatch } from './api/receiptfg/fetch-batch';
import { getReceiptfcDataBatch } from './api/receiptfc/fetch-batch';
// import Component from "./disposal/auction/page";
import ProgressiveTableWithPagination from '../components/progressive-table-with-pagination';
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

export default function Page() {
  // 用于统计的数据（仅用于计算总数等统计信息）
  const [fcTotalData, setFcTotalData] = useState<TableData[]>([]);
  const [fgTotalData, setFgTotalData] = useState<TableData[]>([]);
  const [fcStatsLoading, setFcStatsLoading] = useState(true);
  const [fgStatsLoading, setFgStatsLoading] = useState(true);

  useEffect(() => {
    // 报废车统计数据加载（通过API路由）
    const fetchFcStatsData = async () => {
      try {
        setFcStatsLoading(true);
        const response = await fetch('/api/receiptfc');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
        }
        const result = await response.json();
        
        // 检查是否是错误响应
        if (result && result.error) {
          console.error('❌ API返回错误:', result.error);
          setFcTotalData([]);
          return;
        }
        
        // 确保 result 是数组
        if (Array.isArray(result)) {
          console.log('✅ FC统计数据获取成功:', result.length, '条记录');
          setFcTotalData(result);
        } else {
          console.warn('⚠️ FC数据格式不正确，期望数组，实际收到:', typeof result, result);
          setFcTotalData([]);
        }
      } catch (error) {
        console.error('❌ 获取FC统计数据失败:', error);
        setFcTotalData([]);
      } finally {
        setFcStatsLoading(false);
      }
    };

    // 废钢统计数据加载（通过API路由）
    const fetchFgStatsData = async () => {
      try {
        setFgStatsLoading(true);
        const response = await fetch('/api/receiptfg');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
        }
        const result = await response.json();
        
        // 检查是否是错误响应
        if (result && result.error) {
          console.error('❌ API返回错误:', result.error);
          setFgTotalData([]);
          return;
        }
        
        // 确保 result 是数组
        if (Array.isArray(result)) {
          console.log('✅ FG统计数据获取成功:', result.length, '条记录');
          setFgTotalData(result);
        } else {
          console.warn('⚠️ FG数据格式不正确，期望数组，实际收到:', typeof result, result);
          setFgTotalData([]);
        }
      } catch (error) {
        console.error('❌ 获取FG统计数据失败:', error);
        setFgTotalData([]);
      } finally {
        setFgStatsLoading(false);
      }
    };

    // 并行启动统计数据加载
    fetchFcStatsData();
    fetchFgStatsData();
  }, []);

  // 计算统计数据
  const getTotalAmount = () => {
    const fcAmount = fcStatsLoading ? 0 : fcTotalData.reduce((sum, item) => sum + Number(item.taxInclu || 0), 0);
    const fgAmount = fgStatsLoading ? 0 : fgTotalData.reduce((sum, item) => sum + Number(item.taxInclu || 0), 0);
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
        
        {/* FC 数据表 - 使用带分页的渐进式加载组件 */}
        <ProgressiveTableWithPagination
          title="报废车 数据"
          subtitle="最新日期的全天交易记录"
          bgColor="bg-white dark:bg-gray-800"
          fetchBatchData={getReceiptfcDataBatch}
          itemsPerPage={10}
        />
        
        {/* FG 数据表 - 使用带分页的渐进式加载组件 */}
        <ProgressiveTableWithPagination
          title="废钢铁 数据"
          subtitle="最新日期的全天交易记录"
          bgColor="bg-blue-50 dark:bg-gray-800"
          fetchBatchData={getReceiptfgDataBatch}
          itemsPerPage={10}
        />
        
        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {fcStatsLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                fcTotalData.length
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">报废车 交易记录</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {fgStatsLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                fgTotalData.length
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">废钢铁 交易记录</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {fcStatsLoading || fgStatsLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                fcTotalData.length + fgTotalData.length
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总交易记录</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {fcStatsLoading || fgStatsLoading ? (
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