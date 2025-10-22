module.exports = {

"[project]/src/app/energy/flow-analysis/page.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>FlowAnalysis)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/echarts-for-react/esm/index.js [app-ssr] (ecmascript)");
'use client';
;
;
;
function FlowAnalysis() {
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [energyType, setEnergyType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('电');
    const [timeInterval, setTimeInterval] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('day');
    const [startDate, setStartDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('2025-01-01');
    const [endDate, setEndDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('2025-01-31');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const fetchData = async ()=>{
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
            } finally{
                setLoading(false);
            }
        };
        fetchData();
    }, [
        energyType,
        timeInterval,
        startDate,
        endDate
    ]);
    // 模拟数据（基于图示样式）
    const mockData = {
        energyType: '电',
        timeInterval: 'day',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        spatialDimensions: [
            {
                id: '1',
                name: '欧冶链金（萍乡）再生资源有限公司',
                level: 1,
                selected: true
            },
            {
                id: '1-1',
                name: '1号厂区',
                level: 2,
                parentId: '1',
                selected: true
            },
            {
                id: '1-1-1',
                name: '机械加工生产线',
                level: 3,
                parentId: '1-1',
                selected: true
            },
            {
                id: '1-1-1-1',
                name: '下料',
                level: 4,
                parentId: '1-1-1',
                selected: true
            },
            {
                id: '1-1-1-2',
                name: '航车',
                level: 4,
                parentId: '1-1-1',
                selected: true
            },
            {
                id: '1-1-1-3',
                name: '机械臂',
                level: 4,
                parentId: '1-1-1',
                selected: true
            },
            {
                id: '1-1-1-4',
                name: '粗加工',
                level: 4,
                parentId: '1-1-1',
                selected: true
            },
            {
                id: '1-1-1-5',
                name: '精加工',
                level: 4,
                parentId: '1-1-1',
                selected: true
            },
            {
                id: '1-1-2',
                name: '打包机2',
                level: 3,
                parentId: '1-1',
                selected: true
            },
            {
                id: '1-1-2-1',
                name: '打包机1',
                level: 4,
                parentId: '1-1-2',
                selected: true
            },
            {
                id: '1-1-2-2',
                name: '总装配',
                level: 4,
                parentId: '1-1-2',
                selected: true
            },
            {
                id: '1-1-2-3',
                name: '拆解抓机2',
                level: 4,
                parentId: '1-1-2',
                selected: true
            },
            {
                id: '1-1-3',
                name: '磅房',
                level: 3,
                parentId: '1-1',
                selected: true
            },
            {
                id: '1-1-3-1',
                name: '拆解抓机1',
                level: 4,
                parentId: '1-1-3',
                selected: true
            },
            {
                id: '1-1-3-2',
                name: '氧化',
                level: 4,
                parentId: '1-1-3',
                selected: true
            },
            {
                id: '1-1-3-3',
                name: '热处理',
                level: 4,
                parentId: '1-1-3',
                selected: true
            },
            {
                id: '1-1-3-4',
                name: '检验',
                level: 4,
                parentId: '1-1-3',
                selected: true
            },
            {
                id: '1-2',
                name: '2号厂区',
                level: 2,
                parentId: '1',
                selected: true
            },
            {
                id: '1-3',
                name: '3号厂区',
                level: 2,
                parentId: '1',
                selected: true
            },
            {
                id: '1-4',
                name: '4号厂区',
                level: 2,
                parentId: '1',
                selected: true
            },
            {
                id: '1-5',
                name: '办公楼',
                level: 2,
                parentId: '1',
                selected: true
            },
            {
                id: '1-5-1',
                name: '1层',
                level: 3,
                parentId: '1-5',
                selected: true
            },
            {
                id: '1-5-1-1',
                name: '电梯',
                level: 4,
                parentId: '1-5-1',
                selected: true
            },
            {
                id: '1-5-1-2',
                name: '会议室',
                level: 4,
                parentId: '1-5-1',
                selected: true
            },
            {
                id: '1-5-1-3',
                name: '办公室',
                level: 4,
                parentId: '1-5-1',
                selected: true
            },
            {
                id: '1-5-2',
                name: '2层',
                level: 3,
                parentId: '1-5',
                selected: true
            },
            {
                id: '1-5-3',
                name: '3层',
                level: 3,
                parentId: '1-5',
                selected: true
            },
            {
                id: '1-5-4',
                name: '4层',
                level: 3,
                parentId: '1-5',
                selected: true
            },
            {
                id: '1-6',
                name: '食堂',
                level: 2,
                parentId: '1',
                selected: true
            },
            {
                id: '1-7',
                name: '配电房',
                level: 2,
                parentId: '1',
                selected: true
            }
        ],
        balanceTable: [
            {
                id: 1,
                level1: '一层级',
                level2: '二层级',
                balanceDiff: 200,
                imbalanceRate: 15
            },
            {
                id: 2,
                level1: '二层级',
                level2: '三层级',
                balanceDiff: 20,
                imbalanceRate: 2
            },
            {
                id: 3,
                level1: '三层级',
                level2: '四层级',
                balanceDiff: 0,
                imbalanceRate: 0
            },
            {
                id: 4,
                level1: '四层级',
                level2: '五层级',
                balanceDiff: 43,
                imbalanceRate: 5
            },
            {
                id: 5,
                level1: '五层级',
                level2: '末级层级',
                balanceDiff: 21,
                imbalanceRate: 3
            }
        ],
        sankeyData: {
            nodes: [
                {
                    id: 'company',
                    name: '欧冶链金（萍乡）再生资源有限公司',
                    value: 1000,
                    level: 0
                },
                {
                    id: 'factory1',
                    name: '1号厂区',
                    value: 400,
                    level: 1
                },
                {
                    id: 'factory2',
                    name: '2号厂区',
                    value: 200,
                    level: 1
                },
                {
                    id: 'factory3',
                    name: '3号厂区',
                    value: 150,
                    level: 1
                },
                {
                    id: 'factory4',
                    name: '4号厂区',
                    value: 100,
                    level: 1
                },
                {
                    id: 'office',
                    name: '办公楼',
                    value: 80,
                    level: 1
                },
                {
                    id: 'canteen',
                    name: '食堂',
                    value: 50,
                    level: 1
                },
                {
                    id: 'power',
                    name: '配电房',
                    value: 20,
                    level: 1
                },
                {
                    id: 'machining',
                    name: '机械加工生产线',
                    value: 200,
                    level: 2
                },
                {
                    id: 'assembly',
                    name: '装配生产线',
                    value: 120,
                    level: 2
                },
                {
                    id: 'surface',
                    name: '表面处理生产线',
                    value: 80,
                    level: 2
                },
                {
                    id: 'floor1',
                    name: '1层',
                    value: 40,
                    level: 2
                },
                {
                    id: 'floor2',
                    name: '2层',
                    value: 20,
                    level: 2
                },
                {
                    id: 'floor3',
                    name: '3层',
                    value: 15,
                    level: 2
                },
                {
                    id: 'floor4',
                    name: '4层',
                    value: 5,
                    level: 2
                },
                {
                    id: 'blanking',
                    name: '下料',
                    value: 50,
                    level: 3
                },
                {
                    id: 'crane',
                    name: '起重机',
                    value: 30,
                    level: 3
                },
                {
                    id: 'robot',
                    name: '机械臂',
                    value: 40,
                    level: 3
                },
                {
                    id: 'rough',
                    name: '粗加工',
                    value: 60,
                    level: 3
                },
                {
                    id: 'fine',
                    name: '精加工',
                    value: 20,
                    level: 3
                },
                {
                    id: 'component',
                    name: '零部件装配',
                    value: 70,
                    level: 3
                },
                {
                    id: 'final',
                    name: '总装配',
                    value: 30,
                    level: 3
                },
                {
                    id: 'packaging',
                    name: '包装与标识',
                    value: 20,
                    level: 3
                },
                {
                    id: 'painting',
                    name: '喷漆',
                    value: 30,
                    level: 3
                },
                {
                    id: 'oxidation',
                    name: '氧化',
                    value: 25,
                    level: 3
                },
                {
                    id: 'heat',
                    name: '热处理',
                    value: 15,
                    level: 3
                },
                {
                    id: 'inspection',
                    name: '检验',
                    value: 10,
                    level: 3
                },
                {
                    id: 'lab',
                    name: '实验室',
                    value: 15,
                    level: 3
                },
                {
                    id: 'meeting',
                    name: '会议室',
                    value: 10,
                    level: 3
                },
                {
                    id: 'office_room',
                    name: '办公室',
                    value: 15,
                    level: 3
                }
            ],
            links: [
                {
                    source: 'company',
                    target: 'factory1',
                    value: 400,
                    type: 'main'
                },
                {
                    source: 'company',
                    target: 'factory2',
                    value: 200,
                    type: 'main'
                },
                {
                    source: 'company',
                    target: 'factory3',
                    value: 150,
                    type: 'main'
                },
                {
                    source: 'company',
                    target: 'factory4',
                    value: 100,
                    type: 'main'
                },
                {
                    source: 'company',
                    target: 'office',
                    value: 80,
                    type: 'main'
                },
                {
                    source: 'company',
                    target: 'canteen',
                    value: 50,
                    type: 'main'
                },
                {
                    source: 'company',
                    target: 'power',
                    value: 20,
                    type: 'main'
                },
                {
                    source: 'factory1',
                    target: 'machining',
                    value: 200,
                    type: 'production'
                },
                {
                    source: 'factory1',
                    target: 'assembly',
                    value: 120,
                    type: 'production'
                },
                {
                    source: 'factory1',
                    target: 'surface',
                    value: 80,
                    type: 'production'
                },
                {
                    source: 'office',
                    target: 'floor1',
                    value: 40,
                    type: 'floor'
                },
                {
                    source: 'office',
                    target: 'floor2',
                    value: 20,
                    type: 'floor'
                },
                {
                    source: 'office',
                    target: 'floor3',
                    value: 15,
                    type: 'floor'
                },
                {
                    source: 'office',
                    target: 'floor4',
                    value: 5,
                    type: 'floor'
                },
                {
                    source: 'machining',
                    target: 'blanking',
                    value: 50,
                    type: 'process'
                },
                {
                    source: 'machining',
                    target: 'crane',
                    value: 30,
                    type: 'process'
                },
                {
                    source: 'machining',
                    target: 'robot',
                    value: 40,
                    type: 'process'
                },
                {
                    source: 'machining',
                    target: 'rough',
                    value: 60,
                    type: 'process'
                },
                {
                    source: 'machining',
                    target: 'fine',
                    value: 20,
                    type: 'process'
                },
                {
                    source: 'assembly',
                    target: 'component',
                    value: 70,
                    type: 'process'
                },
                {
                    source: 'assembly',
                    target: 'final',
                    value: 30,
                    type: 'process'
                },
                {
                    source: 'assembly',
                    target: 'packaging',
                    value: 20,
                    type: 'process'
                },
                {
                    source: 'surface',
                    target: 'painting',
                    value: 30,
                    type: 'process'
                },
                {
                    source: 'surface',
                    target: 'oxidation',
                    value: 25,
                    type: 'process'
                },
                {
                    source: 'surface',
                    target: 'heat',
                    value: 15,
                    type: 'process'
                },
                {
                    source: 'surface',
                    target: 'inspection',
                    value: 10,
                    type: 'process'
                },
                {
                    source: 'floor1',
                    target: 'lab',
                    value: 15,
                    type: 'room'
                },
                {
                    source: 'floor1',
                    target: 'meeting',
                    value: 10,
                    type: 'room'
                },
                {
                    source: 'floor1',
                    target: 'office_room',
                    value: 15,
                    type: 'room'
                }
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
            formatter: function(params) {
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
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                        lineNumber: 242,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 dark:text-gray-300",
                        children: "加载中..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                        lineNumber: 243,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                lineNumber: 241,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
            lineNumber: 240,
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
                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                        lineNumber: 253,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-red-600 dark:text-red-400",
                        children: [
                            "加载失败: ",
                            error
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                        lineNumber: 254,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                lineNumber: 252,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
            lineNumber: 251,
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
                            children: "能流分析"
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                            lineNumber: 265,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-600 dark:text-gray-300",
                            children: "能源流向分析与可视化"
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                            lineNumber: 266,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                    lineNumber: 264,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-4 gap-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "lg:col-span-1",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-lg font-semibold text-gray-800 dark:text-white mb-4",
                                        children: "空间维度"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                        lineNumber: 273,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-2",
                                        children: displayData.spatialDimensions.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `flex items-center space-x-2 ${item.level > 1 ? 'ml-4' : ''}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        checked: item.selected,
                                                        className: "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 277,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "text-sm text-gray-700 dark:text-gray-300",
                                                        children: item.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 282,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, item.id, true, {
                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                lineNumber: 276,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                        lineNumber: 274,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                lineNumber: 272,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                            lineNumber: 271,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "lg:col-span-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-center gap-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
                                                        children: "能源类型"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 298,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex space-x-4",
                                                        children: [
                                                            '电',
                                                            '水',
                                                            '煤',
                                                            '柴油',
                                                            '汽油',
                                                            '天然气',
                                                            '液化石油气',
                                                            '热'
                                                        ].map((type)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "flex items-center space-x-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "radio",
                                                                        name: "energyType",
                                                                        value: type,
                                                                        checked: energyType === type,
                                                                        onChange: (e)=>setEnergyType(e.target.value),
                                                                        className: "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                        lineNumber: 304,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-sm text-gray-700 dark:text-gray-300",
                                                                        children: type
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                        lineNumber: 312,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, type, true, {
                                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                lineNumber: 303,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 301,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                lineNumber: 297,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
                                                        children: "时间间隔"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 320,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex space-x-2",
                                                        children: [
                                                            'day',
                                                            'month',
                                                            'year'
                                                        ].map((interval)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>setTimeInterval(interval),
                                                                className: `px-3 py-2 rounded-md text-sm font-medium transition-colors ${timeInterval === interval ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`,
                                                                children: interval === 'day' ? '日' : interval === 'month' ? '月' : '年'
                                                            }, interval, false, {
                                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                lineNumber: 325,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 323,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                lineNumber: 319,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
                                                        children: "时间段"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 342,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center space-x-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "date",
                                                                value: startDate,
                                                                onChange: (e)=>setStartDate(e.target.value),
                                                                className: "px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                lineNumber: 346,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-gray-500",
                                                                children: "至"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                lineNumber: 352,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "date",
                                                                value: endDate,
                                                                onChange: (e)=>setEndDate(e.target.value),
                                                                className: "px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                lineNumber: 353,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 345,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                lineNumber: 341,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                        lineNumber: 295,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                    lineNumber: 294,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$echarts$2d$for$2d$react$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        option: sankeyChartOption,
                                        style: {
                                            height: '600px',
                                            width: '100%'
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                        lineNumber: 367,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                    lineNumber: 366,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-lg font-semibold text-gray-800 dark:text-white mb-4",
                                            children: "层级间平衡差额"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                            lineNumber: 375,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                                    children: "层级对比"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                    lineNumber: 380,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                                    children: "层级间平衡差额 (kWh)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                    lineNumber: 383,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                                                    children: "不平衡率 (%)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                    lineNumber: 386,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                            lineNumber: 379,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 378,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700",
                                                        children: displayData.balanceTable.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "hover:bg-gray-50 dark:hover:bg-gray-700",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                                        children: [
                                                                            item.level1,
                                                                            "与",
                                                                            item.level2
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                        lineNumber: 394,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                                        children: item.balanceDiff > 0 ? item.balanceDiff : '-'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                        lineNumber: 397,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                                                        children: item.imbalanceRate > 0 ? `${item.imbalanceRate}%` : '-'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                        lineNumber: 400,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, item.id, true, {
                                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                                lineNumber: 393,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                        lineNumber: 391,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                                lineNumber: 377,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                            lineNumber: 376,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                                    lineNumber: 374,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                            lineNumber: 292,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
                    lineNumber: 269,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
            lineNumber: 262,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/energy/flow-analysis/page.tsx",
        lineNumber: 261,
        columnNumber: 5
    }, this);
}
}}),

};

//# sourceMappingURL=src_app_energy_flow-analysis_page_tsx_e56f2059._.js.map