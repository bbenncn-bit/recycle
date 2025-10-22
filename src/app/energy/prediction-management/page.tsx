'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface PredictionManagementData {
  predictionType: 'short' | 'medium' | 'long';
  electricityData: {
    actual: Array<{
      period: string;
      value: number;
    }>;
    predicted: Array<{
      period: string;
      value: number;
    }>;
  };
  photovoltaicData: {
    actual: Array<{
      period: string;
      value: number;
    }>;
    predicted: Array<{
      period: string;
      value: number;
    }>;
  };
  naturalGasData: {
    actual: Array<{
      period: string;
      value: number;
    }>;
    predicted: Array<{
      period: string;
      value: number;
    }>;
  };
}

export default function PredictionManagement() {
  const [data, setData] = useState<PredictionManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionType, setPredictionType] = useState<'short' | 'medium' | 'long'>('short');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/prediction-management');
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
        console.error('获取能碳预测管理数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [predictionType]);

  // 模拟数据（基于图示样式）
  const mockData: PredictionManagementData = {
    predictionType: 'short',
    electricityData: {
      actual: [
        { period: '2025-5', value: 1950000 },
        { period: '2025-6', value: 1885658 }
      ],
      predicted: [
        { period: '2025-7', value: 1893245 },
        { period: '2025-8', value: 1956082 },
        { period: '2025-9', value: 1893333 }
      ]
    },
    photovoltaicData: {
      actual: [
        { period: '2025-5', value: 234000 },
        { period: '2025-6', value: 213232 }
      ],
      predicted: [
        { period: '2025-7', value: 192312 },
        { period: '2025-8', value: 231316 },
        { period: '2025-9', value: 223113 }
      ]
    },
    naturalGasData: {
      actual: [
        { period: '2025-5', value: 19800 },
        { period: '2025-6', value: 16342 }
      ],
      predicted: [
        { period: '2025-7', value: 13121 },
        { period: '2025-8', value: 18765 },
        { period: '2025-9', value: 19454 }
      ]
    }
  };

  const displayData = data || mockData;

  // 电力消耗总量图表配置
  const electricityChartOption = {
    title: {
      text: '电力消耗总量 (kWh)',
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
      },
      formatter: function(params: any) {
        let result = `${params[0].axisValue}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kWh<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['真实值', '预测值'],
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
      data: [...displayData.electricityData.actual.map(item => item.period), ...displayData.electricityData.predicted.map(item => item.period)],
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
      nameTextStyle: {
        color: '#6B7280'
      },
      axisLabel: {
        color: '#6B7280',
        formatter: function(value: number) {
          return (value / 1000000).toFixed(1) + 'M';
        }
      }
    },
    series: [
      {
        name: '真实值',
        type: 'line',
        data: [...displayData.electricityData.actual.map(item => item.value), ...new Array(displayData.electricityData.predicted.length).fill(null)],
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
        name: '预测值',
        type: 'line',
        data: [...new Array(displayData.electricityData.actual.length).fill(null), ...displayData.electricityData.predicted.map(item => item.value)],
        smooth: true,
        lineStyle: {
          color: '#F59E0B',
          width: 3,
          type: 'dashed'
        },
        itemStyle: {
          color: '#F59E0B'
        },
        symbol: 'diamond',
        symbolSize: 6
      }
    ]
  };

  // 光伏发电量图表配置
  const photovoltaicChartOption = {
    title: {
      text: '光伏发电量 (kWh)',
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
      },
      formatter: function(params: any) {
        let result = `${params[0].axisValue}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kWh<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['真实值', '预测值'],
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
      data: [...displayData.photovoltaicData.actual.map(item => item.period), ...displayData.photovoltaicData.predicted.map(item => item.period)],
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
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
        name: '真实值',
        type: 'line',
        data: [...displayData.photovoltaicData.actual.map(item => item.value), ...new Array(displayData.photovoltaicData.predicted.length).fill(null)],
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
        name: '预测值',
        type: 'line',
        data: [...new Array(displayData.photovoltaicData.actual.length).fill(null), ...displayData.photovoltaicData.predicted.map(item => item.value)],
        smooth: true,
        lineStyle: {
          color: '#F59E0B',
          width: 3,
          type: 'dashed'
        },
        itemStyle: {
          color: '#F59E0B'
        },
        symbol: 'diamond',
        symbolSize: 6
      }
    ]
  };

  // 天然气消耗总量图表配置
  const naturalGasChartOption = {
    title: {
      text: '天然气消耗总量 (m³)',
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
      },
      formatter: function(params: any) {
        let result = `${params[0].axisValue}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} m³<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['真实值', '预测值'],
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
      data: [...displayData.naturalGasData.actual.map(item => item.period), ...displayData.naturalGasData.predicted.map(item => item.period)],
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: {
      type: 'value',
      name: 'm³',
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
        name: '真实值',
        type: 'line',
        data: [...displayData.naturalGasData.actual.map(item => item.value), ...new Array(displayData.naturalGasData.predicted.length).fill(null)],
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
        name: '预测值',
        type: 'line',
        data: [...new Array(displayData.naturalGasData.actual.length).fill(null), ...displayData.naturalGasData.predicted.map(item => item.value)],
        smooth: true,
        lineStyle: {
          color: '#F59E0B',
          width: 3,
          type: 'dashed'
        },
        itemStyle: {
          color: '#F59E0B'
        },
        symbol: 'diamond',
        symbolSize: 6
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">能源消耗量预测</h1>
        </div>

        {/* 能源类型选择 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">能源类型:</span>
            <div className="flex space-x-2">
              {(['short', 'medium', 'long'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setPredictionType(type)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    predictionType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {type === 'short' ? '短期' : type === 'medium' ? '中期' : '长期'}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              (短期预测为4小时、中期预测为24小时,长期预测为3个月)
            </span>
          </div>
        </div>

        {/* 三个数据块 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 电力消耗总量 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ReactECharts
              option={electricityChartOption}
              style={{ height: '300px', width: '100%' }}
            />
            
            {/* 真实值表格 */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">真实值</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">时段</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">真实值(kWh)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.electricityData.actual.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.period}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 预测值表格 */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">预测值</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">时段</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">预测值(kWh)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.electricityData.predicted.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.period}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 光伏发电量 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ReactECharts
              option={photovoltaicChartOption}
              style={{ height: '300px', width: '100%' }}
            />
            
            {/* 真实值表格 */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">真实值</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">时段</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">真实值(kWh)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.photovoltaicData.actual.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.period}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 预测值表格 */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">预测值</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">时段</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">预测值(kWh)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.photovoltaicData.predicted.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.period}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 天然气消耗总量 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ReactECharts
              option={naturalGasChartOption}
              style={{ height: '300px', width: '100%' }}
            />
            
            {/* 真实值表格 */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">真实值</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">时段</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">真实值(m³)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.naturalGasData.actual.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.period}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 预测值表格 */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">预测值</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">时段</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">预测值(m³)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.naturalGasData.predicted.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.period}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
