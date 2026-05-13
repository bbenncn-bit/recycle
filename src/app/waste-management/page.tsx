'use client';

import { useState, useEffect } from 'react';
import LazyReactECharts from '@/components/lazy-react-echarts';

interface WasteManagementData {
  summary: {
    totalQuantity: number;
    totalCategories: number;
    utilizationRate: number;
    disposalRate: number;
  };
  categoryDistribution: {
    categories: string[];
    quantities: number[];
  };
  flowAnalysis: {
    directions: string[];
    quantities: number[];
  };
  monthlyTrend: {
    months: string[];
    quantities: number[];
  };
  utilizationDisposal: {
    methods: string[];
    utilization: number[];
    disposal: number[];
  };
  storageStatus: {
    locations: string[];
    quantities: number[];
  };
}

export default function WasteManagement() {
  const [data, setData] = useState<WasteManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/waste-management');
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
        console.error('获取固废管理数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600 dark:text-red-400">错误: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-400">暂无数据</div>
      </div>
    );
  }

  // 固废类别分布饼图配置
  const categoryPieOption = {
    title: {
      text: '固废类别分布',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} 吨 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        name: '固废类别',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: data.categoryDistribution.categories.map((cat, index) => ({
          value: data.categoryDistribution.quantities[index],
          name: cat
        }))
      }
    ]
  };

  // 流向分析柱状图配置
  const flowBarOption = {
    title: {
      text: '固废流向分析',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.flowAnalysis.directions,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '数量（吨）'
    },
    series: [
      {
        name: '固废数量',
        type: 'bar',
        data: data.flowAnalysis.quantities,
        itemStyle: {
          color: '#1890ff'
        },
        emphasis: {
          itemStyle: {
            color: '#40a9ff'
          }
        }
      }
    ]
  };

  // 月度趋势折线图配置
  const monthlyTrendOption = {
    title: {
      text: '月度固废产生趋势',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.monthlyTrend.months
    },
    yAxis: {
      type: 'value',
      name: '数量（吨）'
    },
    series: [
      {
        name: '固废产生量',
        type: 'line',
        smooth: true,
        data: data.monthlyTrend.quantities,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
            ]
          }
        },
        itemStyle: {
          color: '#1890ff'
        }
      }
    ]
  };

  // 利用与处置对比图配置
  const utilizationDisposalOption = {
    title: {
      text: '利用与处置方式对比',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['利用量', '处置量'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.utilizationDisposal.methods,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '数量（吨）'
    },
    series: [
      {
        name: '利用量',
        type: 'bar',
        data: data.utilizationDisposal.utilization,
        itemStyle: {
          color: '#52c41a'
        }
      },
      {
        name: '处置量',
        type: 'bar',
        data: data.utilizationDisposal.disposal,
        itemStyle: {
          color: '#ff4d4f'
        }
      }
    ]
  };

  // 贮存状态柱状图配置
  const storageStatusOption = {
    title: {
      text: '贮存地点分布',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.storageStatus.locations,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '数量（吨）'
    },
    series: [
      {
        name: '贮存数量',
        type: 'bar',
        data: data.storageStatus.quantities,
        itemStyle: {
          color: '#faad14'
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            工业固体废物管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            实时监控工业固体废物的种类、数量、流向、贮存、利用、处置等信息
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总产生量</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.summary.totalQuantity.toFixed(2)} 吨
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">固废类别</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.summary.totalCategories} 种
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">综合利用率</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.summary.utilizationRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">处置率</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.summary.disposalRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 固废类别分布 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <LazyReactECharts
              option={categoryPieOption}
              style={{ height: '400px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>

          {/* 流向分析 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <LazyReactECharts
              option={flowBarOption}
              style={{ height: '400px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </div>

        {/* 月度趋势 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <LazyReactECharts
            option={monthlyTrendOption}
            style={{ height: '400px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* 利用与处置对比、贮存状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <LazyReactECharts
              option={utilizationDisposalOption}
              style={{ height: '400px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <LazyReactECharts
              option={storageStatusOption}
              style={{ height: '400px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

