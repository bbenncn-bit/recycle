'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface EnergyCostData {
  totalCost: number;
  energyBreakdown: {
    water: { cost: number; percentage: number };
    electricity: { cost: number; percentage: number };
    coal: { cost: number; percentage: number };
    diesel: { cost: number; percentage: number };
    heating: { cost: number; percentage: number };
    naturalGas: { cost: number; percentage: number };
    other: { cost: number; percentage: number };
  };
  monthlyData: Array<{
    month: string;
    electricity: number;
    water: number;
    naturalGas: number;
    diesel: number;
  }>;
  peakValleyUsage: {
    deepValley: number;
    valley: number;
    peak: number;
    flat: number;
    sharp: number;
  };
  peakValleyCost: {
    deepValley: number;
    valley: number;
    peak: number;
    flat: number;
    sharp: number;
  };
}

export default function AnalysisStrategy() {
  const [data, setData] = useState<EnergyCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeInterval, setTimeInterval] = useState<'month' | 'year'>('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/analysis-strategy');
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
        console.error('获取能源分析与策略数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 模拟数据（当API没有数据时使用）
  const mockData: EnergyCostData = {
    totalCost: 1268958.17,
    energyBreakdown: {
      water: { cost: 31452, percentage: 2.48 },
      electricity: { cost: 416459.17, percentage: 32.82 },
      coal: { cost: 0, percentage: 0 },
      diesel: { cost: 798350, percentage: 62.91 },
      heating: { cost: 0, percentage: 0 },
      naturalGas: { cost: 22697, percentage: 1.79 },
      other: { cost: 0, percentage: 0 }
    },
    monthlyData: [
      { month: '2025-01', electricity: 83000, water: 11232, naturalGas: 5622, diesel: 213333 },
      { month: '2025-02', electricity: 85000, water: 12000, naturalGas: 5800, diesel: 220000 },
      { month: '2025-03', electricity: 82000, water: 11000, naturalGas: 5500, diesel: 200000 },
      { month: '2025-04', electricity: 78000, water: 10500, naturalGas: 5200, diesel: 180000 },
      { month: '2025-05', electricity: 80000, water: 10800, naturalGas: 5400, diesel: 190000 },
      { month: '2025-06', electricity: 75000, water: 10000, naturalGas: 5000, diesel: 170000 }
    ],
    peakValleyUsage: {
      deepValley: 14.76,
      valley: 13.85,
      peak: 25.38,
      flat: 17.64,
      sharp: 28.37
    },
    peakValleyCost: {
      deepValley: 15,
      valley: 25,
      peak: 20,
      flat: 10,
      sharp: 30
    }
  };

  const displayData = data || mockData;

  // 月度能源成本柱状图配置
  const monthlyChartOption = {
    title: {
      text: '月度能源成本分析',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        let result = `${params[0].axisValue}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()}元<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['用电费用', '用水费用', '用天然气费用', '用柴油费用'],
      bottom: 10,
      textStyle: {
        color: '#6B7280'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: displayData.monthlyData.map(item => item.month),
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: {
      type: 'value',
      name: '单位:元',
      nameTextStyle: {
        color: '#6B7280'
      },
      axisLabel: {
        color: '#6B7280',
        formatter: function(value: number) {
          return (value / 1000).toFixed(0) + 'K';
        }
      }
    },
    series: [
      {
        name: '用电费用',
        type: 'bar',
        stack: 'total',
        data: displayData.monthlyData.map(item => item.electricity),
        itemStyle: {
          color: '#3B82F6'
        }
      },
      {
        name: '用水费用',
        type: 'bar',
        stack: 'total',
        data: displayData.monthlyData.map(item => item.water),
        itemStyle: {
          color: '#60A5FA'
        }
      },
      {
        name: '用天然气费用',
        type: 'bar',
        stack: 'total',
        data: displayData.monthlyData.map(item => item.naturalGas),
        itemStyle: {
          color: '#10B981'
        }
      },
      {
        name: '用柴油费用',
        type: 'bar',
        stack: 'total',
        data: displayData.monthlyData.map(item => item.diesel),
        itemStyle: {
          color: '#9CA3AF'
        }
      }
    ]
  };

  // 分时用量饼图配置
  const usageChartOption = {
    title: {
      text: '分时用量 (kWh)',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}% ({d}%)'
    },
    series: [
      {
        name: '分时用量',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '60%'],
        data: [
          { value: displayData.peakValleyUsage.deepValley, name: '深谷', itemStyle: { color: '#FCD34D' } },
          { value: displayData.peakValleyUsage.valley, name: '谷', itemStyle: { color: '#3B82F6' } },
          { value: displayData.peakValleyUsage.sharp, name: '尖', itemStyle: { color: '#60A5FA' } },
          { value: displayData.peakValleyUsage.peak, name: '峰', itemStyle: { color: '#9CA3AF' } },
          { value: displayData.peakValleyUsage.flat, name: '平', itemStyle: { color: '#10B981' } }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  // 分时费用饼图配置
  const costChartOption = {
    title: {
      text: '分时费用 (¥)',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}% ({d}%)'
    },
    series: [
      {
        name: '分时费用',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '60%'],
        data: [
          { value: displayData.peakValleyCost.deepValley, name: '深谷', itemStyle: { color: '#FCD34D' } },
          { value: displayData.peakValleyCost.valley, name: '谷', itemStyle: { color: '#3B82F6' } },
          { value: displayData.peakValleyCost.sharp, name: '尖', itemStyle: { color: '#60A5FA' } },
          { value: displayData.peakValleyCost.peak, name: '峰', itemStyle: { color: '#9CA3AF' } },
          { value: displayData.peakValleyCost.flat, name: '平', itemStyle: { color: '#10B981' } }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
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
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">能源分析与策略</h1>
          <p className="text-gray-600 dark:text-gray-300">能源成本测算与分析</p>
        </div>

        {/* 时间选择器 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">时间间隔:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTimeInterval('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeInterval === 'month'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  月
                </button>
                <button
                  onClick={() => setTimeInterval('year')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeInterval === 'year'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  年
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">时间段:</span>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                defaultValue="2025-01-01"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                defaultValue="2025-06-30"
              />
            </div>
          </div>
        </div>

        {/* 月度能源成本柱状图 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <ReactECharts
            option={monthlyChartOption}
            style={{ height: '400px', width: '100%' }}
          />
        </div>

        {/* 电力峰谷平分析 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
            电力峰谷平分析
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <ReactECharts
                option={usageChartOption}
                style={{ height: '300px', width: '100%' }}
              />
            </div>
            <div>
              <ReactECharts
                option={costChartOption}
                style={{ height: '300px', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* 能源费用明细 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">能源费用</h2>
          <div className="space-y-1">
            {Object.entries(displayData.energyBreakdown).map(([key, value]) => {
              const labels: { [key: string]: string } = {
                water: '用水成本测算',
                electricity: '用电成本测算',
                coal: '用煤成本测算',
                diesel: '用柴油成本测算',
                heating: '用热成本测算',
                naturalGas: '用天然气成本测算',
                other: '其它成本测算'
              };
              
              return (
                <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <span className="text-gray-700 dark:text-gray-300">{labels[key]}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold text-gray-800 dark:text-white">
                      {value.cost.toLocaleString()}元
                    </span>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {value.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        
      </div>
      {/* 总成本卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            ¥{displayData.totalCost.toLocaleString()}
            </div>
            <div className="text-xl text-gray-600 dark:text-gray-300">总成本测算(元)</div>
          </div>
        </div>
    </div>
  );
}
