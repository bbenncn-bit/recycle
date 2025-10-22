(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/src/app/energy/prediction-management/page.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>PredictionManagement)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/echarts-for-react/esm/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function PredictionManagement() {
    _s();
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [predictionType, setPredictionType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('short');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PredictionManagement.useEffect": ()=>{
            const fetchData = {
                "PredictionManagement.useEffect.fetchData": async ()=>{
                    try {
                        setLoading(true);
                        const response = await fetch('/api/energy/prediction-management');
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
                        console.error('获取能碳预测管理数据失败:', err);
                        setError(err instanceof Error ? err.message : '未知错误');
                    } finally{
                        setLoading(false);
                    }
                }
            }["PredictionManagement.useEffect.fetchData"];
            fetchData();
        }
    }["PredictionManagement.useEffect"], [
        predictionType
    ]);
    // 模拟数据（基于图示样式）
    const mockData = {
        predictionType: 'short',
        electricityData: {
            actual: [
                {
                    period: '2025-5',
                    value: 1950000
                },
                {
                    period: '2025-6',
                    value: 1885658
                }
            ],
            predicted: [
                {
                    period: '2025-7',
                    value: 1893245
                },
                {
                    period: '2025-8',
                    value: 1956082
                },
                {
                    period: '2025-9',
                    value: 1893333
                }
            ]
        },
        photovoltaicData: {
            actual: [
                {
                    period: '2025-5',
                    value: 234000
                },
                {
                    period: '2025-6',
                    value: 213232
                }
            ],
            predicted: [
                {
                    period: '2025-7',
                    value: 192312
                },
                {
                    period: '2025-8',
                    value: 231316
                },
                {
                    period: '2025-9',
                    value: 223113
                }
            ]
        },
        naturalGasData: {
            actual: [
                {
                    period: '2025-5',
                    value: 19800
                },
                {
                    period: '2025-6',
                    value: 16342
                }
            ],
            predicted: [
                {
                    period: '2025-7',
                    value: 13121
                },
                {
                    period: '2025-8',
                    value: 18765
                },
                {
                    period: '2025-9',
                    value: 19454
                }
            ]
        }
    };
    const displayData = data || mockData;
    // 电力消耗总量图表配置
    const electricityChartOption = {
        title: {
            text: '电力消耗总量 (kWh)',
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
                    result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kWh<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: [
                '真实值',
                '预测值'
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
            data: [
                ...displayData.electricityData.actual.map((item)=>item.period),
                ...displayData.electricityData.predicted.map((item)=>item.period)
            ],
            axisLabel: {
                color: '#6B7280'
            }
        },
        yAxis: {
            type: 'value',
            name: 'kWh',
            nameTextStyle: {
                color: '#6B7280'
            },
            axisLabel: {
                color: '#6B7280',
                formatter: function(value) {
                    return (value / 1000000).toFixed(1) + 'M';
                }
            }
        },
        series: [
            {
                name: '真实值',
                type: 'line',
                data: [
                    ...displayData.electricityData.actual.map((item)=>item.value),
                    ...new Array(displayData.electricityData.predicted.length).fill(null)
                ],
                smooth: true,
                lineStyle: {
                    color: '#3B82F6',
                    width: 3
                },
                itemStyle: {
                    color: '#3B82F6'
                },
                symbol: 'circle',
                symbolSize: 6
            },
            {
                name: '预测值',
                type: 'line',
                data: [
                    ...new Array(displayData.electricityData.actual.length).fill(null),
                    ...displayData.electricityData.predicted.map((item)=>item.value)
                ],
                smooth: true,
                lineStyle: {
                    color: '#F59E0B',
                    width: 3,
                    type: 'dashed'
                },
                itemStyle: {
                    color: '#F59E0B'
                },
                symbol: 'diamond',
                symbolSize: 6
            }
        ]
    };
    // 光伏发电量图表配置
    const photovoltaicChartOption = {
        title: {
            text: '光伏发电量 (kWh)',
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
                    result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} kWh<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: [
                '真实值',
                '预测值'
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
            data: [
                ...displayData.photovoltaicData.actual.map((item)=>item.period),
                ...displayData.photovoltaicData.predicted.map((item)=>item.period)
            ],
            axisLabel: {
                color: '#6B7280'
            }
        },
        yAxis: {
            type: 'value',
            name: 'kWh',
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
                name: '真实值',
                type: 'line',
                data: [
                    ...displayData.photovoltaicData.actual.map((item)=>item.value),
                    ...new Array(displayData.photovoltaicData.predicted.length).fill(null)
                ],
                smooth: true,
                lineStyle: {
                    color: '#3B82F6',
                    width: 3
                },
                itemStyle: {
                    color: '#3B82F6'
                },
                symbol: 'circle',
                symbolSize: 6
            },
            {
                name: '预测值',
                type: 'line',
                data: [
                    ...new Array(displayData.photovoltaicData.actual.length).fill(null),
                    ...displayData.photovoltaicData.predicted.map((item)=>item.value)
                ],
                smooth: true,
                lineStyle: {
                    color: '#F59E0B',
                    width: 3,
                    type: 'dashed'
                },
                itemStyle: {
                    color: '#F59E0B'
                },
                symbol: 'diamond',
                symbolSize: 6
            }
        ]
    };
    // 天然气消耗总量图表配置
    const naturalGasChartOption = {
        title: {
            text: '天然气消耗总量 (m³)',
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
                    result += `${item.marker}${item.seriesName}: ${item.value.toLocaleString()} m³<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: [
                '真实值',
                '预测值'
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
            data: [
                ...displayData.naturalGasData.actual.map((item)=>item.period),
                ...displayData.naturalGasData.predicted.map((item)=>item.period)
            ],
            axisLabel: {
                color: '#6B7280'
            }
        },
        yAxis: {
            type: 'value',
            name: 'm³',
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
                name: '真实值',
                type: 'line',
                data: [
                    ...displayData.naturalGasData.actual.map((item)=>item.value),
                    ...new Array(displayData.naturalGasData.predicted.length).fill(null)
                ],
                smooth: true,
                lineStyle: {
                    color: '#3B82F6',
                    width: 3
                },
                itemStyle: {
                    color: '#3B82F6'
                },
                symbol: 'circle',
                symbolSize: 6
            },
            {
                name: '预测值',
                type: 'line',
                data: [
                    ...new Array(displayData.naturalGasData.actual.length).fill(null),
                    ...displayData.naturalGasData.predicted.map((item)=>item.value)
                ],
                smooth: true,
                lineStyle: {
                    color: '#F59E0B',
                    width: 3,
                    type: 'dashed'
                },
                itemStyle: {
                    color: '#F59E0B'
                },
                symbol: 'diamond',
                symbolSize: 6
            }
        ]
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                        lineNumber: 394,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 dark:text-gray-300",
                        children: "加载中..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                        lineNumber: 395,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                lineNumber: 393,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
            lineNumber: 392,
            columnNumber: 7
        }, this);
    }
    if (error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-red-500 text-xl mb-4",
                        children: "❌"
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                        lineNumber: 405,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-red-600 dark:text-red-400",
                        children: [
                            "加载失败: ",
                            error
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                        lineNumber: 406,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                lineNumber: 404,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
            lineNumber: 403,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-blue-50 dark:bg-gray-900 p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-3xl font-bold text-gray-800 dark:text-white mb-2",
                        children: "能源消耗量预测"
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                        lineNumber: 417,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                    lineNumber: 416,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center space-x-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-medium text-gray-700 dark:text-gray-300",
                                children: "能源类型:"
                            }, void 0, false, {
                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                lineNumber: 423,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex space-x-2",
                                children: [
                                    'short',
                                    'medium',
                                    'long'
                                ].map((type)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setPredictionType(type),
                                        className: `px-4 py-2 rounded-md text-sm font-medium transition-colors ${predictionType === type ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`,
                                        children: type === 'short' ? '短期' : type === 'medium' ? '中期' : '长期'
                                    }, type, false, {
                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                        lineNumber: 426,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                lineNumber: 424,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-gray-500 dark:text-gray-400",
                                children: "(短期预测为4小时、中期预测为24小时,长期预测为3个月)"
                            }, void 0, false, {
                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                lineNumber: 439,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                        lineNumber: 422,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                    lineNumber: 421,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    option: electricityChartOption,
                                    style: {
                                        height: '300px',
                                        width: '100%'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 449,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-3",
                                            children: "真实值"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 456,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "overflow-x-auto",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                className: "w-full text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        className: "bg-gray-50 dark:bg-gray-700",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "序号"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 461,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "时段"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 462,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "真实值(kWh)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 463,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                            lineNumber: 460,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 459,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                                        children: displayData.electricityData.actual.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: index + 1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 469,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.period
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 470,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.value.toLocaleString()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 471,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, index, true, {
                                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                lineNumber: 468,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 466,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                lineNumber: 458,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 457,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 455,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-3",
                                            children: "预测值"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 481,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "overflow-x-auto",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                className: "w-full text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        className: "bg-gray-50 dark:bg-gray-700",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "序号"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 486,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "时段"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 487,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "预测值(kWh)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 488,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                            lineNumber: 485,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 484,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                                        children: displayData.electricityData.predicted.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: index + 1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 494,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.period
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 495,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.value.toLocaleString()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 496,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, index, true, {
                                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                lineNumber: 493,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 491,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                lineNumber: 483,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 482,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 480,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                            lineNumber: 448,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    option: photovoltaicChartOption,
                                    style: {
                                        height: '300px',
                                        width: '100%'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 507,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-3",
                                            children: "真实值"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 514,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "overflow-x-auto",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                className: "w-full text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        className: "bg-gray-50 dark:bg-gray-700",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "序号"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 519,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "时段"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 520,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "真实值(kWh)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 521,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                            lineNumber: 518,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 517,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                                        children: displayData.photovoltaicData.actual.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: index + 1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 527,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.period
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 528,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.value.toLocaleString()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 529,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, index, true, {
                                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                lineNumber: 526,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 524,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                lineNumber: 516,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 515,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 513,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-3",
                                            children: "预测值"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 539,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "overflow-x-auto",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                className: "w-full text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        className: "bg-gray-50 dark:bg-gray-700",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "序号"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 544,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "时段"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 545,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "预测值(kWh)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 546,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                            lineNumber: 543,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 542,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                                        children: displayData.photovoltaicData.predicted.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: index + 1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 552,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.period
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 553,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.value.toLocaleString()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 554,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, index, true, {
                                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                lineNumber: 551,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 549,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                lineNumber: 541,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 540,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 538,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                            lineNumber: 506,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    option: naturalGasChartOption,
                                    style: {
                                        height: '300px',
                                        width: '100%'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 565,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-3",
                                            children: "真实值"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 572,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "overflow-x-auto",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                className: "w-full text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        className: "bg-gray-50 dark:bg-gray-700",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "序号"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 577,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "时段"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 578,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "真实值(m³)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 579,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                            lineNumber: 576,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 575,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                                        children: displayData.naturalGasData.actual.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: index + 1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 585,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.period
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 586,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.value.toLocaleString()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 587,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, index, true, {
                                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                lineNumber: 584,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 582,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                lineNumber: 574,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 573,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 571,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-3",
                                            children: "预测值"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 597,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "overflow-x-auto",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                className: "w-full text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        className: "bg-gray-50 dark:bg-gray-700",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "序号"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 602,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "时段"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 603,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                                                    children: "预测值(m³)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                    lineNumber: 604,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                            lineNumber: 601,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 600,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                                        children: displayData.naturalGasData.predicted.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: index + 1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 610,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.period
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 611,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-3 py-2 text-gray-900 dark:text-gray-100",
                                                                        children: item.value.toLocaleString()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                        lineNumber: 612,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, index, true, {
                                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                                lineNumber: 609,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                        lineNumber: 607,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                                lineNumber: 599,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                            lineNumber: 598,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                                    lineNumber: 596,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                            lineNumber: 564,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/prediction-management/page.tsx",
                    lineNumber: 446,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/energy/prediction-management/page.tsx",
            lineNumber: 414,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/energy/prediction-management/page.tsx",
        lineNumber: 413,
        columnNumber: 5
    }, this);
}
_s(PredictionManagement, "bKllbVYtM5uHmfYOE+3Q1f1lf8E=");
_c = PredictionManagement;
var _c;
__turbopack_context__.k.register(_c, "PredictionManagement");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=src_app_energy_prediction-management_page_tsx_a3526448._.js.map