'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import LazyReactECharts from '@/components/lazy-react-echarts';
import { ProfitAnalysisSkeleton } from '@/components/profit-dashboard-skeletons';
import {
  ProfitAnalysisLoadingHint,
  ProfitChartLoadingVeil,
  ProfitTableComputingHint,
  AnimatedEllipsis,
} from '@/components/profit-analysis-loading-hint';

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

/** 月份 Tab 文案（同年多个月只显示「N月」） */
function formatMonthTabLabel(key: string, allKeys: string[]): string {
  const [y, m] = key.split('-');
  return allKeys.some((k) => k !== key && k.startsWith(y))
    ? `${parseInt(m, 10)}月`
    : `${y}年${parseInt(m, 10)}月`;
}

/** 表格展示：发货日期不含年份（如 4/1） */
function formatDeliveryDateNoYear(deliveryDate: string): string {
  const d = parseDeliveryDate(deliveryDate);
  if (d) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  const t = deliveryDate.trim();
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) return `${parseInt(mdy[1], 10)}/${parseInt(mdy[2], 10)}`;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${parseInt(iso[2], 10)}/${parseInt(iso[3], 10)}`;
  return t;
}

/** 计算过程内嵌参数：[中文名3%] */
function paramBracket(label: string, value: string): string {
  return `[${label}${value}]`;
}

function pctBracket(label: string, rate: number, decimals = 2): string {
  return paramBracket(label, `${(rate * 100).toFixed(decimals)}%`);
}

function transportFeeLabel(customer: string): string {
  if (customer === '萍钢') return '萍钢运输费单价';
  if (customer === '吉钢') return '吉钢运输费单价';
  if (customer === '新钢') return '新钢运输费单价';
  return '运输费单价';
}

function collectionDaysLabel(customer: string): string {
  if (customer === '萍钢') return '萍钢回款周期';
  if (customer === '吉钢') return '吉钢回款周期';
  if (customer === '新钢') return '新钢回款周期';
  return '回款周期';
}

/** 销售明细：按发货日期升序（同日按发货单号） */
function compareSalesDetailByDeliveryDate(
  a: { deliveryDate: string; deliveryNumber?: string },
  b: { deliveryDate: string; deliveryNumber?: string }
): number {
  const da = parseDeliveryDate(a.deliveryDate);
  const db = parseDeliveryDate(b.deliveryDate);
  if (da && db) {
    const diff = da.getTime() - db.getTime();
    if (diff !== 0) return diff;
  } else if (da) return -1;
  else if (db) return 1;
  return (a.deliveryNumber || '').localeCompare(b.deliveryNumber || '');
}

/** 销售明细表：紧凑单元格，便于多列同屏 */
const SD_TH =
  'px-2 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 leading-snug align-bottom';
const SD_TD = 'px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100 align-middle';
/** 月合计行数字后的小字单位 */
const SD_TOTAL_UNIT = 'ml-0.5 text-[10px] font-normal text-gray-500 dark:text-gray-400';

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
    /** 表格成品名称：warehouse 优先 */
    productDisplayName: string;
    warehouse: string;
    customer: string;
    settlementQuantity: number;
    netWeight: number;
    transitLoss: number; // 磅差（吨）DeliverySettlement.transitloss
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
    profitPerNetTon: number;
    costParamSnapshot?: {
      salesUnitExclTax: number;
      materialUnitExclTax: number;
      materialCalcQuantity: number;
      warehouseTaxRate: number;
      warehouseTaxRateFromLifo?: boolean;
      transportPerTon: number;
      transportFeeConfigured: number;
      roadLossFactor: number;
      processingFeeForRefundPerTon: number;
      taxMainRate: number;
      taxExtraRate: number;
      taxBasePerTon: number;
      taxBaseTotal: number;
      taxPerTon: number;
      discountRatePinggang: number;
      discountDaysPinggang: number;
      reverseDiscountAnnualRate: number;
      reverseDiscountOccupancyDays: number;
      discountTranche1: number;
      discountTranche2: number;
      interestRateAnnual: number;
      collectionDays: number;
      instantRefundRate: number;
      govSubsidyRate: number;
      govSubsidyRate70: number;
      isGiveCes: number;
      isGiveTaxExtra: number;
      refundBaseTotal: number;
      governmentSupportMain: number;
      governmentSupportStamp: number;
      governmentSupportTaxExtra: number;
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
  const [loadStartedAt] = useState(() => Date.now());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    kind: 'material' | 'otherCosts' | 'otherIncome';
    sale: ProfitAnalysisData['salesDetails'][0];
  } | null>(null);
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTooltipHideTimer = useCallback(() => {
    if (tooltipHideTimerRef.current) {
      clearTimeout(tooltipHideTimerRef.current);
      tooltipHideTimerRef.current = null;
    }
  }, []);
  const scheduleTooltipHide = useCallback(() => {
    clearTooltipHideTimer();
    tooltipHideTimerRef.current = setTimeout(() => setTooltipData(null), 300);
  }, [clearTooltipHideTimer]);
  const showTooltip = useCallback(
    (
      e: React.MouseEvent<HTMLTableCellElement>,
      kind: 'material' | 'otherCosts' | 'otherIncome',
      sale: ProfitAnalysisData['salesDetails'][0]
    ) => {
      clearTooltipHideTimer();
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipData({
        x: rect.left + rect.width / 2,
        y: rect.bottom,
        kind,
        sale,
      });
    },
    [clearTooltipHideTimer]
  );
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

  useEffect(() => () => clearTooltipHideTimer(), [clearTooltipHideTimer]);

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
    const keySet = new Set<string>(availableMonths);
    for (const k of Object.keys(byMonth)) keySet.add(k);
    const keys = Array.from(keySet).sort().reverse();
    for (const k of keys) {
      if (byMonth[k]) {
        byMonth[k].sort(compareSalesDetailByDeliveryDate);
      }
    }
    return { salesDetailsByMonth: byMonth, monthKeys: keys };
  }, [data?.salesDetails, availableMonths]);

  const focusMonthLabel = useMemo(() => {
    if (!salesDetailMonth) return undefined;
    return formatMonthTabLabel(salesDetailMonth, monthKeys);
  }, [salesDetailMonth, monthKeys]);

  // 当前选中月份下的列表与分页
  const currentMonthDetails = useMemo(() => {
    if (!data?.salesDetails?.length) return [];
    if (!salesDetailMonth) {
      return [...data.salesDetails].sort(compareSalesDetailByDeliveryDate);
    }
    return salesDetailsByMonth[salesDetailMonth] ?? [];
  }, [data?.salesDetails, salesDetailMonth, salesDetailsByMonth]);

  const totalPages = Math.max(1, Math.ceil(currentMonthDetails.length / SALES_DETAILS_PAGE_SIZE));
  const paginatedDetails = useMemo(() => {
    const from = (salesDetailPage - 1) * SALES_DETAILS_PAGE_SIZE;
    return currentMonthDetails.slice(from, from + SALES_DETAILS_PAGE_SIZE);
  }, [currentMonthDetails, salesDetailPage]);

  /** 当前筛选范围（选定月或「全部」）的销售明细累计合计 */
  const salesDetailMonthTotal = useMemo(() => {
    const list = currentMonthDetails;
    if (!list.length) return null;
    let netWeight = 0;
    let settlementQuantity = 0;
    let revenue = 0;
    let materialCost = 0;
    let processingCost = 0;
    let otherCosts = 0;
    let otherIncome = 0;
    let profit = 0;
    for (const s of list) {
      netWeight += s.netWeight ?? 0;
      settlementQuantity += s.settlementQuantity ?? 0;
      revenue += s.revenue ?? 0;
      materialCost += s.materialCost ?? 0;
      processingCost += s.processingCost ?? 0;
      otherCosts += s.otherCosts ?? 0;
      otherIncome += s.otherIncome ?? 0;
      profit += s.profit ?? 0;
    }
    const profitPerNetTon = netWeight > 0 ? profit / netWeight : 0;
    const label =
      salesDetailMonth === ''
        ? '合计'
        : (() => {
            const [, m] = salesDetailMonth.split('-');
            return `${parseInt(m, 10)}月合计`;
          })();
    return {
      label,
      netWeight,
      settlementQuantity,
      revenueWan: revenue / 10000,
      materialCostWan: materialCost / 10000,
      processingCostWan: processingCost / 10000,
      otherCostsWan: otherCosts / 10000,
      otherIncomeWan: otherIncome / 10000,
      profitWan: profit / 10000,
      profitPerNetTon,
      profit,
    };
  }, [currentMonthDetails, salesDetailMonth]);

  // 数据加载后默认选中最近月份（新→旧列表的第一项）
  useEffect(() => {
    if (monthKeys.length > 0 && salesDetailMonth === '') {
      setSalesDetailMonth(monthKeys[0]);
      setSalesDetailPage(1);
    }
  }, [monthKeys.join(','), salesDetailMonth]);

  const onMonthChange = (key: string) => {
    setSalesDetailMonth(key);
    setSalesDetailPage(1);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoadStage('idle');
      setError(null);
      setAvailableMonths([]);

      fetch('/api/profit-management/profit-analysis?phase=months')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (cancelled || !json?.success) return;
          const months: string[] = json.data?.months ?? [];
          setAvailableMonths(months);
          if (months.length > 0) {
            setSalesDetailMonth((prev) => prev || months[0]);
          }
        })
        .catch((e) => {
          console.warn('利润分析：月份列表未返回', e);
        });

      // 粗算首屏与精确数据并行请求，缩短白屏等待
      fetch('/api/profit-management/profit-analysis?phase=shell')
        .then((shellRes) => (shellRes.ok ? shellRes.json() : null))
        .then((shellJson) => {
          if (cancelled || !shellJson?.success || !shellJson.data) return;
          setData(shellJson.data);
          setLoadStage('shell');
        })
        .catch((e) => {
          console.warn('利润分析：粗算首屏未返回，将直接等待精确数据', e);
        });

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
    return (
      <>
        <ProfitAnalysisLoadingHint stage={loadStage} loadStartedAt={loadStartedAt} />
        <ProfitAnalysisSkeleton />
      </>
    );
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

  // 日利润趋势：左轴仅保留不含税销售收入与完整总成本；利润走右轴
  const revenueArr = data.dailyTrend.revenue || [];
  const profitArr = data.dailyTrend.profit || [];
  const revenueExclTaxArr: number[] = [];
  const totalCostArr: number[] = [];
  const trendLen = Math.max(
    revenueArr.length,
    profitArr.length
  );
  for (let i = 0; i < trendLen; i++) {
    const r = revenueArr[i] ?? 0;
    const pr = profitArr[i] ?? 0;
    const revenueExclTax = r / 1.13;
    revenueExclTaxArr.push(revenueExclTax);
    // 完整总成本口径：利润 = 不含税收入 - 总成本  => 总成本 = 不含税收入 - 利润
    totalCostArr.push(revenueExclTax - pr);
  }

  const dailyTrendOption = {
    title: {
      text: '日利润趋势（最近30天）',
      subtext: '左轴：不含税收入/总成本（万元）；右轴：利润（万元，绿色面积）',
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
        const rExTax = revenueExclTaxArr[idx] ?? 0;
        const totalCost = totalCostArr[idx] ?? 0;
        const pr = profitArr[idx] ?? 0;
        const name = params[0].name;
        let result = `${name}<br/>`;
        result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#5470c6;"></span>销售收入（不含税）: ${rExTax.toFixed(2)} 万元<br/>`;
        result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#ee6666;"></span>总成本（完整口径）: ${totalCost.toFixed(2)} 万元<br/>`;
        result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background:#91cc75;"></span><b>利润: ${pr.toFixed(2)} 万元</b><br/>`;
        result += `<span style="opacity:0.85">校验：不含税收入 - 总成本 = ${(rExTax - totalCost).toFixed(2)} 万元</span>`;
        return result;
      }
    },
    legend: {
      data: ['销售收入（不含税）', '总成本', '利润'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '12%',
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
    yAxis: [
      {
        type: 'value',
        name: '金额（万元）',
        position: 'left',
        nameTextStyle: {
          color: '#333'
        },
        axisLabel: {
          color: '#333',
        },
      },
      {
        type: 'value',
        name: '利润（万元）',
        position: 'right',
        axisLine: { show: true, lineStyle: { color: '#91cc75' } },
        axisLabel: { color: '#91cc75' },
        nameTextStyle: { color: '#91cc75' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '销售收入（不含税）',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        itemStyle: {
          color: '#5470c6'
        },
        lineStyle: {
          color: '#5470c6',
          width: 2
        },
        emphasis: { focus: 'series' },
        data: revenueExclTaxArr
      },
      {
        name: '总成本',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        itemStyle: {
          color: '#ee6666'
        },
        lineStyle: {
          color: '#ee6666',
          width: 1.8
        },
        emphasis: { focus: 'series' },
        data: totalCostArr
      },
      {
        name: '利润',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        smoothMonotone: 'x',
        areaStyle: {
          opacity: 0.22
        },
        itemStyle: {
          color: '#91cc75'
        },
        lineStyle: {
          color: '#91cc75',
          width: 2
        },
        emphasis: { focus: 'series' },
        data: profitArr,
        markLine: {
          symbol: 'none',
          lineStyle: {
            color: 'rgba(220, 38, 38, 0.35)',
            type: 'dashed',
            width: 1,
          },
          label: {
            show: false,
          },
          data: [{ yAxis: 0 }],
        },
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
      <ProfitAnalysisLoadingHint
        stage={loadStage}
        provisional={data?.provisional}
        focusMonthLabel={focusMonthLabel}
        loadStartedAt={loadStartedAt}
      />
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
            <strong>粗算首屏</strong>：已展示今日收入与趋势粗算；销售明细需先<strong>全量</strong>完成材料 LIFO 核算后，再按月份切片展示
            {focusMonthLabel ? `（默认 ${focusMonthLabel}）` : '（默认最近月份）'}
            ，请稍候
            <AnimatedEllipsis />
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
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ProfitChartLoadingVeil show={!!data.provisional} />
            <LazyReactECharts
              option={dailyTrendOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>

          {/* 周利润分解图 */}
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <ProfitChartLoadingVeil show={!!data.provisional} />
            <LazyReactECharts
              option={weekBreakdownOption}
              style={{ height: '400px', width: '100%' }}
            />
          </div>
        </div>

        {/* 销售明细表格：月份导航 + 分页 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">销售明细利润分析</h2>
          <button
            type="button"
            onClick={async () => {
              if (!data?.salesDetails?.length || currentMonthDetails.length === 0) {
                window.alert('暂无数据可导出');
                return;
              }
              if (data.provisional) {
                window.alert('精确数据计算中，请稍后再导出');
                return;
              }
              try {
                const { downloadProfitSalesDetailsExcel } = await import('@/lib/profit-analysis-sales-excel');
                const includeMonthColumn = salesDetailMonth === '';
                const filenameBase = includeMonthColumn
                  ? '利润分析-销售明细-全部'
                  : `利润分析-销售明细-${salesDetailMonth}`;
                const reportTitle = salesDetailMonth
                  ? (() => {
                      const [y, m] = salesDetailMonth.split('-');
                      return `${y}年${parseInt(m, 10)}月销售利润分析详表`;
                    })()
                  : '销售利润分析详表（全部月份）';
                await downloadProfitSalesDetailsExcel(currentMonthDetails, {
                  filenameBase,
                  includeMonthColumn,
                  reportTitle,
                });
              } catch (e) {
                console.error(e);
                window.alert('导出失败，请稍后再试');
              }
            }}
            disabled={!data?.salesDetails?.length || currentMonthDetails.length === 0 || !!data?.provisional}
            className="shrink-0 inline-flex items-center justify-center rounded-md border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-500 dark:bg-green-600 dark:hover:bg-green-500"
            title="按当前月份筛选导出该月全部明细；选「全部」时导出所有月份并增加「月份」列。表格下方附公式说明。"
          >
            导出 Excel
          </button>
        </div>

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
                const label = formatMonthTabLabel(key, monthKeys);
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
              下方表格结构已就绪；行数据将在全量 LIFO 精确计算完成后自动出现。
            </p>
          )}

          <div className="overflow-x-auto -mx-1 sm:mx-0 rounded-md border border-gray-100 dark:border-gray-700/80">
            <table className="min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className={SD_TH}>发货单号</th>
                  <th className={SD_TH}>发货日期</th>
                  <th className={SD_TH}>成品名称</th>
                  <th className={SD_TH}>客户</th>
                  <th className={SD_TH}>净重(吨)</th>
                  <th className={SD_TH}>结算量(吨)</th>
                  <th
                    className={SD_TH}
                    title="销售收入-含税(元)"
                  >
                    收入(含税)
                  </th>
                  <th className={SD_TH}>材料成本(元)</th>
                  <th className={SD_TH}>加工成本(元)</th>
                  <th
                    className={SD_TH}
                    title="其它成本项：运输费+税费+贴现+回款利息(元)"
                  >
                    其它成本(元)
                  </th>
                  <th
                    className={SD_TH}
                    title="其它收入项：即征即退+政府扶持(元)"
                  >
                    其它收入(元)
                  </th>
                  <th className={SD_TH}>利润(元)</th>
                  <th
                    className={`${SD_TH} bg-amber-50/90 dark:bg-amber-950/40 border-l border-amber-200/80 dark:border-amber-800/50`}
                    title="吨钢毛利(元/吨)=利润÷净重；净重为0时显示—"
                  >
                    吨钢毛利(元/吨)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedDetails.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {data.provisional ? (
                        <ProfitTableComputingHint monthLabel={focusMonthLabel} />
                      ) : (
                        '暂无数据'
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedDetails.map((sale, index) => (
                  <tr
                    key={`${sale.deliveryNumber}-${sale.deliveryDate}-${index}`}
                    className="group hover:bg-gray-50/90 dark:hover:bg-gray-700/70 cursor-pointer"
                    title={sale.materialComposition?.length ? `原材料构成: ${sale.materialComposition.map(m => `${m.material}(${(m.quantity ?? 0).toFixed(2)}吨)`).join(', ')}` : undefined}
                  >
                    <td className={SD_TD}>{sale.deliveryNumber}</td>
                    <td className={SD_TD} title={sale.deliveryDate}>
                      {formatDeliveryDateNoYear(sale.deliveryDate)}
                    </td>
                    <td className={`${SD_TD} max-w-[9rem] truncate`} title={sale.productDisplayName || sale.warehouse || sale.productType}>
                      {sale.productDisplayName || sale.warehouse || sale.productType}
                    </td>
                    <td className={SD_TD}>{sale.customer}</td>
                    <td className={SD_TD}>{(sale.netWeight ?? 0).toFixed(2)}</td>
                    <td className={SD_TD}>{sale.settlementQuantity.toFixed(2)}</td>
                    <td className={SD_TD}>{sale.revenue.toFixed(2)}</td>
                    <td
                      className={`${SD_TD} relative group`}
                      onMouseEnter={(e) => {
                        const hasData = sale.materialCost > 0 && ((sale.materialComposition?.length ?? 0) > 0 || (sale.productionRecords?.length ?? 0) > 0);
                        if (hasData) showTooltip(e, 'material', sale);
                      }}
                      onMouseLeave={scheduleTooltipHide}
                    >
                      <span className="cursor-help">
                        {(sale.materialCost ?? 0).toFixed(2)}
                        {((sale.materialComposition?.length ?? 0) > 0 || (sale.productionRecords?.length ?? 0) > 0) && (sale.materialCost ?? 0) > 0 && (
                          <span className="ml-1 text-blue-500 text-xs">ℹ️</span>
                        )}
                      </span>
                    </td>
                    <td className={SD_TD}>{sale.processingCost.toFixed(2)}</td>
                    <td
                      className={`${SD_TD} relative group`}
                      onMouseEnter={(e) => {
                        if ((sale.otherCosts ?? 0) > 0) showTooltip(e, 'otherCosts', sale);
                      }}
                      onMouseLeave={scheduleTooltipHide}
                    >
                      <span className="cursor-help">
                        {(sale.otherCosts ?? 0).toFixed(2)}
                        {(sale.otherCosts ?? 0) > 0 && (
                          <span className="ml-1 text-blue-500 text-xs">ℹ️</span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`${SD_TD} relative group`}
                      onMouseEnter={(e) => {
                        const c = sale.customer;
                        if (c === '萍钢' || c === '吉钢' || c === '新钢') {
                          showTooltip(e, 'otherIncome', sale);
                        }
                      }}
                      onMouseLeave={scheduleTooltipHide}
                    >
                      <span className="cursor-help">
                        {(sale.otherIncome ?? 0).toFixed(2)}
                        {(sale.customer === '萍钢' ||
                          sale.customer === '吉钢' ||
                          sale.customer === '新钢') && (
                          <span className="ml-1 text-blue-500 text-xs">ℹ️</span>
                        )}
                      </span>
                    </td>
                    <td className={`${SD_TD} font-semibold ${sale.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {sale.profit.toFixed(2)}
                    </td>
                    <td
                      className={`${SD_TD} font-semibold border-l border-amber-200/80 dark:border-amber-800/50 bg-amber-50/85 dark:bg-amber-950/35 group-hover:bg-amber-100/90 dark:group-hover:bg-amber-950/50 ${
                        (sale.netWeight ?? 0) > 0
                          ? (sale.profitPerNetTon ?? 0) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                      title="吨钢毛利=利润÷净重(吨)"
                    >
                      {(sale.netWeight ?? 0) > 0 ? (sale.profitPerNetTon ?? 0).toFixed(2) : '—'}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
              {salesDetailMonthTotal && paginatedDetails.length > 0 && (
                <tfoot className="bg-gray-100 dark:bg-gray-700/90 border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-2.5 text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap"
                    >
                      {salesDetailMonthTotal.label}
                      <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                        （{currentMonthDetails.length} 笔）
                      </span>
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs font-bold tabular-nums text-gray-900 dark:text-white"
                      title="净重累计，单位：吨"
                    >
                      {salesDetailMonthTotal.netWeight.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>吨</span>
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs font-bold tabular-nums text-gray-900 dark:text-white"
                      title="结算量累计，单位：吨"
                    >
                      {salesDetailMonthTotal.settlementQuantity.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>吨</span>
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs font-bold tabular-nums text-gray-900 dark:text-white"
                      title="收入(含税)累计，单位：万元"
                    >
                      {salesDetailMonthTotal.revenueWan.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>万元</span>
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs font-bold tabular-nums text-gray-900 dark:text-white"
                      title="材料成本累计，单位：万元"
                    >
                      {salesDetailMonthTotal.materialCostWan.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>万元</span>
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs font-bold tabular-nums text-gray-900 dark:text-white"
                      title="加工成本累计，单位：万元"
                    >
                      {salesDetailMonthTotal.processingCostWan.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>万元</span>
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs font-bold tabular-nums text-gray-900 dark:text-white"
                      title="其它成本累计，单位：万元"
                    >
                      {salesDetailMonthTotal.otherCostsWan.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>万元</span>
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs font-bold tabular-nums text-gray-900 dark:text-white"
                      title="其它收入累计，单位：万元"
                    >
                      {salesDetailMonthTotal.otherIncomeWan.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>万元</span>
                    </td>
                    <td
                      className={`px-2 py-2.5 text-xs font-bold tabular-nums ${
                        salesDetailMonthTotal.profit >= 0
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                      title="利润累计，单位：万元"
                    >
                      {salesDetailMonthTotal.profitWan.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>万元</span>
                    </td>
                    <td
                      className={`px-2 py-2.5 text-xs font-bold tabular-nums border-l border-amber-200/80 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/40 ${
                        salesDetailMonthTotal.profitPerNetTon >= 0
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                      title="吨钢毛利 = 月合计利润 ÷ 月合计净重，单位：元/吨"
                    >
                      {salesDetailMonthTotal.profitPerNetTon.toFixed(2)}
                      <span className={SD_TOTAL_UNIT}>元/吨</span>
                    </td>
                  </tr>
                </tfoot>
              )}
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
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <ProfitChartLoadingVeil show={loadStage === 'core'} />
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
            onMouseEnter={clearTooltipHideTimer}
            onMouseLeave={scheduleTooltipHide}
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                材料成本明细（LIFO）
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <div>发货单号: {tooltipData.sale.deliveryNumber}</div>
                <div>
                  成品:{' '}
                  {tooltipData.sale.productDisplayName ||
                    tooltipData.sale.warehouse ||
                    tooltipData.sale.productType}{' '}
                  ({tooltipData.sale.productType})
                </div>
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
              const prodTons =
                tooltipData.sale.costParamSnapshot?.materialCalcQuantity ??
                (tooltipData.sale.productionRecords?.reduce((s, r) => s + (r.quantity ?? 0), 0) ||
                  tooltipData.sale.settlementQuantity);
              const nodeLabel = (name: string, tons: number) => `${name}\n${tons.toFixed(2)}吨`;
              const nodes = [
                ...comp.map((m) => ({
                  name: nodeLabel(m.material, m.quantity ?? 0),
                })),
                { name: nodeLabel(targetName, prodTons) },
              ];
              const links = comp
                .filter(m => (m.quantity ?? 0) > 0)
                .map(m => ({
                  source: nodeLabel(m.material, m.quantity ?? 0),
                  target: nodeLabel(targetName, prodTons),
                  value: m.quantity,
                }));
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
                          label: { fontSize: 10, lineHeight: 14 },
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
            onMouseEnter={clearTooltipHideTimer}
            onMouseLeave={scheduleTooltipHide}
          >
            {(() => {
              const s = tooltipData.sale;
              const qty = s.settlementQuantity || 0;
              const nw = s.netWeight ?? 0;
              const transport = s.transportCost ?? 0;
              const tax = s.taxCost ?? 0;
              const discount = s.discountCost ?? 0;
              const interest = s.interestCost ?? 0;
              const total = s.otherCosts ?? 0;
              const snap = s.costParamSnapshot;
              const whTax = snap?.warehouseTaxRate ?? 0;
              const whTaxLabel = snap?.warehouseTaxRateFromLifo
                ? '入库单加权税率'
                : '入库单税率(inbound_tax_rate)';
              const revenueExcl = s.revenue / 1.13;
              const taxBase =
                snap?.taxBaseTotal ??
                revenueExcl * 0.13 -
                  s.materialCost * whTax -
                  (s.processingCost ?? 0) * 0.09 -
                  transport * 0.03;
              const taxMain = snap?.taxMainRate ?? 0;
              const taxExtra = snap?.taxExtraRate ?? 0;
              const taxMainAmt = taxBase * taxMain;
              const taxExtraAmt = (revenueExcl + s.materialCost) * taxExtra;
              const pTransport = snap?.transportFeeConfigured ?? 0;
              const pRoad = snap?.roadLossFactor ?? 1.03;
              const d1 = snap?.discountTranche1 ?? 0;
              const d2 = snap?.discountTranche2 ?? 0;
              const tLabel = transportFeeLabel(s.customer);
              const cLabel = collectionDaysLabel(s.customer);
              return (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    其它成本项明细
                  </h3>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 space-y-1">
                    <div>发货单号: {s.deliveryNumber}</div>
                    <div>
                      客户: {s.customer} | 成品: {s.productDisplayName || s.warehouse || s.productType}
                    </div>
                    <div>净重: {nw.toFixed(3)} 吨 | 结算量: {qty.toFixed(2)} 吨 | 收入(含税): {s.revenue.toFixed(2)} 元</div>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200 mb-2 space-y-1">
                    <div>运输费: <strong>{transport.toFixed(2)}</strong> 元</div>
                    <div>税费: <strong>{tax.toFixed(2)}</strong> 元</div>
                    <div>贴现费用: <strong>{discount.toFixed(2)}</strong> 元</div>
                    <div>回款周期资金利息: <strong>{interest.toFixed(2)}</strong> 元</div>
                    <div className="font-semibold mt-1 border-t border-gray-200 dark:border-gray-600 pt-1">
                      其它成本合计: {total.toFixed(2)} 元
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      计算过程
                    </h4>
                    <div className="space-y-2 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                      <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50/80 dark:bg-gray-900/50">
                        <div className="font-medium text-gray-800 dark:text-gray-100">运输费</div>
                        <div>
                          运输费 = {paramBracket(tLabel, `${pTransport.toFixed(2)}元/吨`)} ÷ {paramBracket('路损系数', pRoad.toFixed(4))} × 净重{nw.toFixed(3)}吨
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                          = {transport.toFixed(2)} 元
                        </div>
                      </div>
                      <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50/80 dark:bg-gray-900/50">
                        <div className="font-medium text-gray-800 dark:text-gray-100">税费</div>
                        <div>
                          税费基数 = 收入不含税×{pctBracket('增值税率', 0.13)} − 材料成本×{pctBracket(whTaxLabel, whTax, 4)} − 加工成本×{pctBracket('加工成本税率', 0.09)} − 运输费×{pctBracket('运输费税率', 0.03)}
                        </div>
                        <div>= {taxBase.toFixed(2)} 元</div>
                        <div>
                          税费 = 基数×{pctBracket('主税率', taxMain)} + (收入不含税+材料成本)×{pctBracket('附加税率', taxExtra, 4)}
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                          = {taxMainAmt.toFixed(2)} + {taxExtraAmt.toFixed(2)} = {tax.toFixed(2)} 元
                        </div>
                      </div>
                      <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50/80 dark:bg-gray-900/50">
                        <div className="font-medium text-gray-800 dark:text-gray-100">贴现费用</div>
                        {s.customer === '萍钢' ? (
                          <>
                            <div>
                              段1 = 收入含税×{pctBracket('萍钢贴现率', snap?.discountRatePinggang ?? 0)}×{paramBracket('萍钢贴现天数', `${snap?.discountDaysPinggang ?? 0}天`)}÷360
                            </div>
                            <div>
                              段2 = 收入含税×{pctBracket('反向贴现年利率', snap?.reverseDiscountAnnualRate ?? 0)}×{paramBracket('反向贴现占用天数', `${snap?.reverseDiscountOccupancyDays ?? 0}天`)}÷360
                            </div>
                            <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                              段1 {d1.toFixed(2)} + 段2 {d2.toFixed(2)} = {discount.toFixed(2)} 元
                            </div>
                          </>
                        ) : (
                          <div>仅萍钢计提，当前客户为 0 元</div>
                        )}
                      </div>
                      <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50/80 dark:bg-gray-900/50">
                        <div className="font-medium text-gray-800 dark:text-gray-100">回款周期资金利息</div>
                        <div>
                          回款利息 = 收入含税×{pctBracket('年利率', snap?.interestRateAnnual ?? 0)}÷360×{paramBracket(cLabel, `${snap?.collectionDays ?? 0}天`)}
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                          = {interest.toFixed(2)} 元
                        </div>
                      </div>
                    </div>
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
            onMouseEnter={clearTooltipHideTimer}
            onMouseLeave={scheduleTooltipHide}
          >
            {(() => {
              const s = tooltipData.sale;
              const qty = s.settlementQuantity || 0;
              const nw = s.netWeight ?? 0;
              const imm = s.immediateRefund ?? 0;
              const gov = s.governmentSupport ?? 0;
              const total = s.otherIncome ?? 0;
              const snap = s.costParamSnapshot;
              const whTax = snap?.warehouseTaxRate ?? 0;
              const whTaxLabel = snap?.warehouseTaxRateFromLifo
                ? '入库单加权税率'
                : '入库单税率(inbound_tax_rate)';
              const revenueExcl = s.revenue / 1.13;
              const base =
                snap?.refundBaseTotal ??
                revenueExcl * 0.13 -
                  s.materialCost * whTax -
                  (s.processingCost ?? 0) * 0.09 -
                  (s.transportCost ?? 0) * 0.03;
              const snapIrRate = snap?.instantRefundRate ?? 0;
              const rGov = snap?.govSubsidyRate ?? 0;
              const r70 = snap?.govSubsidyRate70 ?? 0;
              const giveCes = snap?.isGiveCes ?? 0;
              const giveTaxExtra = snap?.isGiveTaxExtra ?? 0;
              const isXingang = s.customer === '新钢';
              const hasGovMill = s.customer === '萍钢' || s.customer === '新钢' || s.customer === '吉钢';
              const govMain = snap?.governmentSupportMain ?? 0;
              const govStamp = snap?.governmentSupportStamp ?? 0;
              const govTaxExtra = snap?.governmentSupportTaxExtra ?? 0;
              return (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    其它收入项明细
                  </h3>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 space-y-1">
                    <div>发货单号: {s.deliveryNumber}</div>
                    <div>
                      客户: {s.customer} | 成品: {s.productDisplayName || s.warehouse || s.productType}
                    </div>
                    <div>净重: {nw.toFixed(3)} 吨 | 结算量: {qty.toFixed(2)} 吨 | 收入(含税): {s.revenue.toFixed(2)} 元</div>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200 mb-2 space-y-1">
                    <div>即征即退: <strong>{imm.toFixed(2)}</strong> 元</div>
                    <div>政府扶持资金: <strong>{gov.toFixed(2)}</strong> 元</div>
                    <div className="font-semibold mt-1 border-t border-gray-200 dark:border-gray-600 pt-1">
                      其它收入合计: {total.toFixed(2)} 元
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      计算过程
                    </h4>
                    <div className="space-y-2 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                      <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50/80 dark:bg-gray-900/50">
                        <div className="font-medium text-gray-800 dark:text-gray-100">基数</div>
                        <div>
                          基数 = 收入不含税×{pctBracket('增值税率', 0.13)} − 材料成本×{pctBracket(whTaxLabel, whTax, 4)} − 加工成本×{pctBracket('加工成本税率', 0.09)} − 运输费×{pctBracket('运输费税率', 0.03)}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                          = {revenueExcl.toFixed(2)}×13%({(revenueExcl * 0.13).toFixed(2)}) − {s.materialCost.toFixed(2)}×{pctBracket(whTaxLabel, whTax, 4)}({(s.materialCost * whTax).toFixed(2)}) − {(s.processingCost ?? 0).toFixed(2)}×9%({((s.processingCost ?? 0) * 0.09).toFixed(2)}) − {(s.transportCost ?? 0).toFixed(2)}×3%({((s.transportCost ?? 0) * 0.03).toFixed(2)})
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                          = {base.toFixed(2)} 元
                        </div>
                      </div>
                      <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50/80 dark:bg-gray-900/50">
                        <div className="font-medium text-gray-800 dark:text-gray-100">即征即退</div>
                        {isXingang ? (
                          <div className="text-emerald-700 dark:text-emerald-300">
                            即征即退 = 基数 × {pctBracket('即征即退比例', snapIrRate)} = {imm.toFixed(2)} 元
                          </div>
                        ) : (
                          <div>仅新钢计提，当前客户为 0 元</div>
                        )}
                      </div>
                      <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50/80 dark:bg-gray-900/50">
                        <div className="font-medium text-gray-800 dark:text-gray-100">政府扶持资金</div>
                        {hasGovMill ? (
                          <>
                            <div>
                              {isXingang
                                ? `主项 = 基数×${pctBracket('政府扶持比例', rGov)}×${pctBracket('即征即退70%系数', r70)}`
                                : `主项 = 基数×${pctBracket('政府扶持比例', rGov)}`}
                            </div>
                            <div>
                              印花税 = (收入不含税+材料成本)×{pctBracket('印花税率', 0.0003, 4)}×{paramBracket('是否结给印花税', giveCes ? '是' : '否')}
                            </div>
                            <div>
                              城建及教育 = 基数×{pctBracket('城建教育比例', 0.1)}×{paramBracket('是否结给城建教育', giveTaxExtra ? '是' : '否')}
                            </div>
                            <div className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                              主项 {govMain.toFixed(2)} + 印花税 {govStamp.toFixed(2)} + 城建教育 {govTaxExtra.toFixed(2)} = {gov.toFixed(2)} 元
                            </div>
                          </>
                        ) : (
                          <div>仅萍钢/吉钢/新钢计提</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
