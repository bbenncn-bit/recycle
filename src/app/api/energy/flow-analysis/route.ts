import { NextResponse } from "next/server";
import { EnergyFlowService } from "@/lib/services/energy-service";

export async function GET() {
  try {
    const [sankeyNodes, sankeyLinks, summaryTable] = await Promise.all([
      EnergyFlowService.getSankeyNodes(),
      EnergyFlowService.getSankeyLinks(),
      EnergyFlowService.getSummaryTable()
    ]);

    // 模拟能流分析数据（基于图示样式）
    const flowAnalysisData = {
      energyType: '电',
      timeInterval: 'day',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      spatialDimensions: [
        { id: '1', name: '欧冶链金（萍乡）再生资源有限公司', level: 1, selected: true },
        { id: '1-1', name: '1号厂区', level: 2, parentId: '1', selected: true },
        { id: '1-1-1', name: '机械加工生产线', level: 3, parentId: '1-1', selected: true },
        { id: '1-1-1-1', name: '下料', level: 4, parentId: '1-1-1', selected: true },
        { id: '1-1-1-2', name: '起重机', level: 4, parentId: '1-1-1', selected: true },
        { id: '1-1-1-3', name: '机械臂', level: 4, parentId: '1-1-1', selected: true },
        { id: '1-1-1-4', name: '粗加工', level: 4, parentId: '1-1-1', selected: true },
        { id: '1-1-1-5', name: '精加工', level: 4, parentId: '1-1-1', selected: true },
        { id: '1-1-2', name: '拆解线抓机2', level: 3, parentId: '1-1', selected: true },
        { id: '1-1-2-1', name: '拆解线抓机1', level: 4, parentId: '1-1-2', selected: true },
        { id: '1-1-2-2', name: '打包机1', level: 4, parentId: '1-1-2', selected: true },
        { id: '1-1-2-3', name: '打包机2', level: 4, parentId: '1-1-2', selected: true },
        { id: '1-1-3', name: '磅房', level: 3, parentId: '1-1', selected: true },
        { id: '1-1-3-1', name: '电梯', level: 4, parentId: '1-1-3', selected: true },
        { id: '1-1-3-2', name: '质检室', level: 4, parentId: '1-1-3', selected: true },
        { id: '1-1-3-3', name: '热处理', level: 4, parentId: '1-1-3', selected: true },
        { id: '1-1-3-4', name: '检验', level: 4, parentId: '1-1-3', selected: true },
        { id: '1-2', name: '2号厂区', level: 2, parentId: '1', selected: true },
        { id: '1-3', name: '3号厂区', level: 2, parentId: '1', selected: true },
        { id: '1-4', name: '4号厂区', level: 2, parentId: '1', selected: true },
        { id: '1-5', name: '办公楼', level: 2, parentId: '1', selected: true },
        { id: '1-5-1', name: '1层', level: 3, parentId: '1-5', selected: true },
        { id: '1-5-1-1', name: '实验室', level: 4, parentId: '1-5-1', selected: true },
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
          { id: 'final', name: '打包1', value: 30, level: 3 },
          { id: 'packaging', name: '拆解抓机1', value: 20, level: 3 },
          { id: 'painting', name: '打包2', value: 30, level: 3 },
          { id: 'oxidation', name: '拆解抓机2', value: 25, level: 3 },
          { id: 'heat', name: '热处理', value: 15, level: 3 },
          { id: 'inspection', name: '检验', value: 10, level: 3 },
          { id: 'lab', name: '电梯', value: 15, level: 3 },
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

    return NextResponse.json({
      success: true,
      data: {
        sankeyNodes: sankeyNodes,
        sankeyLinks: sankeyLinks,
        summaryTable: summaryTable,
        ...flowAnalysisData
      }
    });
  } catch (error) {
    console.error('❌ 获取能流分析数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}
