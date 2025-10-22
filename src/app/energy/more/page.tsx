'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface CarbonAssetData {
  totalAssets: {
    quantity: {
      total: number;
      allowance: number;
      ccer: number;
    };
    value: {
      total: number;
      allowance: number;
      ccer: number;
    };
  };
  allowanceStats: {
    total: number;
    latestPrice: number;
    priceUpdateTime: string;
    issued: number;
    bought: number;
    sold: number;
    compliance: number;
  };
  ccerStats: {
    total: number;
    latestPrice: number;
    priceUpdateTime: string;
    previousYearBalance: number;
    bought: number;
    sold: number;
    issued: number;
    offset: number;
  };
  priceChart: {
    dates: string[];
    prices: number[];
    volumes: number[];
  };
  holdings: Array<{
    id: number;
    asset: string;
    quantity: number;
    value: number;
    status: string;
  }>;
}

export default function More() {
  const [data, setData] = useState<CarbonAssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'suppliers'>('assets');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/more');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || '获取数据失败');
        }
      } catch (err) {
        console.error('获取碳资产管理数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 模拟数据（基于图示样式）
  const mockData: CarbonAssetData = {
    totalAssets: {
      quantity: {
        total: 7700000,
        allowance: 7500000,
        ccer: 200000
      },
      value: {
        total: 529226000,
        allowance: 510000000,
        ccer: 19226000
      }
    },
    allowanceStats: {
      total: 7500000,
      latestPrice: 68.00,
      priceUpdateTime: '2025-06-04',
      issued: 8000000,
      bought: 500000,
      sold: 1000000,
      compliance: 0
    },
    ccerStats: {
      total: 200000,
      latestPrice: 96.13,
      priceUpdateTime: '2025-04-30',
      previousYearBalance: 100000,
      bought: 230000,
      sold: 40000,
      issued: 10000,
      offset: 100000
    },
    priceChart: {
      dates: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'],
      prices: [65.5, 66.2, 67.8, 68.5, 67.9, 68.0],
      volumes: [1200000, 1350000, 1420000, 1380000, 1450000, 1500000]
    },
    holdings: [
      { id: 1, asset: '配额总量', quantity: 7500000, value: 510000000, status: '持有' },
      { id: 2, asset: 'CCER', quantity: 200000, value: 19226000, status: '持有' },
      { id: 3, asset: '配额买入', quantity: 500000, value: 34000000, status: '交易中' },
      { id: 4, asset: '配额卖出', quantity: 1000000, value: 68000000, status: '已售出' }
    ]
  };

  const displayData = data || mockData;

  // 碳资产总量饼图配置
  const assetQuantityPieOption = {
    title: {
      text: '碳资产总量',
      left: 'center',
      top: 10,
      textStyle: {
        color: '#374151',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} tCO₂ ({d}%)',
      position: function (point: any, params: any, dom: any, rect: any, size: any) {
        // 确保提示框在可视区域内
        return [point[0] + 10, point[1] - 10];
      }
    },
    series: [
      {
        name: '碳资产',
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['50%', '55%'],
        data: [
          {
            value: displayData.totalAssets.quantity.allowance,
            name: '配额总量',
            itemStyle: { color: '#3B82F6' }
          },
          {
            value: displayData.totalAssets.quantity.ccer,
            name: 'CCER',
            itemStyle: { color: '#10B981' }
          }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: true,
          formatter: '{b}: {c} tCO₂',
          fontSize: 11,
          position: 'outside'
        },
        labelLine: {
          show: true,
          length: 8,
          length2: 5
        }
      }
    ]
  };

  // 碳资产总额饼图配置
  const assetValuePieOption = {
    title: {
      text: '碳资产总额',
      left: 'center',
      top: 10,
      textStyle: {
        color: '#374151',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        return `${params.seriesName} <br/>${params.name}: ${(params.value / 100000000).toFixed(2)}亿元 (${params.percent}%)`;
      },
      position: function (point: any, params: any, dom: any, rect: any, size: any) {
        // 确保提示框在可视区域内
        return [point[0] + 10, point[1] - 10];
      }
    },
    series: [
      {
        name: '碳资产',
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['50%', '55%'],
        data: [
          {
            value: displayData.totalAssets.value.allowance,
            name: '配额总量',
            itemStyle: { color: '#3B82F6' }
          },
          {
            value: displayData.totalAssets.value.ccer,
            name: 'CCER',
            itemStyle: { color: '#10B981' }
          }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: true,
          formatter: function(params: any) {
            return `${params.name}: ${(params.value / 100000000).toFixed(2)}亿元`;
          },
          fontSize: 11,
          position: 'outside'
        },
        labelLine: {
          show: true,
          length: 8,
          length2: 5
        }
      }
    ]
  };

  // 价格趋势图表配置
  const priceChartOption = {
    title: {
      text: '配额价格趋势',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['价格', '交易量'],
      top: 30,
      textStyle: {
        color: '#6B7280'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: displayData.priceChart.dates,
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '价格(元/吨)',
        nameTextStyle: {
          color: '#6B7280'
        },
        axisLabel: {
          color: '#6B7280'
        }
      },
      {
        type: 'value',
        name: '交易量',
        nameTextStyle: {
          color: '#6B7280'
        },
        axisLabel: {
          color: '#6B7280',
          formatter: function(value: number) {
            return (value / 10000).toFixed(0) + '万';
          }
        }
      }
    ],
    series: [
      {
        name: '价格',
        type: 'line',
        data: displayData.priceChart.prices,
        smooth: true,
        lineStyle: {
          color: '#3B82F6',
          width: 3
        },
        itemStyle: {
          color: '#3B82F6'
        },
        symbol: 'circle',
        symbolSize: 6
      },
      {
        name: '交易量',
        type: 'bar',
        yAxisIndex: 1,
        data: displayData.priceChart.volumes,
        itemStyle: {
          color: '#10B981'
        },
        barWidth: '60%'
      }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-red-600 dark:text-red-400">加载失败: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题和更新时间 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">碳资产管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">更新时间: 2025-10-05 13:12:16</p>
        </div>

        {/* 标签页切换 */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'assets'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              碳资产管理
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'suppliers'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              供应链管理
            </button>
          </div>
        </div>

        {activeTab === 'assets' ? (
          <>
            {/* 碳资产总量和总额 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* 碳资产总量 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">碳资产总量</h3>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {(displayData.totalAssets.quantity.total / 1000000).toFixed(1)}M
                      <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">tCO₂</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 text-green-500">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.1"/>
                      <path d="M30 40 L45 55 L70 30" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="h-56">
                  <ReactECharts
                    option={assetQuantityPieOption}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
              </div>

              {/* 碳资产总额 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">碳资产总额</h3>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {(displayData.totalAssets.value.total / 100000000).toFixed(2)}亿
                      <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">元</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 text-yellow-500">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.1"/>
                      <rect x="30" y="30" width="40" height="40" rx="5" fill="currentColor" opacity="0.3"/>
                      <rect x="35" y="35" width="30" height="30" rx="3" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
                <div className="h-56">
                  <ReactECharts
                    option={assetValuePieOption}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* 配额统计和CCER统计 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* 碳配额统计 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">配额总量</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {(displayData.allowanceStats.total / 1000000).toFixed(1)}M tCO₂
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">最新配额价格</div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">
                    {displayData.allowanceStats.latestPrice} 元/吨
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    更新时间: {displayData.allowanceStats.priceUpdateTime}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.allowanceStats.issued / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">配额发放量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.allowanceStats.bought / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">买入量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.allowanceStats.sold / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">卖出量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {displayData.allowanceStats.compliance}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">履约清数量</div>
                  </div>
                </div>
              </div>

              {/* CCER统计 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">CCER总量</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {(displayData.ccerStats.total / 1000).toFixed(0)}K tCO₂
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">最新配额价格</div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">
                    {displayData.ccerStats.latestPrice} 元/吨
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    更新时间: {displayData.ccerStats.priceUpdateTime}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.ccerStats.previousYearBalance / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">上年账户余量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.ccerStats.bought / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">买入量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.ccerStats.sold / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">卖出量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.ccerStats.issued / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">签发量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg col-span-2">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(displayData.ccerStats.offset / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">抵销量</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 价格趋势图表 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <ReactECharts
                option={priceChartOption}
                style={{ height: '400px', width: '100%' }}
              />
            </div>

            {/* 资产持有明细 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">资产持有明细</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">资产类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">数量(tCO₂)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">价值(元)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">状态</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.holdings.map((holding) => (
                      <tr key={holding.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{holding.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{holding.asset}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{holding.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{holding.value.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            holding.status === '持有' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : holding.status === '交易中'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {holding.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* 供应链管理页面 */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">供应商管理</h2>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">
                + 新增供应商
              </button>
            </div>
            
            {/* 搜索筛选 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">供应商名称</label>
                <input
                  type="text"
                  placeholder="请输入供应商名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">最近更新时间</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex items-end space-x-2">
                <button className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">
                  查询
                </button>
                <button className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600">
                  重置
                </button>
              </div>
            </div>

            {/* 供应商列表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">供应商名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">供应商地区</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">详细地址</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">联系人</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">联系电话</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">电子邮箱</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">最近更新时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.from({ length: 10 }, (_, i) => (
                    <tr key={i + 1}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{i + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">供应商{String.fromCharCode(65 + i)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">江西省南昌市青山湖区高新区</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">紫阳大道3088号泰豪科技广场</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">简总</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">0791-88526621{i}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">543219876@163.com</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">2025/6/9 18:00:00</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <a href="#" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mr-4">编辑</a>
                        <a href="#" className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600">删除</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                共10条
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">10条/页</span>
                <div className="flex space-x-1">
                  <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">上一页</button>
                  <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">1</button>
                  <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">下一页</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
