'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface CarbonAccountingData {
  year: string;
  standard: string;
  annualStats: {
    netEmissions: {
      value: number;
      unit: string;
      change: number;
      trend: 'up' | 'down' | 'stable';
    };
    energyConsumption: {
      value: number;
      unit: string;
      change: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  monthlyEmissions: {
    months: string[];
    fuelCombustion: number[];
    purchasedElectricity: number[];
    processEmissions: number[];
    energyConsumption: number[];
  };
  carbonFlow: {
    nodes: Array<{
      id: string;
      name: string;
      value: number;
      level: number;
    }>;
    links: Array<{
      source: string;
      target: string;
      value: number;
    }>;
  };
  emissionReduction: {
    categories: string[];
    quantity: number[];
    equivalentReduction: number[];
  };
}

export default function CarbonAccounting() {
  const [data, setData] = useState<CarbonAccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState('2025年');
  const [standard, setStandard] = useState('GB/T 32150');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/carbon-accounting');
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
        console.error('获取碳排放核算数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, standard]);

  // 模拟数据（基于图示样式）
  const mockData: CarbonAccountingData = {
    year: '2025年',
    standard: 'GB/T 32150',
    annualStats: {
      netEmissions: {
        value: 13897.8659,
        unit: 'tCO₂e',
        change: 0,
        trend: 'stable'
      },
      energyConsumption: {
        value: 5950.7096,
        unit: 'tce',
        change: 0,
        trend: 'stable'
      }
    },
    monthlyEmissions: {
      months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      fuelCombustion: [400, 350, 420, 380, 450, 400, 480, 460, 420, 400, 380, 350],
      purchasedElectricity: [300, 280, 320, 300, 350, 320, 380, 360, 330, 310, 290, 270],
      processEmissions: [200, 180, 220, 200, 240, 220, 260, 250, 230, 210, 190, 180],
      energyConsumption: [450, 410, 480, 440, 520, 470, 550, 530, 490, 460, 430, 400]
    },
    carbonFlow: {
      nodes: [
        { id: 'company', name: '欧冶链金（萍乡）再生资源有限公司', value: 1000, level: 0 },
        { id: 'fuel', name: '化石燃料燃烧排放', value: 500, level: 1 },
        { id: 'purchased', name: '净购入电力和热力排放', value: 500, level: 1 },
        { id: 'naturalGas', name: '天然气', value: 200, level: 2 },
        { id: 'electricity', name: '净购入电力', value: 300, level: 2 },
        { id: 'coal', name: '燃煤', value: 150, level: 2 },
        { id: 'diesel', name: '柴油', value: 100, level: 2 },
        { id: 'steam', name: '蒸汽', value: 50, level: 2 }
      ],
      links: [
        { source: 'company', target: 'fuel', value: 500 },
        { source: 'company', target: 'purchased', value: 500 },
        { source: 'fuel', target: 'naturalGas', value: 200 },
        { source: 'fuel', target: 'coal', value: 150 },
        { source: 'fuel', target: 'diesel', value: 100 },
        { source: 'fuel', target: 'steam', value: 50 },
        { source: 'purchased', target: 'electricity', value: 300 }
      ]
    },
    emissionReduction: {
      categories: ['自发电', '外购绿电(购电协议)', '碳证'],
      quantity: [40000, 0, 180000],
      equivalentReduction: [35000, 0, 90000]
    }
  };

  const displayData = data || mockData;

  // 月度排放量图表配置
  const monthlyEmissionsChartOption = {
    title: {
      text: '排放量 (tCO₂e)',
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
          if (item.seriesName === '能耗量 (tce)') {
            result += `${item.marker}${item.seriesName}: ${item.value} tce<br/>`;
          } else {
            result += `${item.marker}${item.seriesName}: ${item.value} tCO₂e<br/>`;
          }
        });
        return result;
      }
    },
    legend: {
      data: ['燃料燃烧排放 (tCO₂e)', '购入电力热力排放 (tCO₂e)', '过程排放 (tCO₂e)', '能耗量 (tce)'],
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
      data: displayData.monthlyEmissions.months,
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '排放量 (tCO₂e)',
        nameTextStyle: {
          color: '#6B7280'
        },
        axisLabel: {
          color: '#6B7280'
        }
      },
      {
        type: 'value',
        name: '能耗量 (tce)',
        nameTextStyle: {
          color: '#6B7280'
        },
        axisLabel: {
          color: '#6B7280'
        }
      }
    ],
    series: [
      {
        name: '燃料燃烧排放 (tCO₂e)',
        type: 'bar',
        stack: 'emissions',
        data: displayData.monthlyEmissions.fuelCombustion,
        itemStyle: {
          color: '#3B82F6'
        }
      },
      {
        name: '购入电力热力排放 (tCO₂e)',
        type: 'bar',
        stack: 'emissions',
        data: displayData.monthlyEmissions.purchasedElectricity,
        itemStyle: {
          color: '#60A5FA'
        }
      },
      {
        name: '过程排放 (tCO₂e)',
        type: 'bar',
        stack: 'emissions',
        data: displayData.monthlyEmissions.processEmissions,
        itemStyle: {
          color: '#1E40AF'
        }
      },
      {
        name: '能耗量 (tce)',
        type: 'line',
        yAxisIndex: 1,
        data: displayData.monthlyEmissions.energyConsumption,
        lineStyle: {
          color: '#F59E0B',
          width: 3
        },
        itemStyle: {
          color: '#F59E0B'
        },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  };

  // 碳流图配置
  const carbonFlowChartOption = {
    title: {
      text: '碳流图 (tCO₂e)',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: function(params: any) {
        if (params.dataType === 'node') {
          return `${params.data.name}<br/>排放量: ${params.data.value} tCO₂e`;
        } else if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>流量: ${params.data.value} tCO₂e`;
        }
        return '';
      }
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        data: displayData.carbonFlow.nodes,
        links: displayData.carbonFlow.links,
        emphasis: {
          focus: 'adjacency'
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: '#aaa'
        },
        label: {
          position: 'right',
          fontSize: 12,
          color: '#374151'
        }
      }
    ]
  };

  // 减排分析图表配置
  const emissionReductionChartOption = {
    title: {
      text: '减排分析',
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
        type: 'shadow'
      },
      formatter: function(params: any) {
        let result = `${params[0].axisValue}<br/>`;
        params.forEach((item: any) => {
          if (item.seriesName === '数量 (kWh)') {
            result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kWh<br/>`;
          } else {
            result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} tCO₂e<br/>`;
          }
        });
        return result;
      }
    },
    legend: {
      data: ['数量 (kWh)', '等效减排量 (tCO₂e)'],
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
      data: displayData.emissionReduction.categories,
      axisLabel: {
        color: '#6B7280',
        rotate: 45
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '数量 (kWh)',
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
      {
        type: 'value',
        name: '等效减排量 (tCO₂e)',
        nameTextStyle: {
          color: '#6B7280'
        },
        axisLabel: {
          color: '#6B7280',
          formatter: function(value: number) {
            return (value / 1000).toFixed(0) + 'K';
          }
        }
      }
    ],
    series: [
      {
        name: '数量 (kWh)',
        type: 'bar',
        data: displayData.emissionReduction.quantity,
        itemStyle: {
          color: '#3B82F6'
        },
        barWidth: '40%'
      },
      {
        name: '等效减排量 (tCO₂e)',
        type: 'bar',
        yAxisIndex: 1,
        data: displayData.emissionReduction.equivalentReduction,
        itemStyle: {
          color: '#1E40AF'
        },
        barWidth: '40%'
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
        {/* 页面标题和筛选器 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">碳排放核算</h1>
          <div className="flex items-center space-x-4">
            <select
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="GB/T 32150">GB/T 32150</option>
            </select>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">
              {year}
            </button>
          </div>
        </div>

        {/* 年度统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 年度净排放量 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">年度净排放量</h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {displayData.annualStats.netEmissions.value.toLocaleString()}
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                    {displayData.annualStats.netEmissions.unit}
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    较去年 {displayData.annualStats.netEmissions.change}%
                  </span>
                  <div className="ml-2 text-green-500">
                    {displayData.annualStats.netEmissions.trend === 'down' ? '↓' : 
                     displayData.annualStats.netEmissions.trend === 'up' ? '↑' : '→'}
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="40" fill="#3B82F6" />
                  <rect x="30" y="30" width="20" height="40" fill="white" />
                  <rect x="50" y="35" width="15" height="30" fill="white" />
                </svg>
              </div>
            </div>
          </div>

          {/* 年度能耗量 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">年度能耗量</h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {displayData.annualStats.energyConsumption.value.toLocaleString()}
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                    {displayData.annualStats.energyConsumption.unit}
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    较去年 {displayData.annualStats.energyConsumption.change}%
                  </span>
                  <div className="ml-2 text-green-500">
                    {displayData.annualStats.energyConsumption.trend === 'down' ? '↓' : 
                     displayData.annualStats.energyConsumption.trend === 'up' ? '↑' : '→'}
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="40" fill="#10B981" />
                  <rect x="20" y="60" width="60" height="20" fill="white" />
                  <rect x="30" y="40" width="40" height="20" fill="white" />
                  <rect x="40" y="20" width="20" height="20" fill="white" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 月度排放量图表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <ReactECharts
            option={monthlyEmissionsChartOption}
            style={{ height: '400px', width: '100%' }}
          />
        </div>

        {/* 底部图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 碳流图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">碳流图 (tCO₂e)</h3>
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                展开全部
              </button>
            </div>
            <ReactECharts
              option={carbonFlowChartOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>

          {/* 减排分析 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">减排分析</h3>
            <ReactECharts
              option={emissionReductionChartOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
