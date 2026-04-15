'use client';

import { useState, useEffect, useMemo } from 'react';
import LazyReactECharts from '@/components/lazy-react-echarts';
import { ProfitAnalysisSkeleton } from '@/components/profit-dashboard-skeletons';

const SALES_DETAILS_PAGE_SIZE = 10;

/** 解析发货日期字符串为 Date，支持 1/1/2026（月/日/年）及 ISO 等格式 */
function parseDeliveryDate(str: string | null): Date | null {
  if (!str?.trim()) return null;
  const d = new Date(str.trim());
  if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) return d;
  return null;
}

/** 从销售明细项得到月份键 YYYY-MM */
function getMonthKey(deliveryDate: string): string {
  const d = parseDeliveryDate(deliveryDate);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface ProfitAnalysisData {
  summary: {
    todayProfit: number;
    weekProfit: number;
    monthProfit: number;
    todayRevenue: number;
    todayMaterialCost: number;
    todayProcessingCost: number;
  };
  dailyTrend: {
    dates: string[];
    revenue: number[];
    materialCost: number[];
    processingCost: number[];
    profit: number[];
  };
  weekBreakdown: {
    days: string[];
    revenue: number[];
    materialCost: number[];
    processingCost: number[];
    profit: number[];
  };
  salesDetails: Array<{
    deliveryNumber: string;
    deliveryDate: string;
    productType: string;
    warehouse: string;
    customer: string;
    settlementQuantity: number;
    transitLoss: number;
    revenue: number;
    materialCost: number;
    processingCost: number;
    otherCosts: number;
    otherIncome: number;
    transportCost: number;
    taxCost: number;
    discountCost: number;
    interestCost: number;
    immediateRefund: number;
    governmentSupport: number;
    profit: number;
    costParamSnapshot?: {
      salesUnitExclTax: number;
      materialUnitExclTax: number;
      materialCalcQuantity: number;
      warehouseTaxRate: number;
      transportPerTon: number;
      processingFeeForRefundPerTon: number;
      taxMainRate: number;
      taxExtraRate: number;
      taxBasePerTon: number;
      taxPerTon: number;
      instantRefundRate: number;
      govSubsidyRate41: number;
      govSubsidyRate70: number;
      govSubsidyRate38: number;
      govSubsidyRate10: number;
      govSubsidyRate80: number;
      govSubsidyRate003: number;
      govSubsidyRate100: number;
    };
    materialComposition: Array<{
      material: string;
      quantity: number;
      cost: number;
    }>;
    productionRecords?: Array<{
      id: number;
      productionDate: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
  }>;
  productComparison: {
    labels: string[];
    currentMonth: {
      quantityTons: number[];
      avgUnitPriceInclTax: number[];
    };
    lastMonth: {
      quantityTons: number[];
      avgUnitPriceInclTax: number[];
    };
  };
  /** 与 API 一致：粗算首屏时为 true */
  provisional?: boolean;
}

export default function ProfitAnalysis() {
  const [data, setData] = useState<ProfitAnalysisData | null>(null);
  /** idle：未就绪；shell：粗算首屏；core：精确数据已就绪；full：成品对比已合并 */
  const [loadStage, setLoadStage] = useState<'idle' | 'shell' | 'core' | 'full'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    kind: 'material' | 'otherCosts' | 'otherIncome';
    sale: ProfitAnalysisData['salesDetails'][0];
  } | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(1920); // 默认值，避免 SSR 错误
  const [salesDetailMonth, setSalesDetailMonth] = useState<string>(''); // 当前选中的月份 YYYY-MM，空表示“全部”
  const [salesDetailPage, setSalesDetailPage] = useState(1);

  useEffect(() => {
    // 客户端才设置窗口宽度
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // 按月份分组销售明细（根据 delivery_date 月/日/年 格式解析）
  type SalesDetails = ProfitAnalysisData['salesDetails'];
  const { salesDetailsByMonth, monthKeys } = useMemo(() => {
    const list: SalesDetails = data?.salesDetails ?? [];
    const byMonth: Record<string, SalesDetails> = {};
    for (const sale of list) {
      const key = getMonthKey(sale.deliveryDate);
      if (!key) continue;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(sale);
    }
    const keys = Object.keys(byMonth).sort();
    return { salesDetailsByMonth: byMonth, monthKeys: keys };
  }, [data?.salesDetails]);

  // 当前选中月份下的列表与分页
  const currentMonthDetails = useMemo(() => {
    if (!data?.salesDetails?.length) return [];
    if (!salesDetailMonth) return data.salesDetails;
    return salesDetailsByMonth[salesDetailMonth] ?? [];
  }, [data?.salesDetails, salesDetailMonth, salesDetailsByMonth]);

  const totalPages = Math.max(1, Math.ceil(currentMonthDetails.length / SALES_DETAILS_PAGE_SIZE));
  const paginatedDetails = useMemo(() => {
    const from = (salesDetailPage - 1) * SALES_DETAILS_PAGE_SIZE;
    return currentMonthDetails.slice(from, from + SALES_DETAILS_PAGE_SIZE);
  }, [currentMonthDetails, salesDetailPage]);

  // 数据加载后默认选中第一个月份
  useEffect(() => {
    if (monthKeys.length > 0 && salesDetailMonth === '') {
      setSalesDetailMonth(monthKeys[0]);
      setSalesDetailPage(1);
    }
  }, [monthKeys.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMonthChange = (key: string) => {
    setSalesDetailMonth(key);
    setSalesDetailPage(1);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoadStage('idle');
      setError(null);

      try {
        const shellRes = await fetch('/api/profit-management/profit-analysis?phase=shell');
        if (shellRes.ok) {
          const shellJson = await shellRes.json();
          if (shellJson.success && shellJson.data && !cancelled) {
            setData(shellJson.data);
            setLoadStage('shell');
          }
        }
      } catch (e) {
        console.warn('利润分析：粗算首屏未返回，将直接等待精确数据', e);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      try {
        const response = await fetch('/api/profit-management/profit-analysis?phase=core', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '获取数据失败');
        if (!cancelled) {
          setData(result.data);
          setLoadStage('core');
          setError(null);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('获取利润分析数据失败（精确计算）:', err);
        const errorMessage =
          err instanceof Error
            ? err.name === 'AbortError'
              ? '请求超时，请稍后重试'
              : err.message
            : '未知错误';
        if (!cancelled) {
          setError(errorMessage);
          setData((prev) => (prev?.provisional ? prev : null));
          setLoadStage((prev) => (prev === 'shell' ? 'shell' : 'idle'));
        }
        return;
      }

      try {
        const pcRes = await fetch('/api/profit-management/profit-analysis?phase=productComparison');
        if (!pcRes.ok) {
          const errorData = await pcRes.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${pcRes.status}`);
        }
        const pcJson = await pcRes.json();
        if (!pcJson.success || !pcJson.data?.productComparison) {
          throw new Error(pcJson.error || '成品对比数据获取失败');
        }
        if (!cancelled) {
          setData((prev) =>
            prev
              ? { ...prev, productComparison: pcJson.data.productComparison }
              : null
          );
          setLoadStage('full');
        }
      } catch (e2) {
        console.warn('利润分析：成品对比图加载失败，其余数据已显示', e2);
        if (!cancelled) setLoadStage('full');
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data && !error) {
    return <ProfitAnalysisSkeleton />;
  }

  if (error && !data) {
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
    return null;
  }

  // 日利润趋势：堆叠总高度 = 销售收入（材料+加工+其它净值+利润），利润用面积展示占比
  const revenueArr = data.dailyTrend.revenue || [];
  const materialArr = data.dailyTrend.materialCost || [];
  const processingArr = data.dailyTrend.processingCost || [];
  const profitArr = data.dailyTrend.profit || [];
  const otherNetForStack: number[] = [];
  const profitStackSlice: number[] = [];
  const trendLen = Math.max(
    revenueArr.length,
    materialArr.length,
    processingArr.length,
    profitArr.length
  );
  for (let i = 0; i < trendLen; i++) {
    const r = revenueArr[i] ?? 0;
    const m = materialArr[i] ?? 0;
    const p = processingArr[i] ?? 0;
    const pr = profitArr[i] ?? 0;
    const otherNet = r - m - p - pr;
    otherNetForStack.push(Math.max(0, otherNet));
    profitStackSlice.push(pr + Math.min(0, otherNet));
  }

  const dailyTrendOption = {
    title: {
      text: '日利润趋势（最近30天）',
      subtext: '堆叠高度为销售收入；绿色为利润区块（其它净收入为负时与利润合并为一层）',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      },
      subtextStyle: {
        color: '#666',
        fontSize: 12
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
        if (!params?.length) return '';
        const idx = params[0].dataIndex ?? 0;
        const r = revenueArr[idx] ?? 0;
        const m = materialArr[idx] ?? 0;
        const p = processingArr[idx] ?? 0;
        const pr = profitArr[idx] ?? 0;
        const otherNet = r - m - p - pr;
        const name = params[0].name;
        let result = `${name}<br/>`;
        result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#5470c6;"></span>销售收入: ${r.toFixed(2)} 万元<br/>`;
        result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#ee6666;"></span>材料成本: ${m.toFixed(2)} 万元<br/>`;
        result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#fac858;"></span>加工成本: ${p.toFixed(2)} 万元<br/>`;
        if (Math.abs(otherNet) >= 0.005) {
          const label = otherNet >= 0 ? '其它收支净值（支出类净额）' : '其它收支净值（净收入等）';
          result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#9ca3af;"></span>${label}: ${otherNet.toFixed(2)} 万元<br/>`;
        }
        result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#91cc75;"></span><b>利润: ${pr.toFixed(2)} 万元</b><br/>`;
        result += `<span style="opacity:0.85">材料+加工+利润+其它净值 = ${(m + p + pr + otherNet).toFixed(2)} 万元</span>`;
        return result;
      }
    },
    legend: {
      data: ['材料成本', '加工成本', '其它收支净值', '利润'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dailyTrend.dates.map(date => {
        const parts = date.split('-');
        return `${parts[1]}-${parts[2]}`;
      }),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '金额（万元）',
      nameTextStyle: {
        color: '#333'
      }
    },
    series: [
      {
        name: '材料成本',
        type: 'line',
        stack: 'revenue',
        smooth: true,
        areaStyle: {
          opacity: 0.85
        },
        itemStyle: {
          color: '#ee6666'
        },
        lineStyle: {
          color: '#ee6666',
          width: 1
        },
        emphasis: { focus: 'series' },
        data: materialArr
      },
      {
        name: '加工成本',
        type: 'line',
        stack: 'revenue',
        smooth: true,
        areaStyle: {
          opacity: 0.85
        },
        itemStyle: {
          color: '#fac858'
        },
        lineStyle: {
          color: '#fac858',
          width: 1
        },
        emphasis: { focus: 'series' },
        data: processingArr
      },
      {
        name: '其它收支净值',
        type: 'line',
        stack: 'revenue',
        smooth: true,
        areaStyle: {
          opacity: 0.55
        },
        itemStyle: {
          color: '#9ca3af'
        },
        lineStyle: {
          color: '#9ca3af',
          width: 1
        },
        emphasis: { focus: 'series' },
        data: otherNetForStack
      },
      {
        name: '利润',
        type: 'line',
        stack: 'revenue',
        smooth: true,
        areaStyle: {
          opacity: 0.9
        },
        itemStyle: {
          color: '#91cc75'
        },
        lineStyle: {
          color: '#91cc75',
          width: 1
        },
        emphasis: { focus: 'series' },
        data: profitStackSlice
      }
    ]
  };

  // 周利润分解图：总成本采用完整口径（与利润公式一致）
  // 完整总成本 = 销售收入 - 利润
  const weekRevenueArr = data.weekBreakdown.revenue || [];
  const weekProfitArr = data.weekBreakdown.profit || [];
  const totalCostByDay = weekRevenueArr.map((r: number, i: number) => r - (weekProfitArr[i] ?? 0));
  const weekBreakdownOption = {
    title: {
      text: '最近一周利润分解',
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        const revParam = params.find((p: any) => p.seriesName === '销售收入');
        const costParam = params.find((p: any) => p.seriesName === '总成本');
        const profitParam = params.find((p: any) => p.seriesName === '利润');
        const revenue = revParam?.value ?? 0;
        const totalCost = costParam?.value ?? 0;
        const profit = profitParam?.value ?? (revenue - totalCost);
        const idx = revParam?.dataIndex ?? 0;
        const materialCost = data.weekBreakdown.materialCost?.[idx] ?? 0;
        const processingCost = data.weekBreakdown.processingCost?.[idx] ?? 0;
        const otherNetCost = totalCostByDay[idx] - materialCost - processingCost;
        let result = `${params[0].name}<br/>`;
        result += `${revParam?.marker}销售收入: ${revenue.toFixed(2)} 万元<br/>`;
        result += `${costParam?.marker}总成本: ${totalCost.toFixed(2)} 万元（材料 ${materialCost.toFixed(2)} + 加工 ${processingCost.toFixed(2)} + 其它净成本 ${otherNetCost.toFixed(2)}）<br/>`;
        result += `${profitParam?.marker ?? ''}<b>利润: ${profit.toFixed(2)} 万元</b>`;
        return result;
      }
    },
    legend: {
      data: ['销售收入', '总成本', '利润'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '14%',
      bottom: '12%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.weekBreakdown.days,
      axisLabel: { rotate: 0 }
    },
    yAxis: [
      {
        type: 'value',
        name: '金额（万元）',
        position: 'left',
        axisLine: { show: true },
        axisLabel: { color: '#5470c6' },
        nameTextStyle: { color: '#5470c6' }
      },
      {
        type: 'value',
        name: '利润（万元）',
        position: 'right',
        axisLine: { show: true, lineStyle: { color: '#91cc75' } },
        axisLabel: { color: '#91cc75' },
        nameTextStyle: { color: '#91cc75' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '销售收入',
        type: 'bar',
        yAxisIndex: 0,
        data: data.weekBreakdown.revenue || [],
        barWidth: '28%',
        barGap: '15%',
        itemStyle: { color: '#5470c6' },
        label: { show: false }
      },
      {
        name: '总成本',
        type: 'bar',
        yAxisIndex: 0,
        data: totalCostByDay,
        barWidth: '28%',
        barGap: '15%',
        itemStyle: { color: '#ee6666' },
        label: { show: false }
      },
      {
        name: '利润',
        type: 'line',
        yAxisIndex: 1,
        data: data.weekBreakdown.profit || [],
        smooth: true,
        smoothMonotone: 'x',
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#91cc75', width: 2 },
        itemStyle: { color: '#91cc75' },
        label: { show: false },
        markLine: {
          symbol: 'none',
          label: {
            show: true,
            formatter: '利润零点',
            color: 'rgba(220, 38, 38, 0.45)',
          },
          lineStyle: {
            color: 'rgba(220, 38, 38, 0.35)',
            type: 'dashed',
            width: 1,
          },
          data: [{ yAxis: 0 }],
        },
      }
    ]
  };

  // 成品对比分析图配置（按客户-成品：销量 + 平均单价）
  const productComparisonOption = {
    title: {
      text: '客户-成品销售对比（当月 vs 上月）',
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
      data: ['当月销量/吨', '上月销量/吨', '当月平均单价/元/吨(含税)', '上月平均单价/元/吨(含税)'],
      bottom: 0
    },
    grid: {
      left: '15%',
      right: '5%',
      bottom: '20%',
      top: '10%',
      containLabel: false
    },
    xAxis: {
      type: 'category',
      data: data.productComparison.labels,
      axisLabel: {
        rotate: 45,
        interval: 0
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '销量（吨）',
        position: 'left'
      },
      {
        type: 'value',
        name: '平均销售单价（元/吨，含税）',
        position: 'right'
      }
    ],
    series: [
      {
        name: '当月销量/吨',
        type: 'bar',
        yAxisIndex: 0,
        data: data.productComparison.currentMonth.quantityTons,
        itemStyle: {
          color: '#5470c6'
        }
      },
      {
        name: '上月销量/吨',
        type: 'bar',
        yAxisIndex: 0,
        data: data.productComparison.lastMonth.quantityTons,
        itemStyle: {
          color: '#91cc75'
        }
      },
      {
        name: '当月平均单价/元/吨(含税)',
        type: 'line',
        yAxisIndex: 1,
        data: data.productComparison.currentMonth.avgUnitPriceInclTax,
        itemStyle: {
          color: '#ee6666'
        }
      },
      {
        name: '上月平均单价/元/吨(含税)',
        type: 'line',
        yAxisIndex: 1,
        data: data.productComparison.lastMonth.avgUnitPriceInclTax,
        itemStyle: {
          color: '#fac858'
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            利润分析
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            实时监控废钢业务利润，为经营决策提供数据支持
          </p>
        </div>

        {/* 利润公式说明（与页面正文同一字体，不用等宽） */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            利润计算公式
          </h3>
          <p className="text-sm font-normal text-gray-700 dark:text-gray-300 leading-relaxed">
            利润 = 销售收入/1.13（不含税）− 总成本（废钢成本 + 加工成本）− 运输费 − 税费 + 即征即退 + 政府扶持资金 − 贴现费用 − 回款周期资金利息
          </p>
          <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
            销售明细表中按每张销售单分别计算：总成本含材料成本与加工成本；其它成本项 = 运输费 + 税费 + 贴现费用 + 回款周期资金利息；其它收入项 = 即征即退 + 政府扶持资金（待配置）。
          </p>
        </div>

        {data.provisional && (
          <div className="mb-4 rounded-md border border-sky-200/90 bg-sky-50/90 px-3 py-2 text-sm text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100">
            <strong>粗算首屏</strong>：已展示今日收入、按默认加工费（元/吨）估算的加工成本及趋势图；材料成本（LIFO）、利润与销售明细在后台精确计算中，完成后将自动刷新为正式数据。
          </div>
        )}

        {error && data && (
          <div
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            精确数据加载失败，当前仍为粗算首屏。{error}
          </div>
        )}

        {loadStage === 'core' && !data.provisional && (
          <div className="mb-4 rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
            成品对比分析图正在后台加载，其余数据已可查看…
          </div>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 今日利润 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  今日利润
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.provisional ? '—' : data.summary.todayProfit.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {data.provisional ? '精确利润计算中' : '万元'}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    收入: {data.summary.todayRevenue.toFixed(2)} 万元
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    成本: {(data.summary.todayMaterialCost + data.summary.todayProcessingCost).toFixed(2)} 万元
                  </p>
                </div>
              </div>
              <div className="bg-green-100 dark:bg-green-900 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 本周利润 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  本周利润
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.provisional ? '—' : data.summary.weekProfit.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {data.provisional ? '精确利润计算中' : '万元'}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 本月利润 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  本月利润
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.provisional ? '—' : data.summary.monthProfit.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {data.provisional ? '精确利润计算中' : '万元'}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 今日成本明细 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                今日成本明细
              </p>
              {data.provisional && (
                <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-1">材料成本待 LIFO 计算</p>
              )}
              <div className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">材料成本:</span>
                  <span className="text-xs font-semibold">{data.summary.todayMaterialCost.toFixed(2)} 万元</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">加工成本:</span>
                  <span className="text-xs font-semibold">{data.summary.todayProcessingCost.toFixed(2)} 万元</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium">总成本:</span>
                    <span className="text-xs font-bold">{(data.summary.todayMaterialCost + data.summary.todayProcessingCost).toFixed(2)} 万元</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 日利润趋势图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <LazyReactECharts
              option={dailyTrendOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>

          {/* 周利润分解图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <LazyReactECharts
              option={weekBreakdownOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        </div>

        {/* 销售明细表格：月份导航 + 分页 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">销售明细利润分析</h2>

          {/* 月份导航（根据 delivery_date 自动累加） */}
          {monthKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">月份：</span>
              <button
                type="button"
                onClick={() => onMonthChange('')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${salesDetailMonth === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              >
                全部
              </button>
              {monthKeys.map((key) => {
                const [y, m] = key.split('-');
                const label = monthKeys.some(k => k !== key && k.startsWith(y)) ? `${parseInt(m, 10)}月` : `${y}年${parseInt(m, 10)}月`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onMonthChange(key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${salesDetailMonth === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {data.provisional && monthKeys.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              下方表格结构已就绪；行数据将在精确计算完成后自动出现。
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">发货单号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">发货日期</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">成品名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">发往客户</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">结算量(吨)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">销售收入-含税(元)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">途损</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">材料成本(元)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">加工成本(元)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">其它成本项:运输费+税费+贴现+回款利息(元)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">其它收入项:即征即退+政府扶持(元)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">利润(元)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedDetails.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {data.provisional
                        ? '销售明细正在逐单精确计算（含材料 LIFO、税费等），请稍候…'
                        : '暂无数据'}
                    </td>
                  </tr>
                ) : (
                  paginatedDetails.map((sale, index) => (
                  <tr
                    key={`${sale.deliveryNumber}-${sale.deliveryDate}-${index}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    title={sale.materialComposition?.length ? `原材料构成: ${sale.materialComposition.map(m => `${m.material}(${(m.quantity ?? 0).toFixed(2)}吨)`).join(', ')}` : undefined}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{sale.deliveryNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{sale.deliveryDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{sale.productType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{sale.customer}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{sale.settlementQuantity.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{sale.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{((sale.transitLoss ?? 0) * 100).toFixed(3)}%</td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 relative group"
                      onMouseEnter={(e) => {
                        const hasData = sale.materialCost > 0 && ((sale.materialComposition?.length ?? 0) > 0 || (sale.productionRecords?.length ?? 0) > 0);
                        if (hasData) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipData({
                            x: rect.left + rect.width / 2,
                            y: rect.bottom,
                            kind: 'material',
                            sale,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltipData(null)}
                    >
                      <span className="cursor-help">
                        {(sale.materialCost ?? 0).toFixed(2)}
                        {((sale.materialComposition?.length ?? 0) > 0 || (sale.productionRecords?.length ?? 0) > 0) && (sale.materialCost ?? 0) > 0 && (
                          <span className="ml-1 text-blue-500 text-xs">ℹ️</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{sale.processingCost.toFixed(2)}</td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 relative group"
                      onMouseEnter={(e) => {
                        if ((sale.otherCosts ?? 0) > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipData({
                            x: rect.left + rect.width / 2,
                            y: rect.bottom,
                            kind: 'otherCosts',
                            sale,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltipData(null)}
                    >
                      <span className="cursor-help">
                        {(sale.otherCosts ?? 0).toFixed(2)}
                        {(sale.otherCosts ?? 0) > 0 && (
                          <span className="ml-1 text-blue-500 text-xs">ℹ️</span>
                        )}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 relative group"
                      onMouseEnter={(e) => {
                        if ((sale.otherIncome ?? 0) > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipData({
                            x: rect.left + rect.width / 2,
                            y: rect.bottom,
                            kind: 'otherIncome',
                            sale,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltipData(null)}
                    >
                      <span className="cursor-help">
                        {(sale.otherIncome ?? 0).toFixed(2)}
                        {(sale.otherIncome ?? 0) > 0 && (
                          <span className="ml-1 text-blue-500 text-xs">ℹ️</span>
                        )}
                      </span>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {sale.profit.toFixed(2)}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 单月超过 10 条时分页 */}
          {currentMonthDetails.length > SALES_DETAILS_PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                共 {currentMonthDetails.length} 条，第 {(salesDetailPage - 1) * SALES_DETAILS_PAGE_SIZE + 1}–{Math.min(salesDetailPage * SALES_DETAILS_PAGE_SIZE, currentMonthDetails.length)} 条
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSalesDetailPage(p => Math.max(1, p - 1))}
                  disabled={salesDetailPage <= 1}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {salesDetailPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setSalesDetailPage(p => Math.min(totalPages, p + 1))}
                  disabled={salesDetailPage >= totalPages}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 成品对比：粗算阶段占位，避免大块空白 */}
        {data.provisional && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 min-h-[280px] flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 text-center gap-2">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">客户-成品销售对比（当月 vs 上月）</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md px-4">
              精确数据就绪后，将在此按吉钢/萍钢/新钢各成品展示销量与平均销售单价对比。
            </p>
          </div>
        )}

        {/* 成品对比分析图 */}
        {!data.provisional && data.productComparison.labels.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <LazyReactECharts
              option={productComparisonOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        )}

        {/* 材料成本 Tooltip（桑基图 + 平均生产日期） */}
        {tooltipData && tooltipData.kind === 'material' && (tooltipData.sale.materialCost ?? 0) > 0 && ((tooltipData.sale.materialComposition?.length ?? 0) > 0 || (tooltipData.sale.productionRecords?.length ?? 0) > 0) && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-200 dark:border-blue-700 p-4 pointer-events-auto"
            style={{
              left: `${Math.min(Math.max(tooltipData.x, 200), windowWidth - 320)}px`,
              top: `${tooltipData.y + 10}px`,
              transform: tooltipData.x > windowWidth - 320 ? 'translateX(-100%)' : 'translateX(-50%)',
              minWidth: '450px',
              maxWidth: '650px',
            }}
            onMouseEnter={() => {}} // 保持 tooltip 显示
            onMouseLeave={() => setTooltipData(null)}
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                材料成本明细（LIFO）
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <div>发货单号: {tooltipData.sale.deliveryNumber}</div>
                <div>成品: {tooltipData.sale.productType} ({tooltipData.sale.warehouse})</div>
                <div>销售数量: {tooltipData.sale.settlementQuantity.toFixed(2)} 吨</div>
                <div>总材料成本: {tooltipData.sale.materialCost.toFixed(2)} 元</div>
              </div>
            </div>
            
            {tooltipData.sale.productionRecords && tooltipData.sale.productionRecords.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  使用的生产记录:
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tooltipData.sale.productionRecords.map((record, idx) => (
                    <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-1">
                      <div>生产日期: {record.productionDate}</div>
                      <div>使用数量: {(record.quantity ?? 0).toFixed(2)} 吨 | 单位成本: {(record.unitCost ?? 0).toFixed(2)} 元/吨 | 成本: {(record.totalCost ?? 0).toFixed(2)} 元</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tooltipData.sale.materialComposition && tooltipData.sale.materialComposition.length > 0 && (() => {
              const comp = tooltipData.sale.materialComposition!;
              const targetName = '材料成本(元)';
              const nodes = [
                ...comp.map(m => ({ name: m.material })),
                { name: targetName },
              ];
              const links = comp
                .filter(m => (m.quantity ?? 0) > 0)
                .map(m => ({ source: m.material, target: targetName, value: m.quantity }));
              const avgProdDate = (() => {
                const recs = tooltipData.sale.productionRecords;
                if (!recs?.length) return null;
                const parseDate = (s: string): number => {
                  if (!s || typeof s !== 'string') return NaN;
                  const iso = s.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime();
                  const slash = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                  if (slash) return new Date(+slash[3], +slash[1] - 1, +slash[2]).getTime();
                  return new Date(s).getTime();
                };
                let totalQ = 0;
                let sumT = 0;
                for (const r of recs) {
                  const t = parseDate(r.productionDate);
                  if (!Number.isNaN(t) && r.quantity > 0) {
                    totalQ += r.quantity;
                    sumT += r.quantity * t;
                  }
                }
                if (totalQ <= 0) return null;
                const avg = new Date(sumT / totalQ);
                return `${avg.getFullYear()}-${String(avg.getMonth() + 1).padStart(2, '0')}-${String(avg.getDate()).padStart(2, '0')}`;
              })();
              return (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    原材料构成（桑基图，流量=吨）
                  </h4>
                  {avgProdDate != null && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      平均生产日期: {avgProdDate}
                    </div>
                  )}
                  <LazyReactECharts
                    option={{
                      tooltip: {
                        trigger: 'item',
                        formatter: (params: { data: { value?: number }; name: string }) =>
                          typeof params.data?.value === 'number'
                            ? `${params.name}: ${params.data.value.toFixed(2)} 吨`
                            : params.name,
                      },
                      series: [
                        {
                          type: 'sankey',
                          emphasis: { focus: 'adjacency' },
                          data: nodes,
                          links: links,
                          lineStyle: { curveness: 0.5 },
                          label: { fontSize: 11 },
                        },
                      ],
                    }}
                    style={{ height: '280px', width: '100%' }}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {/* 其它成本项 Tooltip：运输费 + 税费 + 贴现 + 回款利息 */}
        {tooltipData && tooltipData.kind === 'otherCosts' && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-amber-200 dark:border-amber-700 p-4 pointer-events-auto"
            style={{
              left: `${Math.min(Math.max(tooltipData.x, 200), windowWidth - 360)}px`,
              top: `${tooltipData.y + 10}px`,
              transform: tooltipData.x > windowWidth - 360 ? 'translateX(-100%)' : 'translateX(-50%)',
              minWidth: '420px',
              maxWidth: '520px',
            }}
            onMouseEnter={() => {}}
            onMouseLeave={() => setTooltipData(null)}
          >
            {(() => {
              const s = tooltipData.sale;
              const qty = s.settlementQuantity || 0;
              const transport = s.transportCost ?? 0;
              const tax = s.taxCost ?? 0;
              const discount = s.discountCost ?? 0;
              const interest = s.interestCost ?? 0;
              const total = s.otherCosts ?? 0;
              const transportPerTon = qty > 0 ? transport / qty : 0;
              const taxPerTon = qty > 0 ? tax / qty : 0;
              const discountPerTon = qty > 0 ? discount / qty : 0;
              const interestPerTon = qty > 0 ? interest / qty : 0;
              const salesUnitExclTax = qty > 0 ? s.revenue / qty / 1.13 : 0;
              const materialQty = s.costParamSnapshot?.materialCalcQuantity ?? qty;
              const materialUnitExclTax = materialQty > 0 ? s.materialCost / materialQty : 0;
              const snap = s.costParamSnapshot;
              const snapSalesExTax = snap?.salesUnitExclTax ?? salesUnitExclTax;
              const snapMaterialExTax = snap?.materialUnitExclTax ?? materialUnitExclTax;
              const snapWarehouseTaxRate = snap?.warehouseTaxRate ?? 0;
              const snapTransportPerTon = snap?.transportPerTon ?? transportPerTon;
              const snapProcessFeePerTon = snap?.processingFeeForRefundPerTon ?? 0;
              const snapTaxMain = snap?.taxMainRate ?? 0;
              const snapTaxExtra = snap?.taxExtraRate ?? 0;
              const snapTaxBasePerTon =
                snap?.taxBasePerTon ??
                (snapSalesExTax * 0.13 -
                  snapMaterialExTax * snapWarehouseTaxRate -
                  snapTransportPerTon * 0.03 -
                  snapProcessFeePerTon * 0.09);
              const snapTaxPerTon = snap?.taxPerTon ?? taxPerTon;
              const snapTaxFormulaMainPerTon = snapTaxBasePerTon * snapTaxMain;
              const snapTaxFormulaExtraPerTon =
                (snapSalesExTax + snapMaterialExTax) * snapTaxExtra;
              return (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    其它成本项明细
                  </h3>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 space-y-1">
                    <div>发货单号: {s.deliveryNumber}</div>
                    <div>客户: {s.customer} | 成品: {s.productType}</div>
                    <div>结算量: {qty.toFixed(2)} 吨</div>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200 mb-3 space-y-1">
                    <div>运输费: {transport.toFixed(2)} 元（≈ {transportPerTon.toFixed(2)} 元/吨）</div>
                    <div>税费: {tax.toFixed(2)} 元（≈ {taxPerTon.toFixed(2)} 元/吨）</div>
                    <div>贴现费用: {discount.toFixed(2)} 元（≈ {discountPerTon.toFixed(2)} 元/吨）</div>
                    <div>回款周期资金利息: {interest.toFixed(2)} 元（≈ {interestPerTon.toFixed(2)} 元/吨）</div>
                    <div className="font-semibold mt-1">
                      合计: {total.toFixed(2)} 元
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      本单实际参数快照（系统用于核算）
                    </h4>
                    <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside mb-2">
                      <li>销售单价(不含税): {snapSalesExTax.toFixed(2)} 元/吨</li>
                      <li>材料单价(不含税): {snapMaterialExTax.toFixed(2)} 元/吨</li>
                      <li>入库单加权税率: {(snapWarehouseTaxRate * 100).toFixed(4)}%</li>
                      <li>运输费: {snapTransportPerTon.toFixed(2)} 元/吨；加工费参数: {snapProcessFeePerTon.toFixed(2)} 元/吨</li>
                      <li>主税率: {(snapTaxMain * 100).toFixed(2)}%；附加税率: {(snapTaxExtra * 100).toFixed(4)}%</li>
                      <li>税费基数: {snapTaxBasePerTon.toFixed(4)} 元/吨；税费: {snapTaxPerTon.toFixed(4)} 元/吨</li>
                    </ul>
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      计算公式（按吨）概览
                    </h4>
                    <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                      <li>销售单价(不含税) ≈ {snapSalesExTax.toFixed(2)} 元/吨 = 销售收入 / 结算量 / 1.13</li>
                      <li>材料单价(不含税) ≈ {snapMaterialExTax.toFixed(2)} 元/吨 = 材料成本 / 材料核算量(优先出厂净重)</li>
                      <li>运输费: 客户对应的运价(含税/1.03) × 结算量</li>
                      <li>税费: (销售单价×13% − 材料单价×入库单税率 − 运输费×3% − 加工费×9%)×10% + (销售单价+材料单价)×0.05%</li>
                      <li className="text-amber-700 dark:text-amber-300">
                        代入: ({snapSalesExTax.toFixed(2)}×13% − {snapMaterialExTax.toFixed(2)}×{(snapWarehouseTaxRate * 100).toFixed(4)}% − {snapTransportPerTon.toFixed(2)}×3% − {snapProcessFeePerTon.toFixed(2)}×9%)×{(snapTaxMain * 100).toFixed(2)}% + ({snapSalesExTax.toFixed(2)}+{snapMaterialExTax.toFixed(2)})×{(snapTaxExtra * 100).toFixed(4)}% = {snapTaxFormulaMainPerTon.toFixed(4)} + {snapTaxFormulaExtraPerTon.toFixed(4)} = {snapTaxPerTon.toFixed(4)} 元/吨（本单税费 {tax.toFixed(2)} 元）
                      </li>
                      <li>贴现费用: 仅萍钢 = 销售单价×1.13×2.175%</li>
                      <li>回款利息: 销售单价×1.13×3%/360×回款天数（萍钢18/吉钢12/新钢37）</li>
                    </ul>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* 其它收入项 Tooltip：即征即退 + 政府扶持资金 */}
        {tooltipData && tooltipData.kind === 'otherIncome' && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-emerald-200 dark:border-emerald-700 p-4 pointer-events-auto"
            style={{
              left: `${Math.min(Math.max(tooltipData.x, 200), windowWidth - 360)}px`,
              top: `${tooltipData.y + 10}px`,
              transform: tooltipData.x > windowWidth - 360 ? 'translateX(-100%)' : 'translateX(-50%)',
              minWidth: '420px',
              maxWidth: '520px',
            }}
            onMouseEnter={() => {}}
            onMouseLeave={() => setTooltipData(null)}
          >
            {(() => {
              const s = tooltipData.sale;
              const qty = s.settlementQuantity || 0;
              const imm = s.immediateRefund ?? 0;
              const gov = s.governmentSupport ?? 0;
              const total = s.otherIncome ?? 0;
              const immPerTon = qty > 0 ? imm / qty : 0;
              const govPerTon = qty > 0 ? gov / qty : 0;
              const salesUnitExclTax = qty > 0 ? s.revenue / qty / 1.13 : 0;
              const materialQty = s.costParamSnapshot?.materialCalcQuantity ?? qty;
              const materialUnitExclTax = materialQty > 0 ? s.materialCost / materialQty : 0;
              const baseTransport = s.customer === '萍钢' ? 20.6 / 1.03 : s.customer === '新钢' ? 48 / 1.03 : 0;
              const snap = s.costParamSnapshot;
              const snapSalesExTax = snap?.salesUnitExclTax ?? salesUnitExclTax;
              const snapMaterialExTax = snap?.materialUnitExclTax ?? materialUnitExclTax;
              const snapWarehouseTaxRate = snap?.warehouseTaxRate ?? 0;
              const snapTransportPerTon = snap?.transportPerTon ?? baseTransport;
              const snapProcessFeePerTon = snap?.processingFeeForRefundPerTon ?? 0;
              const snapTaxBasePerTon =
                snap?.taxBasePerTon ??
                (snapSalesExTax * 0.13 -
                  snapMaterialExTax * snapWarehouseTaxRate -
                  snapTransportPerTon * 0.03 -
                  snapProcessFeePerTon * 0.09);
              const snapIrRate = snap?.instantRefundRate ?? 0.3;
              const r41 = snap?.govSubsidyRate41 ?? 0.41;
              const r70 = snap?.govSubsidyRate70 ?? 0.7;
              const r38 = snap?.govSubsidyRate38 ?? 0.38;
              const r10 = snap?.govSubsidyRate10 ?? 0.1;
              const r80 = snap?.govSubsidyRate80 ?? 0.8;
              const r003 = snap?.govSubsidyRate003 ?? 0.0003;
              const r100 = snap?.govSubsidyRate100 ?? 1;
              const govTerm10x80PerTon = snapTaxBasePerTon * r10 * r80;
              const govTerm003PerTon = (snapSalesExTax + snapMaterialExTax) * r003 * r100;
              const immFormulaPerTon = snapTaxBasePerTon * snapIrRate;
              const govFormulaMainPerTon =
                s.customer === '吉钢'
                  ? snapTaxBasePerTon * r41
                  : snapTaxBasePerTon * r70 * r38;
              const govFormulaPerTon = govFormulaMainPerTon + govTerm10x80PerTon + govTerm003PerTon;
              return (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    其它收入项明细
                  </h3>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 space-y-1">
                    <div>发货单号: {s.deliveryNumber}</div>
                    <div>客户: {s.customer} | 成品: {s.productType}</div>
                    <div>结算量: {qty.toFixed(2)} 吨</div>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200 mb-3 space-y-1">
                    <div>即征即退: {imm.toFixed(2)} 元（≈ {immPerTon.toFixed(2)} 元/吨）</div>
                    <div>政府扶持资金: {gov.toFixed(2)} 元（≈ {govPerTon.toFixed(2)} 元/吨）</div>
                    <div className="font-semibold mt-1">
                      合计: {total.toFixed(2)} 元
                    </div>
                  </div>
                  {(s.customer === '萍钢' || s.customer === '新钢' || s.customer === '吉钢') && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        计算公式（按吨）概览
                      </h4>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                        销售单价(不含税) ≈ {salesUnitExclTax.toFixed(2)} 元/吨；材料单价(不含税) ≈ {materialUnitExclTax.toFixed(2)} 元/吨；运输费基数 ≈ {baseTransport.toFixed(2)} 元/吨。
                      </p>
                      <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                        <li>税费基数 = 销售单价×13% − 材料单价×入库单税率 − 运输费×3% − 加工费×9%</li>
                        {s.customer === '吉钢' ? (
                          <>
                            <li>即征即退 = 0（吉钢不参与即征即退）</li>
                            <li>政府扶持资金 = 税费基数×41% + 税费基数×10%×80% + (销售单价+材料单价)×0.03%×100%</li>
                            <li className="text-emerald-700 dark:text-emerald-300">
                              代入(即征即退): 0 元/吨
                            </li>
                            <li className="text-emerald-700 dark:text-emerald-300">
                              代入(政府扶持): {snapTaxBasePerTon.toFixed(4)}×{(r41 * 100).toFixed(2)}% + {snapTaxBasePerTon.toFixed(4)}×{(r10 * 100).toFixed(2)}%×{(r80 * 100).toFixed(2)}% + ({snapSalesExTax.toFixed(2)}+{snapMaterialExTax.toFixed(2)})×{(r003 * 100).toFixed(4)}%×{(r100 * 100).toFixed(0)}% = {govFormulaMainPerTon.toFixed(4)} + {govTerm10x80PerTon.toFixed(4)} + {govTerm003PerTon.toFixed(4)} = {govFormulaPerTon.toFixed(4)} 元/吨（本单政府扶持 {gov.toFixed(2)} 元）
                            </li>
                          </>
                        ) : (
                          <>
                            <li>即征即退 = 税费基数 × 30%</li>
                            <li>政府扶持资金 = 税费基数×70%×38% + 税费基数×10%×80% + (销售单价+材料单价)×0.03%×100%</li>
                            <li className="text-emerald-700 dark:text-emerald-300">
                              代入(即征即退): {snapTaxBasePerTon.toFixed(4)}×{(snapIrRate * 100).toFixed(2)}% = {immFormulaPerTon.toFixed(4)} 元/吨（本单即征即退 {imm.toFixed(2)} 元）
                            </li>
                            <li className="text-emerald-700 dark:text-emerald-300">
                              代入(政府扶持): {snapTaxBasePerTon.toFixed(4)}×{(r70 * 100).toFixed(2)}%×{(r38 * 100).toFixed(2)}% + {snapTaxBasePerTon.toFixed(4)}×{(r10 * 100).toFixed(2)}%×{(r80 * 100).toFixed(2)}% + ({snapSalesExTax.toFixed(2)}+{snapMaterialExTax.toFixed(2)})×{(r003 * 100).toFixed(4)}%×{(r100 * 100).toFixed(0)}% = {govFormulaMainPerTon.toFixed(4)} + {govTerm10x80PerTon.toFixed(4)} + {govTerm003PerTon.toFixed(4)} = {govFormulaPerTon.toFixed(4)} 元/吨（本单政府扶持 {gov.toFixed(2)} 元）
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
