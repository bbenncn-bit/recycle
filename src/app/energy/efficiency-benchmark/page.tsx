'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface EfficiencyBenchmarkData {
  indicatorName: string;
  managementLevel: string;
  timeInterval: 'day' | 'month' | 'year';
  startDate: string;
  endDate: string;
  rankCards: Array<{
    id: number;
    rank: number;
    name: string;
    efficiency: number;
    unit: string;
    trend: string;
  }>;
  complianceRate: {
    rate: number;
    compliant: number;
    nonCompliant: number;
    monthOverMonth: number;
  };
  rankingList: Array<{
    id: number;
    enterprise: string;
    rank: number;
    efficiency: number;
    benchmark: number;
    delta: number;
    status: '合格' | '不合格';
  }>;
  trendData: Array<{
    month: string;
    value: number;
    benchmark: number;
  }>;
  detailedData: Array<{
    id: number;
    date: string;
    efficiency: number;
  }>;
}

export default function EfficiencyBenchmark() {
  const [data, setData] = useState<EfficiencyBenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indicatorName, setIndicatorName] = useState('单位面积电耗');
  const [managementLevel, setManagementLevel] = useState('二级区域');
  const [timeInterval, setTimeInterval] = useState<'day' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState('2025-01');
  const [endDate, setEndDate] = useState('2025-06');
  const [viewMode, setViewMode] = useState<'time' | 'management'>('time');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/efficiency-benchmark');
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
        console.error('获取能效对标数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [indicatorName, managementLevel, timeInterval, startDate, endDate]);

  // 模拟数据（基于图示样式）
  const mockData: EfficiencyBenchmarkData = {
    indicatorName: '单位面积电耗',
    managementLevel: '二级区域',
    timeInterval: 'month',
    startDate: '2025-01',
    endDate: '2025-06',
    rankCards: [
      {
        id: 1,
        rank: 1,
        name: '2号厂区',
        efficiency: 9.5,
        unit: 'kWh',
        trend: '+3'
      }
    ],
    complianceRate: {
      rate: 88,
      compliant: 88,
      nonCompliant: 12,
      monthOverMonth: 16.46
    },
    rankingList: [
      {
        id: 1,
        enterprise: '2号厂区',
        rank: 1,
        efficiency: 9.5,
        benchmark: 10.0,
        delta: 0.5,
        status: '合格'
      },
      {
        id: 2,
        enterprise: '办公楼',
        rank: 2,
        efficiency: 12.3,
        benchmark: 10.0,
        delta: -2.3,
        status: '不合格'
      },
      {
        id: 3,
        enterprise: '配电房',
        rank: 3,
        efficiency: 15.8,
        benchmark: 10.0,
        delta: -5.8,
        status: '不合格'
      },
      {
        id: 4,
        enterprise: '生产车间',
        rank: 4,
        efficiency: 18.2,
        benchmark: 10.0,
        delta: -8.2,
        status: '不合格'
      },
      {
        id: 5,
        enterprise: '仓库',
        rank: 5,
        efficiency: 22.1,
        benchmark: 10.0,
        delta: -12.1,
        status: '不合格'
      }
    ],
    trendData: [
      { month: '2025-01', value: 25.46, benchmark: 10.0 },
      { month: '2025-02', value: 22.3, benchmark: 10.0 },
      { month: '2025-03', value: 18.7, benchmark: 10.0 },
      { month: '2025-04', value: 15.2, benchmark: 10.0 },
      { month: '2025-05', value: 12.8, benchmark: 10.0 },
      { month: '2025-06', value: 9.5, benchmark: 10.0 }
    ],
    detailedData: [
      { id: 1, date: '2025-01', efficiency: 25.46 },
      { id: 2, date: '2025-02', efficiency: 22.3 },
      { id: 3, date: '2025-03', efficiency: 18.7 },
      { id: 4, date: '2025-04', efficiency: 15.2 },
      { id: 5, date: '2025-05', efficiency: 12.8 },
      { id: 6, date: '2025-06', efficiency: 9.5 }
    ]
  };

  const displayData = data || mockData;

  // 合格占比饼图配置
  const complianceChartOption = {
    title: {
      text: '合格占比',
      left: 'center',
      top: '20%',
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
        name: '合格占比',
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '60%'],
        data: [
          { 
            value: displayData.complianceRate.compliant, 
            name: '合格',
            itemStyle: { color: '#10B981' }
          },
          { 
            value: displayData.complianceRate.nonCompliant, 
            name: '不合格',
            itemStyle: { color: '#EF4444' }
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
          formatter: '{b}: {c}%',
          fontSize: 12,
          color: '#374151'
        }
      }
    ]
  };

  // 趋势图配置
  const trendChartOption = {
    title: {
      text: '2号厂区单位面积电耗趋势',
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
          result += `${item.marker}${item.seriesName}: ${item.value} kWh<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['实际值', '基准值'],
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
      data: displayData.trendData.map(item => item.month),
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: {
      type: 'value',
      name: '单位面积电耗(kWh)',
      nameTextStyle: {
        color: '#6B7280'
      },
      axisLabel: {
        color: '#6B7280'
      }
    },
    series: [
      {
        name: '实际值',
        type: 'line',
        data: displayData.trendData.map(item => item.value),
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
        name: '基准值',
        type: 'line',
        data: displayData.trendData.map(item => item.benchmark),
        smooth: true,
        lineStyle: {
          color: '#EF4444',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#EF4444'
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">能效对标</h1>
          <p className="text-gray-600 dark:text-gray-300">能效考核与分析</p>
        </div>

        {/* 筛选条件 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                指标名称
              </label>
              <select
                value={indicatorName}
                onChange={(e) => setIndicatorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="单位面积电耗">单位面积电耗</option>
                <option value="单位产值电耗">单位产值电耗</option>
                <option value="单位产品电耗">单位产品电耗</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                管理层级
              </label>
              <select
                value={managementLevel}
                onChange={(e) => setManagementLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="二级区域">二级区域</option>
                <option value="三级区域">三级区域</option>
                <option value="四级区域">四级区域</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                时间间隔
              </label>
              <div className="flex space-x-2">
                {(['day', 'month', 'year'] as const).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setTimeInterval(interval)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
             <div className="lg:col-span-1">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 时间段
               </label>
               <div className="flex items-center space-x-1">
                 <input
                   type="text"
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-20 px-1 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                   placeholder="2025-01"
                 />
                 <span className="text-gray-500 text-sm px-1">至</span>
                 <input
                   type="text"
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-20 px-1 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                   placeholder="2025-06"
                 />
               </div>
             </div>
          </div>
        </div>

        {/* 排名卡片和合格占比 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 排名NO 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">排名NO 1</h3>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {displayData.rankCards[0]?.name || '2号厂区'}
              </div>
              <div className="text-lg text-gray-600 dark:text-gray-300">
                {displayData.indicatorName}: {displayData.rankCards[0]?.efficiency || 9.5} kWh
              </div>
            </div>
          </div>

          {/* 合格占比 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">合格占比</h3>
            <div className="flex items-center justify-center">
              <div className="w-32 h-32">
                <ReactECharts
                  option={complianceChartOption}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">月环比</div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-green-500 text-lg font-semibold">
                  +{displayData.complianceRate.monthOverMonth}%
                </span>
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 排名表格和趋势图 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 排名表格 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">排名列表</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      排名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {displayData.indicatorName}(kWh)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      考核情况
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      排名变化
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayData.rankingList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.rank}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.enterprise}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.efficiency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === '合格' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <span className={`${
                          item.delta > 0 ? 'text-red-500' : item.delta < 0 ? 'text-green-500' : 'text-gray-500'
                        }`}>
                          {item.delta > 0 ? '+' : ''}{item.delta}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 趋势图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ReactECharts
              option={trendChartOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        </div>

        {/* 详细数据表格 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">详细数据</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('time')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'time'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  按时间
                </button>
                <button
                  onClick={() => setViewMode('management')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'management'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  按管理层
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    序号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {displayData.indicatorName}(kWh)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayData.detailedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.efficiency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
     