'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface FlowAnalysisData {
  energyType: string;
  timeInterval: 'day' | 'month' | 'year';
  startDate: string;
  endDate: string;
  spatialDimensions: Array<{
    id: string;
    name: string;
    level: number;
    parentId?: string;
    selected: boolean;
  }>;
  balanceTable: Array<{
    id: number;
    level1: string;
    level2: string;
    balanceDiff: number;
    imbalanceRate: number;
  }>;
  sankeyData: {
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
      type: string;
    }>;
  };
}

export default function FlowAnalysis() {
  const [data, setData] = useState<FlowAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [energyType, setEnergyType] = useState('电');
  const [timeInterval, setTimeInterval] = useState<'day' | 'month' | 'year'>('day');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-01-31');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/energy/flow-analysis');
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
        console.error('获取能流分析数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [energyType, timeInterval, startDate, endDate]);

  // 模拟数据（基于图示样式）
  const mockData: FlowAnalysisData = {
    energyType: '电',
    timeInterval: 'day',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    spatialDimensions: [
      { id: '1', name: '欧冶链金（萍乡）再生资源有限公司', level: 1, selected: true },
      { id: '1-1', name: '1号厂区', level: 2, parentId: '1', selected: true },
      { id: '1-1-1', name: '机械加工生产线', level: 3, parentId: '1-1', selected: true },
      { id: '1-1-1-1', name: '下料', level: 4, parentId: '1-1-1', selected: true },
      { id: '1-1-1-2', name: '航车', level: 4, parentId: '1-1-1', selected: true },
      { id: '1-1-1-3', name: '机械臂', level: 4, parentId: '1-1-1', selected: true },
      { id: '1-1-1-4', name: '粗加工', level: 4, parentId: '1-1-1', selected: true },
      { id: '1-1-1-5', name: '精加工', level: 4, parentId: '1-1-1', selected: true },
      { id: '1-1-2', name: '打包机2', level: 3, parentId: '1-1', selected: true },
      { id: '1-1-2-1', name: '打包机1', level: 4, parentId: '1-1-2', selected: true },
      { id: '1-1-2-2', name: '总装配', level: 4, parentId: '1-1-2', selected: true },
      { id: '1-1-2-3', name: '拆解抓机2', level: 4, parentId: '1-1-2', selected: true },
      { id: '1-1-3', name: '磅房', level: 3, parentId: '1-1', selected: true },
      { id: '1-1-3-1', name: '拆解抓机1', level: 4, parentId: '1-1-3', selected: true },
      { id: '1-1-3-2', name: '氧化', level: 4, parentId: '1-1-3', selected: true },
      { id: '1-1-3-3', name: '热处理', level: 4, parentId: '1-1-3', selected: true },
      { id: '1-1-3-4', name: '检验', level: 4, parentId: '1-1-3', selected: true },
      { id: '1-2', name: '2号厂区', level: 2, parentId: '1', selected: true },
      { id: '1-3', name: '3号厂区', level: 2, parentId: '1', selected: true },
      { id: '1-4', name: '4号厂区', level: 2, parentId: '1', selected: true },
      { id: '1-5', name: '办公楼', level: 2, parentId: '1', selected: true },
      { id: '1-5-1', name: '1层', level: 3, parentId: '1-5', selected: true },
      { id: '1-5-1-1', name: '电梯', level: 4, parentId: '1-5-1', selected: true },
      { id: '1-5-1-2', name: '会议室', level: 4, parentId: '1-5-1', selected: true },
      { id: '1-5-1-3', name: '办公室', level: 4, parentId: '1-5-1', selected: true },
      { id: '1-5-2', name: '2层', level: 3, parentId: '1-5', selected: true },
      { id: '1-5-3', name: '3层', level: 3, parentId: '1-5', selected: true },
      { id: '1-5-4', name: '4层', level: 3, parentId: '1-5', selected: true },
      { id: '1-6', name: '食堂', level: 2, parentId: '1', selected: true },
      { id: '1-7', name: '配电房', level: 2, parentId: '1', selected: true }
    ],
    balanceTable: [
      { id: 1, level1: '一层级', level2: '二层级', balanceDiff: 200, imbalanceRate: 15 },
      { id: 2, level1: '二层级', level2: '三层级', balanceDiff: 20, imbalanceRate: 2 },
      { id: 3, level1: '三层级', level2: '四层级', balanceDiff: 0, imbalanceRate: 0 },
      { id: 4, level1: '四层级', level2: '五层级', balanceDiff: 43, imbalanceRate: 5 },
      { id: 5, level1: '五层级', level2: '末级层级', balanceDiff: 21, imbalanceRate: 3 }
    ],
    sankeyData: {
      nodes: [
        { id: 'company', name: '欧冶链金（萍乡）再生资源有限公司', value: 1000, level: 0 },
        { id: 'factory1', name: '1号厂区', value: 400, level: 1 },
        { id: 'factory2', name: '2号厂区', value: 200, level: 1 },
        { id: 'factory3', name: '3号厂区', value: 150, level: 1 },
        { id: 'factory4', name: '4号厂区', value: 100, level: 1 },
        { id: 'office', name: '办公楼', value: 80, level: 1 },
        { id: 'canteen', name: '食堂', value: 50, level: 1 },
        { id: 'power', name: '配电房', value: 20, level: 1 },
        { id: 'machining', name: '机械加工生产线', value: 200, level: 2 },
        { id: 'assembly', name: '装配生产线', value: 120, level: 2 },
        { id: 'surface', name: '表面处理生产线', value: 80, level: 2 },
        { id: 'floor1', name: '1层', value: 40, level: 2 },
        { id: 'floor2', name: '2层', value: 20, level: 2 },
        { id: 'floor3', name: '3层', value: 15, level: 2 },
        { id: 'floor4', name: '4层', value: 5, level: 2 },
        { id: 'blanking', name: '下料', value: 50, level: 3 },
        { id: 'crane', name: '起重机', value: 30, level: 3 },
        { id: 'robot', name: '机械臂', value: 40, level: 3 },
        { id: 'rough', name: '粗加工', value: 60, level: 3 },
        { id: 'fine', name: '精加工', value: 20, level: 3 },
        { id: 'component', name: '零部件装配', value: 70, level: 3 },
        { id: 'final', name: '总装配', value: 30, level: 3 },
        { id: 'packaging', name: '包装与标识', value: 20, level: 3 },
        { id: 'painting', name: '喷漆', value: 30, level: 3 },
        { id: 'oxidation', name: '氧化', value: 25, level: 3 },
        { id: 'heat', name: '热处理', value: 15, level: 3 },
        { id: 'inspection', name: '检验', value: 10, level: 3 },
        { id: 'lab', name: '实验室', value: 15, level: 3 },
        { id: 'meeting', name: '会议室', value: 10, level: 3 },
        { id: 'office_room', name: '办公室', value: 15, level: 3 }
      ],
      links: [
        { source: 'company', target: 'factory1', value: 400, type: 'main' },
        { source: 'company', target: 'factory2', value: 200, type: 'main' },
        { source: 'company', target: 'factory3', value: 150, type: 'main' },
        { source: 'company', target: 'factory4', value: 100, type: 'main' },
        { source: 'company', target: 'office', value: 80, type: 'main' },
        { source: 'company', target: 'canteen', value: 50, type: 'main' },
        { source: 'company', target: 'power', value: 20, type: 'main' },
        { source: 'factory1', target: 'machining', value: 200, type: 'production' },
        { source: 'factory1', target: 'assembly', value: 120, type: 'production' },
        { source: 'factory1', target: 'surface', value: 80, type: 'production' },
        { source: 'office', target: 'floor1', value: 40, type: 'floor' },
        { source: 'office', target: 'floor2', value: 20, type: 'floor' },
        { source: 'office', target: 'floor3', value: 15, type: 'floor' },
        { source: 'office', target: 'floor4', value: 5, type: 'floor' },
        { source: 'machining', target: 'blanking', value: 50, type: 'process' },
        { source: 'machining', target: 'crane', value: 30, type: 'process' },
        { source: 'machining', target: 'robot', value: 40, type: 'process' },
        { source: 'machining', target: 'rough', value: 60, type: 'process' },
        { source: 'machining', target: 'fine', value: 20, type: 'process' },
        { source: 'assembly', target: 'component', value: 70, type: 'process' },
        { source: 'assembly', target: 'final', value: 30, type: 'process' },
        { source: 'assembly', target: 'packaging', value: 20, type: 'process' },
        { source: 'surface', target: 'painting', value: 30, type: 'process' },
        { source: 'surface', target: 'oxidation', value: 25, type: 'process' },
        { source: 'surface', target: 'heat', value: 15, type: 'process' },
        { source: 'surface', target: 'inspection', value: 10, type: 'process' },
        { source: 'floor1', target: 'lab', value: 15, type: 'room' },
        { source: 'floor1', target: 'meeting', value: 10, type: 'room' },
        { source: 'floor1', target: 'office_room', value: 15, type: 'room' }
      ]
    }
  };

  const displayData = data || mockData;

  // Sankey 图配置
  const sankeyChartOption = {
    title: {
      text: '能流分析图',
      left: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: function(params: any) {
        if (params.dataType === 'node') {
          return `${params.data.name}<br/>能耗: ${params.data.value} kWh`;
        } else if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>流量: ${params.data.value} kWh`;
        }
        return '';
      }
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        data: displayData.sankeyData.nodes,
        links: displayData.sankeyData.links,
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">能流分析</h1>
          <p className="text-gray-600 dark:text-gray-300">能源流向分析与可视化</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧空间维度选择 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">空间维度</h3>
              <div className="space-y-2">
                {displayData.spatialDimensions.map((item) => (
                  <div key={item.id} className={`flex items-center space-x-2 ${item.level > 1 ? 'ml-4' : ''}`}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      {item.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧主要内容区域 */}
          <div className="lg:col-span-3">
            {/* 控制面板 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                {/* 能源类型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    能源类型
                  </label>
                  <div className="flex space-x-4">
                    {['电', '水', '煤', '柴油', '汽油', '天然气', '液化石油气', '热'].map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="energyType"
                          value={type}
                          checked={energyType === type}
                          onChange={(e) => setEnergyType(e.target.value)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 时间间隔选择 */}
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

                {/* 时间段选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    时间段
                  </label>
                  <div className="flex items-center space-x-2">
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
            </div>


            {/* Sankey 图 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <ReactECharts
                option={sankeyChartOption}
                style={{ height: '600px', width: '100%' }}
              />
            </div>

            {/* 层级间平衡差额表 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">层级间平衡差额</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        层级对比
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        层级间平衡差额 (kWh)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        不平衡率 (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayData.balanceTable.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.level1}与{item.level2}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.balanceDiff > 0 ? item.balanceDiff : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.imbalanceRate > 0 ? `${item.imbalanceRate}%` : '-'}
                        </td>
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
            