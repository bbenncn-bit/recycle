'use client';

import { useState, useEffect } from 'react';
import LazyReactECharts from '@/components/lazy-react-echarts';

interface ConsumptionData {
  trend: any[];
  monthSummary: any[];
  typeComparison: any[];
}

export default function ConsumptionQuery() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/consumption-query');
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
        console.error('获取能耗查询数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 模拟数据（当数据库为空时使用）
  const mockData = {
    energyCards: [
      { name: '电力消费量', monthly: '65355.22', annual: '10159.13', unit: 'kWh', icon: '⚡' },
      { name: '煤消费量', monthly: '579.23', annual: '102000.12', unit: 't', icon: '🪨' },
      { name: '热力消费量', monthly: '1740.23', annual: '1032000.12', unit: 'GJ', icon: '🔥' },
      { name: '天然气消费量', monthly: '488.66', annual: '132317.43', unit: 'm³', icon: '⛽' },
      { name: '光伏发电量', monthly: '2388.23', annual: '432000.12', unit: 'kWh', icon: '☀️' },
      { name: '油消费量', monthly: '150.41', annual: '10151.35', unit: 'kg', icon: '🛢️' }
    ],
    realTimeData: {
      totalDevices: 25,
      onlineDevices: 24,
      offlineDevices: 1,
      currentValue: '2433.25',
      unit: 'kWh'
    },
    todayConsumption: [
      { time: '00:00', value: 120 },
      { time: '01:00', value: 95 },
      { time: '02:00', value: 80 },
      { time: '03:00', value: 85 },
      { time: '04:00', value: 150 },
      { time: '05:00', value: 180 },
      { time: '06:00', value: 160 },
      { time: '07:00', value: 200 },
      { time: '08:00', value: 280 },
      { time: '09:00', value: 320 },
      { time: '10:00', value: 300 },
      { time: '11:00', value: 280 },
      { time: '12:00', value: 350 }
    ],
    strategies: [
      {
        id: '01',
        title: '清洁能源占比分析与优化建议',
        content: '当前本年度清洁电力占比10.55%，建议增加光伏发电设备投入',
        time: '2025-06-30 11:20',
        status: 'warning'
      },
      {
        id: '02',
        title: '电力需求响应调度',
        content: '预提醒：下一次电力需求响应将于14:00',
        time: '2025-06-30 08:45',
        status: 'info'
      },
      {
        id: '03',
        title: '电力三相平衡诊断优化',
        content: '电力三相平衡正常',
        time: '2025-06-30 11:20',
        status: 'success'
      },
      {
        id: '04',
        title: '基于峰谷电价的储能系统',
        content: '当前时间为谷电时段，储能设备已开始充电',
        time: '2025-06-30 11:20',
        status: 'info'
      }
    ]
  };

  // 今日用能曲线图配置
  const todayConsumptionOption = {
    title: {
      text: '今日用能曲线',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
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
      data: mockData.todayConsumption.map(item => item.time),
      axisLine: {
        lineStyle: {
          color: '#E5E7EB'
        }
      },
      axisLabel: {
        color: '#6B7280'
      }
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
      axisLine: {
        lineStyle: {
          color: '#E5E7EB'
        }
      },
      axisLabel: {
        color: '#6B7280'
      },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6'
        }
      }
    },
    series: [
      {
        name: '用电量',
        type: 'line',
        smooth: true,
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
        },
        lineStyle: {
          color: '#3B82F6',
          width: 2
        },
        data: mockData.todayConsumption.map(item => item.value)
      }
    ]
  };

  // 能源类型对比图配置
  const energyTypeComparisonOption = {
    title: {
      text: '能源类型对比',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: '#6B7280'
      }
    },
    series: [
      {
        name: '能源消费',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 335, name: '电力', itemStyle: { color: '#3B82F6' } },
          { value: 310, name: '煤炭', itemStyle: { color: '#6B7280' } },
          { value: 234, name: '天然气', itemStyle: { color: '#10B981' } },
          { value: 135, name: '热力', itemStyle: { color: '#F59E0B' } },
          { value: 98, name: '石油', itemStyle: { color: '#EF4444' } }
        ]
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
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900">
     

      <div className="max-w-7xl mx-auto p-6">
        {/* 能源消费概览卡片 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">能源消费概览</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
                更新时间: {new Date().toLocaleString('zh-CN')}
              </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockData.energyCards.map((card, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl">{card.icon}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">月度/年度</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{card.name}</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-800 dark:text-white">
                      {card.monthly}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{card.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {card.annual}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{card.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 今日用能曲线 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <LazyReactECharts 
                option={todayConsumptionOption} 
                style={{ height: '400px', width: '100%' }}
              />
            </div>
          </div>

          {/* 实时监控数据 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                监控终端设备实时数据
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">监控设备总量</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {mockData.realTimeData.totalDevices}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">通讯在线数量</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {mockData.realTimeData.onlineDevices}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">通讯离线数量</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {mockData.realTimeData.offlineDevices}
                    </span>
                  </div>
                </div>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {mockData.realTimeData.currentValue}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {mockData.realTimeData.unit}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 能源类型对比 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <LazyReactECharts 
                option={energyTypeComparisonOption} 
                style={{ height: '400px', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}