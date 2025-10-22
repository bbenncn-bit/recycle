module.exports = {

"[project]/src/app/energy/consumption-calculation/page.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>ConsumptionCalculation)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/echarts-for-react/esm/index.js [app-ssr] (ecmascript)");
'use client';
;
;
;
function ConsumptionCalculation() {
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [timeInterval, setTimeInterval] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('day');
    const [startDate, setStartDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('2025-06-01');
    const [endDate, setEndDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('2025-06-10');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const fetchData = async ()=>{
            try {
                setLoading(true);
                const response = await fetch('/api/energy/consumption-calculation');
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
                console.error('获取能源消费量计算数据失败:', err);
                setError(err instanceof Error ? err.message : '未知错误');
            } finally{
                setLoading(false);
            }
        };
        fetchData();
    }, [
        timeInterval,
        startDate,
        endDate
    ]);
    // 模拟数据（基于图示样式）
    const mockData = {
        timeInterval: 'day',
        startDate: '2025-06-01',
        endDate: '2025-06-10',
        energyTypes: [
            {
                id: 1,
                name: '电 (kWh)',
                originalValue: 655016.00,
                energyConsumption: 416459.17,
                percentage: 69.67,
                conversionFactor: 0.1229,
                unit: 'kWh'
            },
            {
                id: 2,
                name: '煤 (t)',
                originalValue: 0,
                energyConsumption: 0,
                percentage: 0,
                conversionFactor: 714.3,
                unit: 't'
            },
            {
                id: 3,
                name: '柴油 (kg)',
                originalValue: 120000.00,
                energyConsumption: 174000.00,
                percentage: 29.11,
                conversionFactor: 1.2094,
                unit: 'kg'
            },
            {
                id: 4,
                name: '汽油 (L)',
                originalValue: 0,
                energyConsumption: 0,
                percentage: 0,
                conversionFactor: 1.0999,
                unit: 'L'
            },
            {
                id: 5,
                name: '天然气 (m³)',
                originalValue: 6609.68,
                energyConsumption: 7270.65,
                percentage: 1.22,
                conversionFactor: 1.215,
                unit: 'm³'
            },
            {
                id: 6,
                name: '液化石油气 (kg)',
                originalValue: 0,
                energyConsumption: 0,
                percentage: 0,
                conversionFactor: 1.7143,
                unit: 'kg'
            },
            {
                id: 7,
                name: '热力 (GJ)',
                originalValue: 0,
                energyConsumption: 0,
                percentage: 0,
                conversionFactor: 0.0341,
                unit: 'GJ'
            },
            {
                id: 8,
                name: '其它 (kgce)',
                originalValue: 0,
                energyConsumption: 0,
                percentage: 0,
                conversionFactor: 1,
                unit: 'kgce'
            },
            {
                id: 9,
                name: '水 (m³)',
                originalValue: 12503.00,
                energyConsumption: 0,
                percentage: 0,
                conversionFactor: 0,
                unit: 'm³'
            }
        ],
        totalConsumption: 597729.82,
        chartData: {
            categories: [
                '电',
                '柴油',
                '天然气',
                '煤',
                '汽油',
                '液化石油气',
                '热力',
                '其它'
            ],
            values: [
                416459.17,
                174000.00,
                7270.65,
                0,
                0,
                0,
                0,
                0
            ],
            percentages: [
                69.67,
                29.11,
                1.22,
                0,
                0,
                0,
                0,
                0
            ]
        }
    };
    const displayData = data || mockData;
    // 能源消费量饼图配置
    const pieChartOption = {
        title: {
            text: '能源消费量分布',
            left: 'center',
            textStyle: {
                color: '#374151',
                fontSize: 18,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} kgce ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            top: 'middle',
            textStyle: {
                color: '#6B7280'
            }
        },
        series: [
            {
                name: '能源消费量',
                type: 'pie',
                radius: [
                    '40%',
                    '70%'
                ],
                center: [
                    '60%',
                    '50%'
                ],
                data: displayData.energyTypes.filter((item)=>item.energyConsumption > 0).map((item)=>{
                    const energyType = item.name.split(' ')[0]; // 只取能源类型名称
                    console.log(`饼图数据 - 原始名称: ${item.name}, 提取类型: ${energyType}, 消费量: ${item.energyConsumption}`);
                    return {
                        value: item.energyConsumption,
                        name: energyType,
                        itemStyle: {
                            color: getEnergyTypeColor(energyType)
                        }
                    };
                }),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };
    // 能源消费量柱状图配置
    const barChartOption = {
        title: {
            text: '能源消费量对比',
            left: 'center',
            textStyle: {
                color: '#374151',
                fontSize: 18,
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
                    result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kgce<br/>`;
                });
                return result;
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
            data: displayData.chartData.categories,
            axisLabel: {
                color: '#6B7280',
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            name: '消费量(kgce)',
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
        series: [
            {
                name: '能源消费量',
                type: 'bar',
                data: displayData.chartData.values.map((value, index)=>({
                        value: value,
                        itemStyle: {
                            color: getEnergyTypeColor(displayData.chartData.categories[index])
                        }
                    })),
                barWidth: '60%'
            }
        ]
    };
    // 获取能源类型颜色
    function getEnergyTypeColor(energyType) {
        const colors = {
            '电': '#3B82F6',
            '煤': '#6B7280',
            '柴油': '#F59E0B',
            '汽油': '#EF4444',
            '天然气': '#10B981',
            '液化石油气': '#8B5CF6',
            '热力': '#F97316',
            '其它': '#6B7280',
            '水': '#06B6D4'
        };
        const color = colors[energyType] || '#6B7280';
        console.log(`能源类型: ${energyType}, 颜色: ${color}`);
        return color;
    }
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                        lineNumber: 300,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 dark:text-gray-300",
                        children: "加载中..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                        lineNumber: 301,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                lineNumber: 299,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
            lineNumber: 298,
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
                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                        lineNumber: 311,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-red-600 dark:text-red-400",
                        children: [
                            "加载失败: ",
                            error
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                        lineNumber: 312,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                lineNumber: 310,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
            lineNumber: 309,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-blue-50 dark:bg-gray-900 p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-3xl font-bold text-gray-800 dark:text-white mb-2",
                            children: "能源消费量计算"
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                            lineNumber: 323,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-600 dark:text-gray-300",
                            children: "能源消费总量统计与分析"
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                            lineNumber: 324,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                    lineNumber: 322,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center space-x-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center space-x-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm font-medium text-gray-700 dark:text-gray-300",
                                        children: "时间间隔:"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 331,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex space-x-2",
                                        children: [
                                            'day',
                                            'month',
                                            'year'
                                        ].map((interval)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setTimeInterval(interval),
                                                className: `px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeInterval === interval ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`,
                                                children: interval === 'day' ? '日' : interval === 'month' ? '月' : '年'
                                            }, interval, false, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 334,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 332,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                lineNumber: 330,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center space-x-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm font-medium text-gray-700 dark:text-gray-300",
                                        children: "时间段:"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 349,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "date",
                                        value: startDate,
                                        onChange: (e)=>setStartDate(e.target.value),
                                        className: "px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 350,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-gray-500",
                                        children: "至"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 356,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "date",
                                        value: endDate,
                                        onChange: (e)=>setEndDate(e.target.value),
                                        className: "px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 357,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                lineNumber: 348,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                        lineNumber: 329,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                    lineNumber: 328,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xl font-semibold text-gray-800 dark:text-white",
                                children: [
                                    startDate,
                                    "至",
                                    endDate,
                                    "能源消费总量统计表"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                lineNumber: 370,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex space-x-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors",
                                        children: "报表导出"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 374,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors",
                                        children: "折标煤系数管理"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 377,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                lineNumber: 373,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                        lineNumber: 369,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                    lineNumber: 368,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    className: "bg-gray-50 dark:bg-gray-700",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                children: "序号"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 390,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                children: "能源种类"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 393,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                children: "原始值"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 396,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                children: "能耗量(kgce)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 399,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                children: "占比(%)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 402,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                children: "折煤系数"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 405,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                        lineNumber: 389,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                    lineNumber: 388,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                    children: [
                                        displayData.energyTypes.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                className: "hover:bg-gray-50 dark:hover:bg-gray-700",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                        children: index + 1
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                        lineNumber: 413,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                        children: item.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                        lineNumber: 416,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                        children: item.originalValue > 0 ? item.originalValue.toLocaleString() : '-'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                        lineNumber: 419,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                        children: item.energyConsumption > 0 ? item.energyConsumption.toLocaleString() : '-'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                        lineNumber: 422,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                        children: item.percentage > 0 ? `${item.percentage}%` : '-'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                        lineNumber: 425,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                        children: item.conversionFactor > 0 ? item.conversionFactor : '-'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                        lineNumber: 428,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, item.id, true, {
                                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                lineNumber: 412,
                                                columnNumber: 19
                                            }, this)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            className: "bg-blue-50 dark:bg-blue-900/20 font-semibold",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                    colSpan: 3,
                                                    children: "能源消费总量(kgce)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                    lineNumber: 434,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-bold",
                                                    children: displayData.totalConsumption.toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                    lineNumber: 437,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                    colSpan: 2,
                                                    children: "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                                    lineNumber: 440,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                            lineNumber: 433,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                    lineNumber: 410,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                            lineNumber: 387,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                        lineNumber: 386,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                    lineNumber: 385,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-200 rounded-lg shadow-lg p-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                option: pieChartOption,
                                style: {
                                    height: '400px',
                                    width: '100%'
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                lineNumber: 453,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                            lineNumber: 452,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                option: barChartOption,
                                style: {
                                    height: '400px',
                                    width: '100%'
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                lineNumber: 461,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                            lineNumber: 460,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                    lineNumber: 450,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold text-gray-800 dark:text-white mb-6 text-center",
                            children: "能源消费量趋势分析"
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                            lineNumber: 470,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-96",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                option: {
                                    title: {
                                        text: '能源消费量趋势',
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
                                                result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kgce<br/>`;
                                            });
                                            return result;
                                        }
                                    },
                                    legend: {
                                        data: [
                                            '电',
                                            '柴油',
                                            '天然气'
                                        ],
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
                                        data: [
                                            '2025-06-01',
                                            '2025-06-02',
                                            '2025-06-03',
                                            '2025-06-04',
                                            '2025-06-05',
                                            '2025-06-06',
                                            '2025-06-07',
                                            '2025-06-08',
                                            '2025-06-09',
                                            '2025-06-10'
                                        ],
                                        axisLabel: {
                                            color: '#6B7280',
                                            rotate: 45
                                        }
                                    },
                                    yAxis: {
                                        type: 'value',
                                        name: '消费量(kgce)',
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
                                    series: [
                                        {
                                            name: '电',
                                            type: 'line',
                                            data: [
                                                41645,
                                                42000,
                                                41500,
                                                41000,
                                                41800,
                                                41200,
                                                40900,
                                                41400,
                                                41100,
                                                40800
                                            ],
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
                                                        {
                                                            offset: 0,
                                                            color: 'rgba(59, 130, 246, 0.3)'
                                                        },
                                                        {
                                                            offset: 1,
                                                            color: 'rgba(59, 130, 246, 0.05)'
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        {
                                            name: '柴油',
                                            type: 'line',
                                            data: [
                                                17400,
                                                17500,
                                                17300,
                                                17200,
                                                17450,
                                                17350,
                                                17250,
                                                17380,
                                                17320,
                                                17280
                                            ],
                                            smooth: true,
                                            lineStyle: {
                                                color: '#F59E0B',
                                                width: 3
                                            },
                                            itemStyle: {
                                                color: '#F59E0B'
                                            },
                                            areaStyle: {
                                                color: {
                                                    type: 'linear',
                                                    x: 0,
                                                    y: 0,
                                                    x2: 0,
                                                    y2: 1,
                                                    colorStops: [
                                                        {
                                                            offset: 0,
                                                            color: 'rgba(245, 158, 11, 0.3)'
                                                        },
                                                        {
                                                            offset: 1,
                                                            color: 'rgba(245, 158, 11, 0.05)'
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        {
                                            name: '天然气',
                                            type: 'line',
                                            data: [
                                                727,
                                                730,
                                                725,
                                                720,
                                                728,
                                                726,
                                                724,
                                                727,
                                                725,
                                                723
                                            ],
                                            smooth: true,
                                            lineStyle: {
                                                color: '#10B981',
                                                width: 3
                                            },
                                            itemStyle: {
                                                color: '#10B981'
                                            },
                                            areaStyle: {
                                                color: {
                                                    type: 'linear',
                                                    x: 0,
                                                    y: 0,
                                                    x2: 0,
                                                    y2: 1,
                                                    colorStops: [
                                                        {
                                                            offset: 0,
                                                            color: 'rgba(16, 185, 129, 0.3)'
                                                        },
                                                        {
                                                            offset: 1,
                                                            color: 'rgba(16, 185, 129, 0.05)'
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    ]
                                },
                                style: {
                                    height: '100%',
                                    width: '100%'
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                                lineNumber: 474,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                            lineNumber: 473,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
                    lineNumber: 469,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
            lineNumber: 320,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/energy/consumption-calculation/page.tsx",
        lineNumber: 319,
        columnNumber: 5
    }, this);
}
}}),

};

//# sourceMappingURL=src_app_energy_consumption-calculation_page_tsx_33267976._.js.map