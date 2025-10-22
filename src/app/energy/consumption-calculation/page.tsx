'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface EnergyConsumptionData {
  timeInterval: 'day' | 'month' | 'year';
  startDate: string;
  endDate: string;
  energyTypes: Array<{
    id: number;
    name: string;
    originalValue: number;
    energyConsumption: number;
    percentage: number;
    conversionFactor: number;
    unit: string;
  }>;
  totalConsumption: number;
  chartData: {
    categories: string[];
    values: number[];
    percentages: number[];
  };
}

export default function ConsumptionCalculation() {
  const [data, setData] = useState<EnergyConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeInterval, setTimeInterval] = useState<'day' | 'month' | 'year'>('day');
  const [startDate, setStartDate] = useState('2025-06-01');
  const [endDate, setEndDate] = useState('2025-06-10');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/consumption-calculation');
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
        console.error('获取能源消费量计算数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeInterval, startDate, endDate]);

  // 模拟数据（基于图示样式）
  const mockData: EnergyConsumptionData = {
    timeInterval: 'day',
    startDate: '2025-06-01',
    endDate: '2025-06-10',
    energyTypes: [
      {
        id: 1,
        name: '电 (kWh)',
        originalValue: 655016.00,
        energyConsumption: 416459.17,
        percentage: 69.67,
        conversionFactor: 0.1229,
        unit: 'kWh'
      },
      {
        id: 2,
        name: '煤 (t)',
        originalValue: 0,
        energyConsumption: 0,
        percentage: 0,
        conversionFactor: 714.3,
        unit: 't'
      },
      {
        id: 3,
        name: '柴油 (kg)',
        originalValue: 120000.00,
        energyConsumption: 174000.00,
        percentage: 29.11,
        conversionFactor: 1.2094,
        unit: 'kg'
      },
      {
        id: 4,
        name: '汽油 (L)',
        originalValue: 0,
        energyConsumption: 0,
        percentage: 0,
        conversionFactor: 1.0999,
        unit: 'L'
      },
      {
        id: 5,
        name: '天然气 (m³)',
        originalValue: 6609.68,
        energyConsumption: 7270.65,
        percentage: 1.22,
        conversionFactor: 1.215,
        unit: 'm³'
      },
      {
        id: 6,
        name: '液化石油气 (kg)',
        originalValue: 0,
        energyConsumption: 0,
        percentage: 0,
        conversionFactor: 1.7143,
        unit: 'kg'
      },
      {
        id: 7,
        name: '热力 (GJ)',
        originalValue: 0,
        energyConsumption: 0,
        percentage: 0,
        conversionFactor: 0.0341,
        unit: 'GJ'
      },
      {
        id: 8,
        name: '其它 (kgce)',
        originalValue: 0,
        energyConsumption: 0,
        percentage: 0,
        conversionFactor: 1,
        unit: 'kgce'
      },
      {
        id: 9,
        name: '水 (m³)',
        originalValue: 12503.00,
        energyConsumption: 0,
        percentage: 0,
        conversionFactor: 0,
        unit: 'm³'
      }
    ],
    totalConsumption: 597729.82,
    chartData: {
      categories: ['电', '柴油', '天然气', '煤', '汽油', '液化石油气', '热力', '其它'],
      values: [416459.17, 174000.00, 7270.65, 0, 0, 0, 0, 0],
      percentages: [69.67, 29.11, 1.22, 0, 0, 0, 0, 0]
    }
  };

  const displayData = data || mockData;

  // 能源消费量饼图配置
  const pieChartOption = {
    title: {
      text: '能源消费量分布',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} kgce ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: {
        color: '#6B7280'
      }
    },
    series: [
      {
        name: '能源消费量',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        data: displayData.energyTypes
          .filter(item => item.energyConsumption > 0)
          .map(item => {
            const energyType = item.name.split(' ')[0]; // 只取能源类型名称
            console.log(`饼图数据 - 原始名称: ${item.name}, 提取类型: ${energyType}, 消费量: ${item.energyConsumption}`);
            return {
              value: item.energyConsumption,
              name: energyType,
              itemStyle: {
                color: getEnergyTypeColor(energyType)
              }
            };
          }),
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

  // 能源消费量柱状图配置
  const barChartOption = {
    title: {
      text: '能源消费量对比',
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
          result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kgce<br/>`;
        });
        return result;
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
      data: displayData.chartData.categories,
      axisLabel: {
        color: '#6B7280',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '消费量(kgce)',
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
        name: '能源消费量',
        type: 'bar',
        data: displayData.chartData.values.map((value, index) => ({
          value: value,
          itemStyle: {
            color: getEnergyTypeColor(displayData.chartData.categories[index])
          }
        })),
        barWidth: '60%'
      }
    ]
  };

  // 获取能源类型颜色
  function getEnergyTypeColor(energyType: string): string {
    const colors: { [key: string]: string } = {
      '电': '#3B82F6',
      '煤': '#6B7280',
      '柴油': '#F59E0B',
      '汽油': '#EF4444',
      '天然气': '#10B981',
      '液化石油气': '#8B5CF6',
      '热力': '#F97316',
      '其它': '#6B7280',
      '水': '#06B6D4'
    };
    const color = colors[energyType] || '#6B7280';
    console.log(`能源类型: ${energyType}, 颜色: ${color}`);
    return color;
  }

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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">能源消费量计算</h1>
          <p className="text-gray-600 dark:text-gray-300">能源消费总量统计与分析</p>
        </div>

        {/* 时间选择器 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">时间间隔:</span>
              <div className="flex space-x-2">
                {(['day', 'month', 'year'] as const).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setTimeInterval(interval)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      timeInterval === interval
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {interval === 'day' ? '日' : interval === 'month' ? '月' : '年'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">时间段:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {startDate}至{endDate}能源消费总量统计表
            </h2>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                报表导出
              </button>
              <button className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
                折标煤系数管理
              </button>
            </div>
          </div>
        </div>

        {/* 统计表格 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    序号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    能源种类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    原始值
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    能耗量(kgce)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    占比(%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    折煤系数
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayData.energyTypes.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.originalValue > 0 ? item.originalValue.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.energyConsumption > 0 ? item.energyConsumption.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.percentage > 0 ? `${item.percentage}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.conversionFactor > 0 ? item.conversionFactor : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" colSpan={3}>
                    能源消费总量(kgce)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-bold">
                    {displayData.totalConsumption.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" colSpan={2}>
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 图表展示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 饼图 */}
          <div className="bg-white dark:bg-gray-200 rounded-lg shadow-lg p-6">
            <ReactECharts
              option={pieChartOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>

          {/* 柱状图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ReactECharts
              option={barChartOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        </div>

        {/* 能源消费量趋势图 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
            能源消费量趋势分析
          </h2>
          <div className="h-96">
            <ReactECharts
              option={{
                title: {
                  text: '能源消费量趋势',
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
                      result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kgce<br/>`;
                    });
                    return result;
                  }
                },
                legend: {
                  data: ['电', '柴油', '天然气'],
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
                  data: ['2025-06-01', '2025-06-02', '2025-06-03', '2025-06-04', '2025-06-05', '2025-06-06', '2025-06-07', '2025-06-08', '2025-06-09', '2025-06-10'],
                  axisLabel: {
                    color: '#6B7280',
                    rotate: 45
                  }
                },
                yAxis: {
                  type: 'value',
                  name: '消费量(kgce)',
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
                    name: '电',
                    type: 'line',
                    data: [41645, 42000, 41500, 41000, 41800, 41200, 40900, 41400, 41100, 40800],
                    smooth: true,
                    lineStyle: {
                      color: '#3B82F6',
                      width: 3
                    },
                    itemStyle: {
                      color: '#3B82F6'
                    },
                    areaStyle: {
                      color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                          { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
                        ]
                      }
                    }
                  },
                  {
                    name: '柴油',
                    type: 'line',
                    data: [17400, 17500, 17300, 17200, 17450, 17350, 17250, 17380, 17320, 17280],
                    smooth: true,
                    lineStyle: {
                      color: '#F59E0B',
                      width: 3
                    },
                    itemStyle: {
                      color: '#F59E0B'
                    },
                    areaStyle: {
                      color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
                          { offset: 1, color: 'rgba(245, 158, 11, 0.05)' }
                        ]
                      }
                    }
                  },
                  {
                    name: '天然气',
                    type: 'line',
                    data: [727, 730, 725, 720, 728, 726, 724, 727, 725, 723],
                    smooth: true,
                    lineStyle: {
                      color: '#10B981',
                      width: 3
                    },
                    itemStyle: {
                      color: '#10B981'
                    },
                    areaStyle: {
                      color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                          { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
                        ]
                      }
                    }
                  }
                ]
              }}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}