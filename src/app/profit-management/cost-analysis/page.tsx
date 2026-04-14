'use client';

import { useState, useEffect } from 'react';
import LazyReactECharts from '@/components/lazy-react-echarts';
import { CostAnalysisSkeleton } from '@/components/profit-dashboard-skeletons';
import { normalizeMaterialCategoryLabel } from '@/lib/material-label';

/** 上月均价：先精确匹配料型名，再按规范化名称对齐（与后端 calculateCategoryCost 一致） */
function resolveLastMonthAvgPrice(
  category: string,
  lastCategories: string[],
  lastAvgPrices: number[]
): number {
  const cats = lastCategories || [];
  const prices = lastAvgPrices || [];
  const exact = cats.indexOf(category);
  if (exact >= 0) return prices[exact] ?? 0;
  const key = normalizeMaterialCategoryLabel(category);
  const idx = cats.findIndex((c) => normalizeMaterialCategoryLabel(c) === key);
  return idx >= 0 ? (prices[idx] ?? 0) : 0;
}

interface CostAnalysisData {
  summary: {
    todayCost: number;
    weekCost: number;
    monthCost: number;
    avgDailyCost: number;
    todayBaseSelfCost: number;
    todayBaseSelfQty: number;
    todayBasePurchaseCost: number;
    todayBasePurchaseQty: number;
    weekBaseSelfCost: number;
    weekBaseSelfQty: number;
    weekBasePurchaseCost: number;
    weekBasePurchaseQty: number;
    monthBaseSelfCost: number;
    monthBaseSelfQty: number;
    monthBasePurchaseCost: number;
    monthBasePurchaseQty: number;
  };
  weekCostBreakdown: {
    days: string[];
    baseSelf: number[];
    basePurchase: number[];
    collaboration: number[];
    dailyCategoryData?: Array<{
      date: string;
      baseSelfCategories: {
        categories: string[];
        costs: number[];
        avgPrices: number[];
        quantities: number[];
      };
    }>;
  };
  dailyTrend: {
    dates: string[];
    baseSelf: number[]; // 基地收货（SH）
    basePurchase: number[]; // 基地买货（TH）
    collaboration: number[]; // 协同业务（其他）
    baseSelfQty: number[];
    basePurchaseQty: number[];
    collaborationQty: number[];
  };
  categoryDistributionBaseSelf: {
    categories: string[];
    costs: number[];
    percentages: number[];
    avgPrices: number[]; // 平均单价（元/吨）
    quantities: number[]; // 数量（吨）
  };
  categoryDistributionBasePurchase: {
    categories: string[];
    costs: number[];
    percentages: number[];
    avgPrices: number[]; // 平均单价（元/吨）
    quantities: number[]; // 数量（吨）
  };
  lastMonthCategoryDistributionBaseSelf: {
    categories: string[];
    avgPrices: number[]; // 平均单价（元/吨）
  };
  lastMonthCategoryDistributionBasePurchase: {
    categories: string[];
    avgPrices: number[]; // 平均单价（元/吨）
  };
  baseSelfDailyUnitCost: {
    dates: string[];
    purchaseCost: number[]; // 基地收货业务废钢采购成本（万元）
    fixedCost: number[]; // 固定成本（万元）
    variableCost: number[]; // 变动成本（万元）
    processingQuantity: number[]; // 加工量（吨）
  };
}

export default function CostAnalysis() {
  const [data, setData] = useState<CostAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/profit-management/cost-analysis');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || '获取数据失败');
        }
      } catch (err) {
        console.error('获取成本分析数据失败:', err);
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        setError(errorMessage);
        // 即使出错也设置空数据，避免页面崩溃
        setData({
          summary: {
            todayCost: 0,
            weekCost: 0,
            monthCost: 0,
            avgDailyCost: 0,
            todayBaseSelfCost: 0,
            todayBaseSelfQty: 0,
            todayBasePurchaseCost: 0,
            todayBasePurchaseQty: 0,
            weekBaseSelfCost: 0,
            weekBaseSelfQty: 0,
            weekBasePurchaseCost: 0,
            weekBasePurchaseQty: 0,
            monthBaseSelfCost: 0,
            monthBaseSelfQty: 0,
            monthBasePurchaseCost: 0,
            monthBasePurchaseQty: 0,
          },
          weekCostBreakdown: {
            days: [],
            baseSelf: [],
            basePurchase: [],
            collaboration: [],
          },
          dailyTrend: {
            dates: [],
            baseSelf: [],
            basePurchase: [],
            collaboration: [],
            baseSelfQty: [],
            basePurchaseQty: [],
            collaborationQty: [],
          },
          categoryDistributionBaseSelf: {
            categories: [],
            costs: [],
            percentages: [],
            avgPrices: [],
            quantities: [],
          },
          categoryDistributionBasePurchase: {
            categories: [],
            costs: [],
            percentages: [],
            avgPrices: [],
            quantities: [],
          },
          lastMonthCategoryDistributionBaseSelf: {
            categories: [],
            avgPrices: [],
          },
          lastMonthCategoryDistributionBasePurchase: {
            categories: [],
            avgPrices: [],
          },
          baseSelfDailyUnitCost: {
            dates: [],
            purchaseCost: [],
            fixedCost: [],
            variableCost: [],
            processingQuantity: [],
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setExportStartDate(`${yyyy}-${mm}-01`);
    setExportEndDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const handleExportData = async () => {
    if (!exportStartDate || !exportEndDate) {
      alert('请选择导出日期范围');
      return;
    }
    if (exportStartDate > exportEndDate) {
      alert('开始日期不能晚于结束日期');
      return;
    }
    try {
      setExporting(true);
      const params = new URLSearchParams({
        startDate: exportStartDate,
        endDate: exportEndDate,
      });
      const response = await fetch(`/api/profit-management/cost-analysis/export?${params.toString()}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || '导出失败');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `成本分析明细_${exportStartDate}_至_${exportEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出失败';
      alert(msg);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <CostAnalysisSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            <p className="font-medium">加载失败</p>
            <p className="mt-1 text-sm opacity-90">{error}</p>
          </div>
        </div>
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

  // 日成本趋势图配置（堆叠面积图）
  const dailyTrendOption = {
    title: {
      text: '日成本趋势（最近30天）',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params: any) => {
        let result = params[0].name + '<br/>';
        let totalCost = 0;
        let totalQty = 0;
        const idx = params?.[0]?.dataIndex ?? 0;
        const selfQty = data.dailyTrend.baseSelfQty?.[idx] ?? 0;
        const purchaseQty = data.dailyTrend.basePurchaseQty?.[idx] ?? 0;
        const collaborationQty = data.dailyTrend.collaborationQty?.[idx] ?? 0;
        // 按顺序显示：基地收货、基地买货、协同业务
        const order = ['基地收货', '基地买货', '协同业务'];
        order.forEach(seriesName => {
          const param = params.find((p: any) => p.seriesName === seriesName);
          if (param) {
            const qty =
              seriesName === '基地收货' ? selfQty :
              seriesName === '基地买货' ? purchaseQty :
              collaborationQty;
            result += `${param.marker}${param.seriesName}: ${qty.toFixed(2)} 吨，合计 ${param.value.toFixed(2)} 万元<br/>`;
            totalCost += param.value;
            totalQty += qty;
          }
        });
        result += `<b>总计: ${totalQty.toFixed(2)} 吨，${totalCost.toFixed(2)} 万元</b>`;
        return result;
      }
    },
    legend: {
      data: ['基地收货', '基地买货', '协同业务'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dailyTrend.dates.map(date => {
        // 格式化日期显示：只显示月-日
        const parts = date.split('-');
        return `${parts[1]}-${parts[2]}`;
      }),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '成本（万元）'
    },
    series: [
      {
        name: '基地收货',
        type: 'line',
        stack: 'total', // 堆叠标识，所有使用相同stack值的系列会堆叠在一起
        smooth: true, // 堆叠面积图通常不使用平滑曲线
        areaStyle: {
          opacity: 0.8 // 使用不透明度而不是渐变，让堆叠效果更明显
        },
        itemStyle: {
          color: '#5470c6' // 蓝色 - 基地收货（底层）
        },
        lineStyle: {
          color: '#5470c6',
          width: 1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.dailyTrend.baseSelf || []
      },
      {
        name: '基地买货',
        type: 'line',
        stack: 'total', // 与基地收货使用相同的stack值，会堆叠在基地收货之上
        smooth: true,
        areaStyle: {
          opacity: 0.8
        },
        itemStyle: {
          color: '#91cc75' // 绿色 - 基地买货（中层）
        },
        lineStyle: {
          color: '#91cc75',
          width: 1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.dailyTrend.basePurchase || []
      },
      {
        name: '协同业务',
        type: 'line',
        // stack: 'total', // 与前面两个使用相同的stack值，会堆叠在最上层
        smooth: false,
        areaStyle: {
          opacity: 0.8
        },
        itemStyle: {
          color: '#fac858' // 黄色 - 协同业务（顶层）
        },
        lineStyle: {
          color: '#fac858',
          width: 1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.dailyTrend.collaboration || []
      }
    ]
  };

  // 基地收货（SH）废钢类型成本分布饼图配置
  const categoryPieOptionBaseSelf = {
    title: {
      text: '当月基地收货废钢类型成本分布',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const index = data.categoryDistributionBaseSelf.categories.indexOf(params.name);
        const avgPrice = index >= 0 ? data.categoryDistributionBaseSelf.avgPrices[index] : 0;
        const quantity = index >= 0 ? data.categoryDistributionBaseSelf.quantities[index] : 0;
        const costYuan = (Number(params.value) || 0) * 10000;
        return `${params.name}<br/>成本: ${costYuan.toFixed(2)} 元<br/>平均单价: ${avgPrice.toFixed(2)} 元/吨<br/>数量: ${quantity.toFixed(2)} 吨<br/>占比: ${params.percent.toFixed(2)}%`;
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        name: '成本分布',
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
          formatter: (params: any) => {
            const index = data.categoryDistributionBaseSelf.categories.indexOf(params.name);
            const avgPrice = index >= 0 ? data.categoryDistributionBaseSelf.avgPrices[index] : 0;
            const quantity = index >= 0 ? data.categoryDistributionBaseSelf.quantities[index] : 0;
            const costYuan = (Number(params.value) || 0) * 10000;
            return `${params.name}\n成本:${costYuan.toFixed(2)}元\n平均单价:${avgPrice.toFixed(2)}元/吨\n数量:${quantity.toFixed(2)}吨\n(${params.percent.toFixed(2)}%)`;
          }
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: data.categoryDistributionBaseSelf.categories.map((category, index) => ({
          value: parseFloat(data.categoryDistributionBaseSelf.costs[index].toFixed(2)),
          name: category
        }))
      }
    ]
  };

  // 基地买货（TH）废钢类型成本分布饼图配置
  const categoryPieOptionBasePurchase = {
    title: {
      text: '当月基地买货废钢类型成本分布',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const index = data.categoryDistributionBasePurchase.categories.indexOf(params.name);
        const avgPrice = index >= 0 ? data.categoryDistributionBasePurchase.avgPrices[index] : 0;
        const quantity = index >= 0 ? data.categoryDistributionBasePurchase.quantities[index] : 0;
        return `${params.name}<br/>成本: ${params.value.toFixed(2)} 万元<br/>占比: ${params.percent.toFixed(2)}%<br/>平均单价: ${avgPrice.toFixed(2)} 元/吨<br/>数量: ${quantity.toFixed(2)} 吨`;
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        name: '成本分布',
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
          formatter: '{b}: {c}万元\n({d}%)'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: data.categoryDistributionBasePurchase.categories.map((category, index) => ({
          value: parseFloat(data.categoryDistributionBasePurchase.costs[index].toFixed(2)),
          name: category
        }))
      }
    ]
  };

  // 基地收货（SH）废钢类型成本对比柱状图配置（当月 vs 上月平均每吨采购成本）
  // 只显示前7个占比最高的料型
  const top7BaseSelfCategories = data.categoryDistributionBaseSelf.categories
    .slice(0, 7) // 只取前7个（已按成本从高到低排序）
    .filter(category => {
      const currentIndex = data.categoryDistributionBaseSelf.categories.indexOf(category);
      const currentPrice = currentIndex >= 0 ? data.categoryDistributionBaseSelf.avgPrices[currentIndex] : 0;
      // 过滤掉单价超过3000元/吨的料型
      return currentPrice <= 3000 && currentPrice > 0;
    });
  
  // 获取这些料型对应的上月数据
  const allBaseSelfCategories = top7BaseSelfCategories.filter(category => {
    const currentIndex = data.categoryDistributionBaseSelf.categories.indexOf(category);
    const currentPrice = currentIndex >= 0 ? data.categoryDistributionBaseSelf.avgPrices[currentIndex] : 0;
    const lastPrice = resolveLastMonthAvgPrice(
      category,
      data.lastMonthCategoryDistributionBaseSelf?.categories || [],
      data.lastMonthCategoryDistributionBaseSelf?.avgPrices || []
    );
    // 只要当月或上月有数据就显示
    return currentPrice > 0 || lastPrice > 0;
  });
  
  const categoryBarOptionBaseSelf = {
    title: {
      text: '基地收货废钢类型平均每吨采购成本对比（当月 vs 上月）',
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
      },
      formatter: (params: any) => {
        const category = params[0].name;
        const currentIndex = data.categoryDistributionBaseSelf.categories.indexOf(category);
        const currentPrice = currentIndex >= 0 ? data.categoryDistributionBaseSelf.avgPrices[currentIndex] : 0;
        const lastPrice = resolveLastMonthAvgPrice(
          category,
          data.lastMonthCategoryDistributionBaseSelf?.categories || [],
          data.lastMonthCategoryDistributionBaseSelf?.avgPrices || []
        );
        let result = category + '<br/>';
        result += `上月平均单价: ${lastPrice.toFixed(2)} 元/吨<br/>`;
        result += `当月平均单价: ${currentPrice.toFixed(2)} 元/吨`;
        return result;
      }
    },
    legend: {
      data: [
        { name: '上月平均单价', icon: 'rect', itemStyle: { color: '#1890ff' } },
        { name: '当月平均单价', icon: 'rect', itemStyle: { color: '#52c41a' } }
      ],
      bottom: 0
    },
    grid: {
      left: '15%', // 增加左侧空间以容纳料型名称
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: false // 不自动包含标签，手动控制
    },
    xAxis: {
      type: 'value',
      name: '平均单价（元/吨）',
      min: 1000,
      max: 2800,
      interval: 200 // 每200元一个刻度
    },
    yAxis: {
      type: 'category',
      data: allBaseSelfCategories,
      axisLabel: {
        interval: 0
      }
    },
    series: [
      {
        name: '上月平均单价',
        type: 'bar',
        data: allBaseSelfCategories.map(category => {
          const lastPrice = resolveLastMonthAvgPrice(
            category,
            data.lastMonthCategoryDistributionBaseSelf?.categories || [],
            data.lastMonthCategoryDistributionBaseSelf?.avgPrices || []
          );
          return parseFloat(lastPrice.toFixed(2));
        }),
        itemStyle: {
          color: '#1890ff' // 蓝色
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            return params.value > 0 ? `${params.value.toFixed(2)}` : '';
          }
        },
        barWidth: '40%',
        barGap: '10%' // 同一类别内柱子之间的间距，让两根柱子紧挨着
      },
      {
        name: '当月平均单价',
        type: 'bar',
        data: allBaseSelfCategories.map(category => {
          const currentIndex = data.categoryDistributionBaseSelf.categories.indexOf(category);
          const currentPrice = currentIndex >= 0 ? data.categoryDistributionBaseSelf.avgPrices[currentIndex] : 0;
          return parseFloat(currentPrice.toFixed(2));
        }),
        itemStyle: {
          color: '#52c41a' // 绿色
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            return params.value > 0 ? `${params.value.toFixed(2)}` : '';
          }
        },
        barWidth: '40%',
        barGap: '10%' // 同一类别内柱子之间的间距，让两根柱子紧挨着
      }
    ]
  };

  // 基地买货（TH）废钢类型成本对比柱状图配置（当月 vs 上月平均每吨采购成本）
  // 只显示前7个占比最高的料型
  const top7BasePurchaseCategories = data.categoryDistributionBasePurchase.categories
    .slice(0, 7) // 只取前7个（已按成本从高到低排序）
    .filter(category => {
      const currentIndex = data.categoryDistributionBasePurchase.categories.indexOf(category);
      const currentPrice = currentIndex >= 0 ? data.categoryDistributionBasePurchase.avgPrices[currentIndex] : 0;
      // 过滤掉单价超过3000元/吨的料型
      return currentPrice <= 3000 && currentPrice > 0;
    });
  
  // 获取这些料型对应的上月数据
  const allBasePurchaseCategories = top7BasePurchaseCategories.filter(category => {
    const currentIndex = data.categoryDistributionBasePurchase.categories.indexOf(category);
    const currentPrice = currentIndex >= 0 ? data.categoryDistributionBasePurchase.avgPrices[currentIndex] : 0;
    const lastPrice = resolveLastMonthAvgPrice(
      category,
      data.lastMonthCategoryDistributionBasePurchase?.categories || [],
      data.lastMonthCategoryDistributionBasePurchase?.avgPrices || []
    );
    // 只要当月或上月有数据就显示
    return currentPrice > 0 || lastPrice > 0;
  });
  
  const categoryBarOptionBasePurchase = {
    title: {
      text: '基地买货废钢类型平均每吨采购成本对比（当月 vs 上月）',
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
      },
      formatter: (params: any) => {
        const category = params[0].name;
        const currentIndex = data.categoryDistributionBasePurchase.categories.indexOf(category);
        const currentPrice = currentIndex >= 0 ? data.categoryDistributionBasePurchase.avgPrices[currentIndex] : 0;
        const lastPrice = resolveLastMonthAvgPrice(
          category,
          data.lastMonthCategoryDistributionBasePurchase?.categories || [],
          data.lastMonthCategoryDistributionBasePurchase?.avgPrices || []
        );
        let result = category + '<br/>';
        result += `上月平均单价: ${lastPrice.toFixed(2)} 元/吨<br/>`;
        result += `当月平均单价: ${currentPrice.toFixed(2)} 元/吨`;
        return result;
      }
    },
    legend: {
      data: [
        { name: '上月平均单价', icon: 'rect', itemStyle: { color: '#1890ff' } },
        { name: '当月平均单价', icon: 'rect', itemStyle: { color: '#52c41a' } }
      ],
      bottom: 0
    },
    grid: {
      left: '15%', // 增加左侧空间以容纳料型名称
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: false // 不自动包含标签，手动控制
    },
    xAxis: {
      type: 'value',
      name: '平均单价（元/吨）',
      min: 1000,
      max: 2800,
      interval: 200 // 每200元一个刻度
    },
    yAxis: {
      type: 'category',
      data: allBasePurchaseCategories,
      axisLabel: {
        interval: 0
      }
    },
    series: [
      {
        name: '上月平均单价',
        type: 'bar',
        data: allBasePurchaseCategories.map(category => {
          const lastPrice = resolveLastMonthAvgPrice(
            category,
            data.lastMonthCategoryDistributionBasePurchase?.categories || [],
            data.lastMonthCategoryDistributionBasePurchase?.avgPrices || []
          );
          return parseFloat(lastPrice.toFixed(2));
        }),
        itemStyle: {
          color: '#1890ff' // 蓝色
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            return params.value > 0 ? `${params.value.toFixed(2)}` : '';
          }
        },
        barWidth: '40%',
        barGap: '10%' // 同一类别内柱子之间的间距，让两根柱子紧挨着
      },
      {
        name: '当月平均单价',
        type: 'bar',
        data: allBasePurchaseCategories.map(category => {
          const currentIndex = data.categoryDistributionBasePurchase.categories.indexOf(category);
          const currentPrice = currentIndex >= 0 ? data.categoryDistributionBasePurchase.avgPrices[currentIndex] : 0;
          return parseFloat(currentPrice.toFixed(2));
        }),
        itemStyle: {
          color: '#52c41a' // 绿色
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            return params.value > 0 ? `${params.value.toFixed(2)}` : '';
          }
        },
        barWidth: '40%',
        barGap: '10%' // 同一类别内柱子之间的间距，让两根柱子紧挨着
      }
    ]
  };

  // 基地收货日单位成本堆叠面积图配置
  const baseSelfDailyUnitCostOption = {
    title: {
      text: '基地收货日单位成本（最近30天）',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params: any) => {
        let result = params[0].name + '<br/>';
        let total = 0;
        const order = ['基地收货业务废钢采购成本', '固定成本', '变动成本'];
        order.forEach(seriesName => {
          const param = params.find((p: any) => p.seriesName === seriesName);
          if (param) {
            result += `${param.marker}${param.seriesName}: ${param.value.toFixed(2)} 万元<br/>`;
            total += param.value;
          }
        });
        // 获取加工量数据
        const dateIndex = (data.baseSelfDailyUnitCost?.dates || []).indexOf(params[0].name);
        const processingQty = dateIndex >= 0 ? (data.baseSelfDailyUnitCost?.processingQuantity[dateIndex] || 0) : 0;
        result += `<b>总计: ${total.toFixed(2)} 万元</b><br/>`;
        result += `<b>当日加工量: ${processingQty.toFixed(2)} 吨</b>`;
        return result;
      }
    },
    legend: {
      data: ['基地收货业务废钢采购成本', '固定成本', '变动成本'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: (data.baseSelfDailyUnitCost?.dates || []).map(date => {
        // 格式化日期显示：只显示月-日
        const parts = date.split('-');
        return `${parts[1]}-${parts[2]}`;
      }),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '成本（万元）'
    },
    series: [
      {
        name: '基地收货业务废钢采购成本',
        type: 'line',
        stack: 'total',
        smooth: false,
        areaStyle: {
          opacity: 0.8
        },
        itemStyle: {
          color: '#5470c6' // 蓝色
        },
        lineStyle: {
          color: '#5470c6',
          width: 1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.baseSelfDailyUnitCost?.purchaseCost || []
      },
      {
        name: '固定成本',
        type: 'line',
        stack: 'total',
        smooth: false,
        areaStyle: {
          opacity: 0.8
        },
        itemStyle: {
          color: '#91cc75' // 绿色
        },
        lineStyle: {
          color: '#91cc75',
          width: 1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.baseSelfDailyUnitCost?.fixedCost || []
      },
      {
        name: '变动成本',
        type: 'line',
        stack: 'total',
        smooth: false,
        areaStyle: {
          opacity: 0.8
        },
        itemStyle: {
          color: '#fac858' // 黄色
        },
        lineStyle: {
          color: '#fac858',
          width: 1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.baseSelfDailyUnitCost?.variableCost || []
      }
    ]
  };

  const todayTotalQty = data.summary.todayBaseSelfQty + data.summary.todayBasePurchaseQty;
  const weekTotalQty = data.summary.weekBaseSelfQty + data.summary.weekBasePurchaseQty;
  const monthTotalQty = data.summary.monthBaseSelfQty + data.summary.monthBasePurchaseQty;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              成本分析
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              实时监控废钢采购成本，为经营决策提供数据支持
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">导出数据（PurchaseWarehouse）</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <span className="text-gray-500 dark:text-gray-400 text-sm">至</span>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exporting ? '导出中...' : '导出数据'}
              </button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 今日成本（包含平均日成本） */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  今日成本
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.summary.todayCost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  万元，吨数 {todayTotalQty.toFixed(2)} 吨
                </p>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>基地收货 {data.summary.todayBaseSelfCost.toFixed(2)} 万元，吨数 {data.summary.todayBaseSelfQty.toFixed(2)} 吨</div>
                  <div>基地买货 {data.summary.todayBasePurchaseCost.toFixed(2)} 万元，吨数 {data.summary.todayBasePurchaseQty.toFixed(2)} 吨</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    平均日成本
                  </p>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-1">
                    {data.summary.avgDailyCost.toFixed(2)} 万元/天
                  </p>
                </div>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 最近一周成本 - 使用堆叠横向柱状图（最近 7 个自然日，避免周一或无数据时为空） */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-2">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                最近一周成本
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {data.summary.weekCost.toFixed(2)} 万元
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                吨数 {weekTotalQty.toFixed(2)} 吨
              </p>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>基地收货 {data.summary.weekBaseSelfCost.toFixed(2)} 万元，吨数 {data.summary.weekBaseSelfQty.toFixed(2)} 吨</div>
                <div>基地买货 {data.summary.weekBasePurchaseCost.toFixed(2)} 万元，吨数 {data.summary.weekBasePurchaseQty.toFixed(2)} 吨</div>
              </div>
            </div>
            <LazyReactECharts
              option={{
                tooltip: {
                  trigger: 'axis',
                  axisPointer: {
                    type: 'shadow'
                  },
                  formatter: (params: any) => {
                    let result = params[0].name + '<br/>';
                    let total = 0;
                    let baseSelfParam: any = null;
                    params.forEach((param: any) => {
                      result += `${param.seriesName}: ${param.value.toFixed(2)} 万元<br/>`;
                      total += param.value;
                      if (param.seriesName === '基地收货') {
                        baseSelfParam = param;
                      }
                    });
                    result += `总计: ${total.toFixed(2)} 万元`;
                    
                    // 如果是基地收货，添加饼图容器
                    if (baseSelfParam && baseSelfParam.value > 0) {
                      const dayIndex = baseSelfParam.dataIndex;
                      const dailyCategoryData = data.weekCostBreakdown.dailyCategoryData || [];
                      if (dailyCategoryData[dayIndex] && dailyCategoryData[dayIndex].baseSelfCategories.categories.length > 0) {
                        const categoryData = dailyCategoryData[dayIndex].baseSelfCategories;
                        const pieContainerId = 'tooltip-pie-' + dayIndex + '-' + Date.now();
                        result += '<br/><div id="' + pieContainerId + '" style="width:300px;height:250px;margin-top:10px;"></div>';
                        
                        // 延迟渲染饼图，确保DOM已创建
                        setTimeout(() => {
                          if (typeof document === 'undefined') return;
                          const pieContainer = document.getElementById(pieContainerId);
                          if (pieContainer) {
                            import('echarts').then((echartsModule: any) => {
                              const echarts = (echartsModule.default || echartsModule) as any;
                              const chartInstance = echarts.getInstanceByDom(pieContainer);
                              if (chartInstance) {
                                chartInstance.dispose();
                              }
                              const pieChart = echarts.init(pieContainer);
                              const pieOption = {
                                title: {
                                  text: '当日料型成本分布',
                                  left: 'center',
                                  textStyle: {
                                    fontSize: 12
                                  }
                                },
                                tooltip: {
                                  trigger: 'item',
                                  formatter: (params: any) => {
                                    const idx = categoryData.categories.indexOf(params.name);
                                    const avgPrice = idx >= 0 ? categoryData.avgPrices[idx] : 0;
                                    const quantity = idx >= 0 ? categoryData.quantities[idx] : 0;
                                    return `${params.name}<br/>平均单价: ${avgPrice.toFixed(2)} 元/吨<br/>采购吨数: ${quantity.toFixed(2)} 吨<br/>占比: ${params.percent.toFixed(2)}%`;
                                  }
                                },
                                series: [{
                                  type: 'pie',
                                  radius: ['30%', '60%'],
                                  data: categoryData.categories.map((cat, idx) => ({
                                    value: categoryData.costs[idx],
                                    name: cat
                                  })),
                                  label: {
                                    show: true,
                                    formatter: (params: any) => {
                                      const idx = categoryData.categories.indexOf(params.name);
                                      const avgPrice = idx >= 0 ? categoryData.avgPrices[idx] : 0;
                                      const quantity = idx >= 0 ? categoryData.quantities[idx] : 0;
                                      return `${params.name}\n${avgPrice.toFixed(2)}元/吨\n${quantity.toFixed(2)}吨`;
                                    },
                                    fontSize: 10
                                  },
                                  emphasis: {
                                    label: {
                                      show: true,
                                      fontSize: 12,
                                      fontWeight: 'bold'
                                    }
                                  }
                                }]
                              };
                              pieChart.setOption(pieOption);
                            });
                          }
                        }, 50);
                      }
                    }
                    
                    return result;
                  }
                },
                legend: {
                  data: ['基地收货', '基地买货', '协同业务'],
                  bottom: 0
                },
                grid: {
                  left: '3%',
                  right: '4%',
                  bottom: '15%',
                  top: '10%',
                  containLabel: true
                },
                xAxis: {
                  type: 'value',
                  name: '成本（万元）'
                },
                yAxis: {
                  type: 'category',
                  data: data.weekCostBreakdown.days,
                  axisLabel: {
                    formatter: (value: string) => {
                      return value.split('\n').join('\n');
                    }
                  }
                },
                series: [
                  {
                    name: '基地收货',
                    type: 'bar',
                    stack: 'total',
                    data: data.weekCostBreakdown.baseSelf,
                    itemStyle: {
                      color: '#5470c6'
                    },
                    emphasis: {
                      focus: 'series', // 悬停时高亮同一系列的所有项
                      itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(84, 112, 198, 0.5)'
                      }
                    },
                    label: {
                      show: true,
                      position: 'inside',
                      formatter: (params: any) => {
                        return params.value > 0 ? params.value.toFixed(1) : '';
                      }
                    }
                  },
                  {
                    name: '基地买货',
                    type: 'bar',
                    stack: 'total',
                    data: data.weekCostBreakdown.basePurchase,
                    itemStyle: {
                      color: '#91cc75'
                    },
                    emphasis: {
                      focus: 'series', // 悬停时高亮同一系列的所有项
                      itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(145, 204, 117, 0.5)'
                      }
                    },
                    label: {
                      show: true,
                      position: 'inside',
                      formatter: (params: any) => {
                        return params.value > 0 ? params.value.toFixed(1) : '';
                      }
                    }
                  },
                  {
                    name: '协同业务',
                    type: 'bar',
                    stack: 'total',
                    data: data.weekCostBreakdown.collaboration,
                    itemStyle: {
                      color: '#fac858'
                    },
                    emphasis: {
                      focus: 'series', // 悬停时高亮同一系列的所有项
                      itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(250, 200, 88, 0.5)'
                      }
                    },
                    label: {
                      show: true,
                      position: 'inside',
                      formatter: (params: any) => {
                        return params.value > 0 ? params.value.toFixed(1) : '';
                      }
                    }
                  }
                ]
              }}
              style={{ height: '300px', width: '100%' }}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  本月成本
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.summary.monthCost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  万元，吨数 {monthTotalQty.toFixed(2)} 吨
                </p>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>基地收货 {data.summary.monthBaseSelfCost.toFixed(2)} 万元，吨数 {data.summary.monthBaseSelfQty.toFixed(2)} 吨</div>
                  <div>基地买货 {data.summary.monthBasePurchaseCost.toFixed(2)} 万元，吨数 {data.summary.monthBasePurchaseQty.toFixed(2)} 吨</div>
                </div>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 日成本趋势图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <LazyReactECharts
              option={dailyTrendOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>

          {/* 基地收货废钢类型成本分布饼图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <LazyReactECharts
              option={categoryPieOptionBaseSelf}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        </div>


        {/* 基地买货废钢类型成本分布饼图 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <LazyReactECharts
            option={categoryPieOptionBasePurchase}
            style={{ height: '400px', width: '100%' }}
          />
        </div>

        {/* 基地收货和基地买货废钢类型成本对比柱状图 - 并排显示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 基地收货废钢类型成本对比柱状图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <LazyReactECharts
              option={categoryBarOptionBaseSelf}
              style={{ height: '400px', width: '100%' }}
            />
          </div>

          {/* 基地买货废钢类型成本对比柱状图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <LazyReactECharts
              option={categoryBarOptionBasePurchase}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

