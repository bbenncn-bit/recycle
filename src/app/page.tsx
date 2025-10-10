'use client';

import { useState, useEffect } from 'react';
import { getReceiptfcData } from './api/receiptfc/fetch';
import { getReceiptfgData } from './api/receiptfg/fetch';
import { getReceiptfgDataBatch } from './api/receiptfg/fetch-batch';
import { getReceiptfcDataBatch } from './api/receiptfc/fetch-batch';
import ProgressiveTableWithPagination from '../components/progressive-table-with-pagination';
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

export default function Page() {
  // 用于统计的数据（仅用于计算总数等统计信息）
  const [fcTotalData, setFcTotalData] = useState<TableData[]>([]);
  const [fgTotalData, setFgTotalData] = useState<TableData[]>([]);
  const [fcStatsLoading, setFcStatsLoading] = useState(true);
  const [fgStatsLoading, setFgStatsLoading] = useState(true);

  useEffect(() => {
    // 报废车统计数据加载（仅用于统计，使用原有API）
    const fetchFcStatsData = async () => {
      try {
        setFcStatsLoading(true);
        const result = await getReceiptfcData();
        setFcTotalData(result);
      } catch (error) {
        console.error('获取FC统计数据失败:', error);
        setFcTotalData([]);
      } finally {
        setFcStatsLoading(false);
      }
    };

    // 废钢统计数据加载（仅用于统计，使用原有API）
    const fetchFgStatsData = async () => {
      try {
        setFgStatsLoading(true);
        const result = await getReceiptfgData();
        setFgTotalData(result);
      } catch (error) {
        console.error('获取FG统计数据失败:', error);
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