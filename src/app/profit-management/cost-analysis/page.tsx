'use client';

import { useState, useEffect, useMemo } from 'react';
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

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MATERIAL_INVENTORY_MIN_CLOSING = '2026-04-01';

interface InventoryRow {
  storageArea: string;
  materialType: string;
  qty: number;
  price: number;
  amount: number;
}

/** 与 API `/api/profit-management/cost-analysis/inventory-value` 一致 */
interface InventoryValueAnalysisRow {
  storageArea: string;
  materialType: string;
  currentQty: number;
  currentPrice: number;
  avgPurchaseUnitPrice: number | null;
  inventoryAmount: number;
  earliestPurchaseDate: string | null;
  latestPurchaseDate: string | null;
  latestPurchaseUnitPrice: number | null;
}

function InventoryValueAnalysisSection({
  rows,
  loading,
  error,
}: {
  rows: InventoryValueAnalysisRow[];
  loading: boolean;
  error: string | null;
}) {
  const fmt = (n: number | null | undefined, digits = 2) =>
    n != null && Number.isFinite(n) ? n.toFixed(digits) : '—';
  const fmt4 = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) ? n.toFixed(4) : '—';

  const { totalQty, totalInventoryAmount } = useMemo(() => {
    let q = 0;
    let a = 0;
    for (const r of rows) {
      q += r.currentQty;
      a += r.inventoryAmount;
    }
    return { totalQty: q, totalInventoryAmount: a };
  }, [rows]);

  return (
    <section className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          毛料库存价值分析
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          临时口径：数量/金额按「2026-03-31 期初 + 全部中心基地 SH 入库（含优质毛料库、M钢渣粒子、MP废钢库；目录外库区/物料亦按入库滚入）− 加工耗用」滚存至今日，仅剔除 TH 贸易直送。金额为滚存数量×滚存计价单价；平均采购单价一般为上述入库加权（不含税）。「毛料库」「毛料库区一」平均采购单价取滚存计价单价。
        </p>
      </div>
      {loading && (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          正在加载库存价值数据…
        </div>
      )}
      {!loading && error && (
        <div className="px-4 py-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  库区
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  毛料名称
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-sky-800 dark:text-sky-300">
                  当前库存总数量（吨）
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  平均采购单价（元/吨）
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-sky-800 dark:text-sky-300">
                  库存总金额（元）
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  最早采购日期
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  最近采购日期
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  最近采购单价（元/吨）
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    暂无库存大于 0 的毛料行
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.storageArea}-${r.materialType}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                      {r.storageArea}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                      {r.materialType}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right tabular-nums text-sky-800 dark:text-sky-300">
                      {fmt4(r.currentQty)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 dark:text-gray-100">
                      {fmt(r.avgPurchaseUnitPrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right tabular-nums text-sky-800 dark:text-sky-300">
                      {fmt(r.inventoryAmount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                      {r.earliestPurchaseDate ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                      {r.latestPurchaseDate ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 dark:text-gray-100">
                      {fmt(r.latestPurchaseUnitPrice)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/50">
                <tr>
                  <td
                    colSpan={2}
                    className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
                  >
                    合计
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right tabular-nums text-sky-800 dark:text-sky-300">
                    {fmt4(totalQty)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right tabular-nums text-gray-500 dark:text-gray-400">
                    —
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right tabular-nums text-sky-800 dark:text-sky-300">
                    {fmt(totalInventoryAmount)}
                  </td>
                  <td colSpan={3} className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    —
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}

export default function CostAnalysis() {
  const [data, setData] = useState<CostAnalysisData | null>(null);
  /** quick：首屏核心指标与趋势已就绪；full：料型分布等已合并 */
  const [loadStage, setLoadStage] = useState<'idle' | 'quick' | 'full'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportingType, setExportingType] = useState<'' | 'summary' | 'inventory'>('');
  /** 当月内任选一日查看「当日成本」汇总（与 API costDay 一致） */
  const [costViewDate, setCostViewDate] = useState(() => {
    const n = new Date();
    return formatYmd(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  });
  const [costDayMin, setCostDayMin] = useState('');
  const [costDayMax, setCostDayMax] = useState('');

  const invMonthChoices = useMemo(() => {
    const now = new Date();
    return [0, 1, 2].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      };
    });
  }, []);

  const [invPickIdx, setInvPickIdx] = useState(0);
  const invYear = invMonthChoices[invPickIdx]?.year ?? new Date().getFullYear();
  const invMonth = invMonthChoices[invPickIdx]?.month ?? new Date().getMonth() + 1;

  const [invClosingDate, setInvClosingDate] = useState(() => {
    const n = new Date();
    return formatYmd(n);
  });
  const [invOpeningRows, setInvOpeningRows] = useState<InventoryRow[]>([]);
  const [invClosingRows, setInvClosingRows] = useState<InventoryRow[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invErr, setInvErr] = useState<string | null>(null);

  const [invValueRows, setInvValueRows] = useState<InventoryValueAnalysisRow[]>([]);
  const [invValueLoading, setInvValueLoading] = useState(true);
  const [invValueErr, setInvValueErr] = useState<string | null>(null);

  const invClosingMin = MATERIAL_INVENTORY_MIN_CLOSING;
  const invClosingMax = useMemo(() => formatYmd(new Date()), []);

  useEffect(() => {
    if (invClosingDate < invClosingMin) setInvClosingDate(invClosingMin);
    else if (invClosingDate > invClosingMax) setInvClosingDate(invClosingMax);
  }, [invClosingDate, invClosingMin, invClosingMax]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setInvLoading(true);
      setInvErr(null);
      try {
        const qs = new URLSearchParams({
          year: String(invYear),
          month: String(invMonth),
          closingDate: invClosingDate,
        });
        const res = await fetch(
          `/api/profit-management/cost-analysis/material-inventory?${qs.toString()}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setInvOpeningRows(json.data?.opening || []);
          setInvClosingRows(json.data?.closing || []);
        }
      } catch (e) {
        if (!cancelled) {
          setInvErr(e instanceof Error ? e.message : '加载失败');
          setInvOpeningRows([]);
          setInvClosingRows([]);
        }
      } finally {
        if (!cancelled) setInvLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [invYear, invMonth, invClosingDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInvValueLoading(true);
      setInvValueErr(null);
      try {
        const res = await fetch('/api/profit-management/cost-analysis/inventory-value');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        if (!cancelled) setInvValueRows(json.data?.rows ?? []);
      } catch (e) {
        if (!cancelled) {
          setInvValueErr(e instanceof Error ? e.message : '加载失败');
          setInvValueRows([]);
        }
      } finally {
        if (!cancelled) setInvValueLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setCostDayMin(formatYmd(monthStart));
    setCostDayMax(formatYmd(today));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const qs = new URLSearchParams({ phase: 'quick', costDay: costViewDate });

    const fetchData = async () => {
      try {
        setLoadStage('idle');
        setError(null);
        const quickRes = await fetch(`/api/profit-management/cost-analysis?${qs.toString()}`);
        if (!quickRes.ok) {
          const errorData = await quickRes.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${quickRes.status}`);
        }
        const quickJson = await quickRes.json();
        if (!quickJson.success) throw new Error(quickJson.error || '获取数据失败');
        if (!cancelled) {
          setData(quickJson.data);
          setLoadStage('quick');
        }
      } catch (err) {
        console.error('获取成本分析数据失败（首屏）:', err);
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        if (!cancelled) {
          setError(errorMessage);
          setData(null);
          setLoadStage('idle');
        }
        return;
      }

      try {
        const fullQs = new URLSearchParams({ costDay: costViewDate });
        const fullRes = await fetch(`/api/profit-management/cost-analysis?${fullQs.toString()}`);
        if (!fullRes.ok) {
          const errorData = await fullRes.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${fullRes.status}`);
        }
        const fullJson = await fullRes.json();
        if (!fullJson.success) throw new Error(fullJson.error || '获取数据失败');
        if (!cancelled) {
          setData(fullJson.data);
          setLoadStage('full');
        }
      } catch (e2) {
        console.warn('成本分析：详图数据加载失败，已保留首屏数据', e2);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [costViewDate]);

  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setExportStartDate(`${yyyy}-${mm}-01`);
    setExportEndDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const handleExportData = async (mode: 'summary' | 'inventory' = 'summary') => {
    if (!exportStartDate || !exportEndDate) {
      alert('请选择导出日期范围');
      return;
    }
    if (exportStartDate > exportEndDate) {
      alert('开始日期不能晚于结束日期');
      return;
    }
    try {
      setExportingType(mode);
      const params = new URLSearchParams({
        startDate: exportStartDate,
        endDate: exportEndDate,
        mode,
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
      a.download =
        mode === 'inventory'
          ? `基地毛料与成品统计_${exportStartDate}_至_${exportEndDate}.xlsx`
          : `毛料采购汇总_${exportStartDate}_至_${exportEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出失败';
      alert(msg);
    } finally {
      setExportingType('');
    }
  };

  if (!data && !error) {
    return (
      <CostAnalysisSkeleton
        topExtra={
          <InventoryValueAnalysisSection
            rows={invValueRows}
            loading={invValueLoading}
            error={invValueErr}
          />
        }
      />
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
        const costWan = Number(params.value) || 0;
        return `${params.name}<br/>成本: ${costWan.toFixed(2)} 万元<br/>平均单价: ${avgPrice.toFixed(2)} 元/吨<br/>数量: ${quantity.toFixed(2)} 吨<br/>占比: ${params.percent.toFixed(2)}%`;
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
            const costWan = Number(params.value) || 0;
            return `${params.name}\n成本:${costWan.toFixed(2)}万元\n平均单价:${avgPrice.toFixed(2)}元/吨\n数量:${quantity.toFixed(2)}吨\n(${params.percent.toFixed(2)}%)`;
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
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              导出数据（支持日期范围：毛料采购汇总、基地收货+成品统计台账）
            </div>
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
                onClick={() => handleExportData('summary')}
                disabled={!!exportingType}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exportingType === 'summary' ? '导出中...' : '导出毛料汇总'}
              </button>
              <button
                type="button"
                onClick={() => handleExportData('inventory')}
                disabled={!!exportingType}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exportingType === 'inventory' ? '导出中...' : '导出台账表'}
              </button>
            </div>
          </div>
        </div>

        <InventoryValueAnalysisSection
          rows={invValueRows}
          loading={invValueLoading}
          error={invValueErr}
        />

        {loadStage === 'quick' && (
          <div className="mb-4 rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
            料型分布、上月均价对比等图表正在后台加载，请稍候…
          </div>
        )}

        {/* 统计卡片：本月成本与毛料期初/期末表并排 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          {/* 当日成本（含当月日期选择；平均日成本仍为当月至今） */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    当日成本
                  </p>
                  {costViewDate && costDayMin && costDayMax && (
                    <label className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="whitespace-nowrap">查看日期</span>
                      <input
                        type="date"
                        value={costViewDate}
                        min={costDayMin}
                        max={costDayMax}
                        onChange={(e) => setCostViewDate(e.target.value)}
                        className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-snug">
                  {data.summary.todayCost.toFixed(2)}万元{' '}
                  <span className="font-semibold">{todayTotalQty.toFixed(2)} 吨</span>
                </p>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>
                    基地收货 {data.summary.todayBaseSelfQty.toFixed(2)} 吨{' '}
                    {data.summary.todayBaseSelfCost.toFixed(2)}万元
                  </div>
                  <div>
                    基地买货 {data.summary.todayBasePurchaseQty.toFixed(2)} 吨{' '}
                    {data.summary.todayBasePurchaseCost.toFixed(2)}万元
                  </div>
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
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums leading-snug">
                {data.summary.weekCost.toFixed(2)}万元{' '}
                <span className="font-semibold">{weekTotalQty.toFixed(2)} 吨</span>
              </p>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>
                  基地收货 {data.summary.weekBaseSelfQty.toFixed(2)} 吨{' '}
                  {data.summary.weekBaseSelfCost.toFixed(2)}万元
                </div>
                <div>
                  基地买货 {data.summary.weekBasePurchaseQty.toFixed(2)} 吨{' '}
                  {data.summary.weekBasePurchaseCost.toFixed(2)}万元
                </div>
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
                                    return `${params.name}<br/>平均单价: ${avgPrice.toFixed(2)} 元/吨<br/>采购 ${quantity.toFixed(2)} 吨<br/>占比: ${params.percent.toFixed(2)}%`;
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

          <div className="lg:col-span-3 flex flex-col xl:flex-row gap-4 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 shrink-0 xl:w-[220px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    本月成本
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums leading-snug">
                    {data.summary.monthCost.toFixed(2)}万元{' '}
                    <span className="font-semibold">{monthTotalQty.toFixed(2)} 吨</span>
                  </p>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>
                      基地收货 {data.summary.monthBaseSelfQty.toFixed(2)} 吨{' '}
                      {data.summary.monthBaseSelfCost.toFixed(2)}万元
                    </div>
                    <div>
                      基地买货 {data.summary.monthBasePurchaseQty.toFixed(2)} 吨{' '}
                      {data.summary.monthBasePurchaseCost.toFixed(2)}万元
                    </div>
                  </div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3 hidden sm:block">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex-1 min-w-0 border border-gray-100 dark:border-gray-700">
              <div className="flex flex-wrap items-end gap-3 mb-3">
                <label className="text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                  <span>期初月份（当月 1 日 0 点）</span>
                  <select
                    value={invPickIdx}
                    onChange={(e) => setInvPickIdx(Number(e.target.value))}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {invMonthChoices.map((c, idx) => (
                      <option key={`${c.year}-${c.month}`} value={idx}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                  <span>期末截止日（当天 24 点）</span>
                  <input
                    type="date"
                    min={invClosingMin}
                    max={invClosingMax}
                    value={invClosingDate}
                    onChange={(e) => setInvClosingDate(e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </label>
                {invLoading && (
                  <span className="text-xs text-gray-500">加载中…</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
                期初：MaterialStorage 的 20260331_qty / 20260331_price；4 月为表列示值，5、6 月起为自 2026-04-01 起按基地收货（SH 剔除三库）以预估干基吨数、总价（不含税）入库加权，加工 material_composition 耗用滚存（若库表无该列则暂不扣加工）。
                期末：同口径滚存至所选日。
              </p>
              {invErr && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">{invErr}</p>
              )}
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto text-xs">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">期初（吨 / 元每吨）</p>
                <table className="w-full border-collapse text-left mb-4">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                      <th className="py-1 pr-2 font-medium">库区</th>
                      <th className="py-1 pr-2 font-medium">毛料</th>
                      <th className="py-1 pr-2 font-medium text-right">数量</th>
                      <th className="py-1 pr-2 font-medium text-right">单价</th>
                      <th className="py-1 font-medium text-right">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invOpeningRows.map((r, i) => (
                      <tr key={`o-${i}`} className="border-b border-gray-100 dark:border-gray-700/80">
                        <td className="py-1 pr-2 whitespace-nowrap">{r.storageArea}</td>
                        <td className="py-1 pr-2">{r.materialType}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{r.qty.toFixed(4)}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{r.price.toFixed(4)}</td>
                        <td className="py-1 text-right tabular-nums">{r.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">期末（吨 / 元每吨）</p>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                      <th className="py-1 pr-2 font-medium">库区</th>
                      <th className="py-1 pr-2 font-medium">毛料</th>
                      <th className="py-1 pr-2 font-medium text-right">数量</th>
                      <th className="py-1 pr-2 font-medium text-right">单价</th>
                      <th className="py-1 font-medium text-right">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invClosingRows.map((r, i) => (
                      <tr key={`c-${i}`} className="border-b border-gray-100 dark:border-gray-700/80">
                        <td className="py-1 pr-2 whitespace-nowrap">{r.storageArea}</td>
                        <td className="py-1 pr-2">{r.materialType}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{r.qty.toFixed(4)}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{r.price.toFixed(4)}</td>
                        <td className="py-1 text-right tabular-nums">{r.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

