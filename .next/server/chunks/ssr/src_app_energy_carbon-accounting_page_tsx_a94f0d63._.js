module.exports = {

"[project]/src/app/energy/carbon-accounting/page.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>CarbonAccounting)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/echarts-for-react/esm/index.js [app-ssr] (ecmascript)");
'use client';
;
;
;
function CarbonAccounting() {
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [year, setYear] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('2025年');
    const [standard, setStandard] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('GB/T 32150');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const fetchData = async ()=>{
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
            } finally{
                setLoading(false);
            }
        };
        fetchData();
    }, [
        year,
        standard
    ]);
    // 模拟数据（基于图示样式）
    const mockData = {
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
            months: [
                '1月',
                '2月',
                '3月',
                '4月',
                '5月',
                '6月',
                '7月',
                '8月',
                '9月',
                '10月',
                '11月',
                '12月'
            ],
            fuelCombustion: [
                400,
                350,
                420,
                380,
                450,
                400,
                480,
                460,
                420,
                400,
                380,
                350
            ],
            purchasedElectricity: [
                300,
                280,
                320,
                300,
                350,
                320,
                380,
                360,
                330,
                310,
                290,
                270
            ],
            processEmissions: [
                200,
                180,
                220,
                200,
                240,
                220,
                260,
                250,
                230,
                210,
                190,
                180
            ],
            energyConsumption: [
                450,
                410,
                480,
                440,
                520,
                470,
                550,
                530,
                490,
                460,
                430,
                400
            ]
        },
        carbonFlow: {
            nodes: [
                {
                    id: 'company',
                    name: '欧冶链金（萍乡）再生资源有限公司',
                    value: 1000,
                    level: 0
                },
                {
                    id: 'fuel',
                    name: '化石燃料燃烧排放',
                    value: 500,
                    level: 1
                },
                {
                    id: 'purchased',
                    name: '净购入电力和热力排放',
                    value: 500,
                    level: 1
                },
                {
                    id: 'naturalGas',
                    name: '天然气',
                    value: 200,
                    level: 2
                },
                {
                    id: 'electricity',
                    name: '净购入电力',
                    value: 300,
                    level: 2
                },
                {
                    id: 'coal',
                    name: '燃煤',
                    value: 150,
                    level: 2
                },
                {
                    id: 'diesel',
                    name: '柴油',
                    value: 100,
                    level: 2
                },
                {
                    id: 'steam',
                    name: '蒸汽',
                    value: 50,
                    level: 2
                }
            ],
            links: [
                {
                    source: 'company',
                    target: 'fuel',
                    value: 500
                },
                {
                    source: 'company',
                    target: 'purchased',
                    value: 500
                },
                {
                    source: 'fuel',
                    target: 'naturalGas',
                    value: 200
                },
                {
                    source: 'fuel',
                    target: 'coal',
                    value: 150
                },
                {
                    source: 'fuel',
                    target: 'diesel',
                    value: 100
                },
                {
                    source: 'fuel',
                    target: 'steam',
                    value: 50
                },
                {
                    source: 'purchased',
                    target: 'electricity',
                    value: 300
                }
            ]
        },
        emissionReduction: {
            categories: [
                '自发电',
                '外购绿电(购电协议)',
                '碳证'
            ],
            quantity: [
                40000,
                0,
                180000
            ],
            equivalentReduction: [
                35000,
                0,
                90000
            ]
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
            formatter: function(params) {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach((item)=>{
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
            data: [
                '燃料燃烧排放 (tCO₂e)',
                '购入电力热力排放 (tCO₂e)',
                '过程排放 (tCO₂e)',
                '能耗量 (tce)'
            ],
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
            formatter: function(params) {
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
            formatter: function(params) {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach((item)=>{
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
            data: [
                '数量 (kWh)',
                '等效减排量 (tCO₂e)'
            ],
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
                    formatter: function(value) {
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
                    formatter: function(value) {
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
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                        lineNumber: 408,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 dark:text-gray-300",
                        children: "加载中..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                        lineNumber: 409,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                lineNumber: 407,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
            lineNumber: 406,
            columnNumber: 7
        }, this);
    }
    if (error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-red-500 text-xl mb-4",
                        children: "❌"
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                        lineNumber: 419,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-red-600 dark:text-red-400",
                        children: [
                            "加载失败: ",
                            error
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                        lineNumber: 420,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                lineNumber: 418,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
            lineNumber: 417,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-blue-50 dark:bg-gray-900 p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-between items-center mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-3xl font-bold text-gray-800 dark:text-white",
                            children: "碳排放核算"
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                            lineNumber: 431,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center space-x-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: standard,
                                    onChange: (e)=>setStandard(e.target.value),
                                    className: "px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "GB/T 32150",
                                        children: "GB/T 32150"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                        lineNumber: 438,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                    lineNumber: 433,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600",
                                    children: year
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                    lineNumber: 440,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                            lineNumber: 432,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                    lineNumber: 430,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative overflow-hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between items-start",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-sm font-medium text-gray-600 dark:text-gray-400 mb-2",
                                                children: "年度净排放量"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                lineNumber: 452,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-3xl font-bold text-gray-900 dark:text-white",
                                                children: [
                                                    displayData.annualStats.netEmissions.value.toLocaleString(),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-lg font-normal text-gray-500 dark:text-gray-400 ml-2",
                                                        children: displayData.annualStats.netEmissions.unit
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                        lineNumber: 455,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                lineNumber: 453,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center mt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-gray-500 dark:text-gray-400",
                                                        children: [
                                                            "较去年 ",
                                                            displayData.annualStats.netEmissions.change,
                                                            "%"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                        lineNumber: 460,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "ml-2 text-green-500",
                                                        children: displayData.annualStats.netEmissions.trend === 'down' ? '↓' : displayData.annualStats.netEmissions.trend === 'up' ? '↑' : '→'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                        lineNumber: 463,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                lineNumber: 459,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                        lineNumber: 451,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute top-0 right-0 w-20 h-20 opacity-10",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            viewBox: "0 0 100 100",
                                            className: "w-full h-full",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                    cx: "50",
                                                    cy: "50",
                                                    r: "40",
                                                    fill: "#3B82F6"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                    lineNumber: 471,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                    x: "30",
                                                    y: "30",
                                                    width: "20",
                                                    height: "40",
                                                    fill: "white"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                    lineNumber: 472,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                    x: "50",
                                                    y: "35",
                                                    width: "15",
                                                    height: "30",
                                                    fill: "white"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                    lineNumber: 473,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                            lineNumber: 470,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                        lineNumber: 469,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                lineNumber: 450,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                            lineNumber: 449,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative overflow-hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between items-start",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-sm font-medium text-gray-600 dark:text-gray-400 mb-2",
                                                children: "年度能耗量"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                lineNumber: 483,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-3xl font-bold text-gray-900 dark:text-white",
                                                children: [
                                                    displayData.annualStats.energyConsumption.value.toLocaleString(),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-lg font-normal text-gray-500 dark:text-gray-400 ml-2",
                                                        children: displayData.annualStats.energyConsumption.unit
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                        lineNumber: 486,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                lineNumber: 484,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center mt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-gray-500 dark:text-gray-400",
                                                        children: [
                                                            "较去年 ",
                                                            displayData.annualStats.energyConsumption.change,
                                                            "%"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                        lineNumber: 491,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "ml-2 text-green-500",
                                                        children: displayData.annualStats.energyConsumption.trend === 'down' ? '↓' : displayData.annualStats.energyConsumption.trend === 'up' ? '↑' : '→'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                        lineNumber: 494,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                lineNumber: 490,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                        lineNumber: 482,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute top-0 right-0 w-20 h-20 opacity-10",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            viewBox: "0 0 100 100",
                                            className: "w-full h-full",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                    cx: "50",
                                                    cy: "50",
                                                    r: "40",
                                                    fill: "#10B981"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                    lineNumber: 502,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                    x: "20",
                                                    y: "60",
                                                    width: "60",
                                                    height: "20",
                                                    fill: "white"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                    lineNumber: 503,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                    x: "30",
                                                    y: "40",
                                                    width: "40",
                                                    height: "20",
                                                    fill: "white"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                    lineNumber: 504,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                    x: "40",
                                                    y: "20",
                                                    width: "20",
                                                    height: "20",
                                                    fill: "white"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                                    lineNumber: 505,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                            lineNumber: 501,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                        lineNumber: 500,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                lineNumber: 481,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                            lineNumber: 480,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                    lineNumber: 447,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        option: monthlyEmissionsChartOption,
                        style: {
                            height: '400px',
                            width: '100%'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                        lineNumber: 514,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                    lineNumber: 513,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-center mb-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-lg font-semibold text-gray-800 dark:text-white",
                                            children: "碳流图 (tCO₂e)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                            lineNumber: 525,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600",
                                            children: "展开全部"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                            lineNumber: 526,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                    lineNumber: 524,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    option: carbonFlowChartOption,
                                    style: {
                                        height: '400px',
                                        width: '100%'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                    lineNumber: 530,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                            lineNumber: 523,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-semibold text-gray-800 dark:text-white mb-4",
                                    children: "减排分析"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                    lineNumber: 538,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    option: emissionReductionChartOption,
                                    style: {
                                        height: '400px',
                                        width: '100%'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                                    lineNumber: 539,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                            lineNumber: 537,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
                    lineNumber: 521,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
            lineNumber: 428,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/energy/carbon-accounting/page.tsx",
        lineNumber: 427,
        columnNumber: 5
    }, this);
}
}}),

};

//# sourceMappingURL=src_app_energy_carbon-accounting_page_tsx_a94f0d63._.js.map