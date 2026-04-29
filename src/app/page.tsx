'use client';

import { useEffect, useState } from 'react';
import { getReceiptfgDataBatch } from './api/receiptfg/fetch-batch';
import { getReceiptfcDataBatch } from './api/receiptfc/fetch-batch';
import ProgressiveTableWithPagination from '../components/progressive-table-with-pagination';
import { getHomeDateOptions, HOME_DEFAULT_DATE_KEY } from '@/lib/receipt-home-dates';

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
  /** 在浏览器挂载后再生成本月日期，避免 SSR 与客户端时区不一致导致水合异常或长期停在等待态 */
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [datesReady, setDatesReady] = useState(false);

  useEffect(() => {
    const keys = getHomeDateOptions();
    setDateOptions(keys);
    setSelectedDate(HOME_DEFAULT_DATE_KEY);
    setDatesReady(true);
  }, []);

  const [fcTotalData, setFcTotalData] = useState<TableData[]>([]);
  const [fgTotalData, setFgTotalData] = useState<TableData[]>([]);
  const [fcStatsLoading, setFcStatsLoading] = useState(true);
  const [fgStatsLoading, setFgStatsLoading] = useState(true);

  useEffect(() => {
    const fetchFcStatsData = async () => {
      try {
        setFcStatsLoading(true);
        const response = await fetch('/api/receiptfc');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`
          );
        }
        const result = await response.json();
        if (result && result.error) {
          console.error('❌ API返回错误:', result.error);
          setFcTotalData([]);
          return;
        }
        if (Array.isArray(result)) {
          setFcTotalData(result);
        } else {
          setFcTotalData([]);
        }
      } catch (error) {
        console.error('❌ 获取FC统计数据失败:', error);
        setFcTotalData([]);
      } finally {
        setFcStatsLoading(false);
      }
    };

    const fetchFgStatsData = async () => {
      try {
        setFgStatsLoading(true);
        const response = await fetch('/api/receiptfg');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`
          );
        }
        const result = await response.json();
        if (result && result.error) {
          console.error('❌ API返回错误:', result.error);
          setFgTotalData([]);
          return;
        }
        if (Array.isArray(result)) {
          setFgTotalData(result);
        } else {
          setFgTotalData([]);
        }
      } catch (error) {
        console.error('❌ 获取FG统计数据失败:', error);
        setFgTotalData([]);
      } finally {
        setFgStatsLoading(false);
      }
    };

    fetchFcStatsData();
    fetchFgStatsData();
  }, []);

  const getTotalAmount = () => {
    const fcAmount = fcStatsLoading ? 0 : fcTotalData.reduce((sum, item) => sum + Number(item.taxInclu || 0), 0);
    const fgAmount = fgStatsLoading ? 0 : fgTotalData.reduce((sum, item) => sum + Number(item.taxInclu || 0), 0);
    return fcAmount + fgAmount;
  };

  const tableSubtitle =
    selectedDate === HOME_DEFAULT_DATE_KEY
      ? '默认窗口：今日00:00-02:00 + 昨日全天（按时间倒序）'
      : `${selectedDate} 全天交易记录（按时间倒序）`;

  return (
    <main className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">再生资源交易数据表</h1>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="whitespace-nowrap">交易日期（报废车与废钢铁同一天）</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!datesReady || dateOptions.length === 0}
                className="min-w-[220px] rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
              >
                {dateOptions.map((d) => (
                  <option key={d} value={d}>
                    {d === HOME_DEFAULT_DATE_KEY ? '默认（今日00:00-02:00 + 昨日）' : d}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            查看每天再生资源交易记录和详细信息
          </p>
        </div>

        {!datesReady ? (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600 shadow dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            正在准备本月可选日期…
          </div>
        ) : dateOptions.length === 0 || !selectedDate ? (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            无法解析当前月份日期，请刷新页面重试。
          </div>
        ) : (
          <>
            <ProgressiveTableWithPagination
              title="废钢铁 数据"
              subtitle={tableSubtitle}
              bgColor="bg-blue-50 dark:bg-gray-800"
              selectedDate={selectedDate}
              fetchBatchData={getReceiptfgDataBatch}
              itemsPerPage={10}
            />
            <ProgressiveTableWithPagination
              title="报废车 数据"
              subtitle={tableSubtitle}
              bgColor="bg-white dark:bg-gray-800"
              selectedDate={selectedDate}
              fetchBatchData={getReceiptfcDataBatch}
              itemsPerPage={10}
            />
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
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
