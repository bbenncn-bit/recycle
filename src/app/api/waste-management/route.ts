import { NextResponse } from "next/server";
import { prisma } from "@/lib/prismadb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    const requiredFields = ['wasteCode', 'wasteName', 'wasteCategory', 'wasteType', 'quantity', 'source', 'flowDirection', 'recordDate', 'operator'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `字段 ${field} 为必填项`
          },
          { status: 400 }
        );
      }
    }

    // 创建固废记录
    const wasteRecord = await prisma.wasteManagement.create({
      data: {
        wasteCode: body.wasteCode,
        wasteName: body.wasteName,
        wasteCategory: body.wasteCategory,
        wasteType: body.wasteType,
        quantity: body.quantity ? parseFloat(body.quantity) : null,
        unit: body.unit || '吨',
        source: body.source,
        flowDirection: body.flowDirection,
        storageLocation: body.storageLocation || null,
        storageMethod: body.storageMethod || null,
        utilizationMethod: body.utilizationMethod || null,
        disposalMethod: body.disposalMethod || null,
        disposalUnit: body.disposalUnit || null,
        disposalLocation: body.disposalLocation || null,
        recordDate: body.recordDate ? new Date(body.recordDate) : null,
        operator: body.operator,
        remark: body.remark || null,
      }
    });

    return NextResponse.json({
      success: true,
      data: wasteRecord,
      message: '固废信息录入成功'
    });
  } catch (error) {
    console.error('❌ 录入固废信息失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '录入失败，请检查数据格式'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 从数据库获取固废管理数据
    const wasteData = await prisma.wasteManagement.findMany({
      orderBy: {
        recordDate: 'desc'
      }
    });

    // 计算统计数据
    const totalQuantity = wasteData.reduce((sum, item) => {
      return sum + (item.quantity ? Number(item.quantity) : 0);
    }, 0);

    // 获取所有不重复的类别
    const categories = Array.from(new Set(
      wasteData
        .map(item => item.wasteType)
        .filter(Boolean) as string[]
    ));

    // 按类别统计数量
    const categoryQuantities = categories.map(cat => {
      return wasteData
        .filter(item => item.wasteType === cat)
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });

    // 流向分析
    const flowDirections = Array.from(new Set(
      wasteData
        .map(item => item.flowDirection)
        .filter(Boolean) as string[]
    ));
    const flowQuantities = flowDirections.map(dir => {
      return wasteData
        .filter(item => item.flowDirection === dir)
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });

    // 月度趋势（最近12个月）
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const monthlyQuantities = months.map((_, index) => {
      const month = index + 1;
      return wasteData
        .filter(item => {
          if (!item.recordDate) return false;
          const date = new Date(item.recordDate);
          return date.getMonth() + 1 === month;
        })
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });

    // 利用与处置方式
    const utilizationMethods = Array.from(new Set(
      wasteData
        .map(item => item.utilizationMethod)
        .filter(Boolean) as string[]
    )).slice(0, 5); // 取前5种
    const utilizationQuantities = utilizationMethods.map(method => {
      return wasteData
        .filter(item => item.utilizationMethod === method)
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });
    const disposalMethods = Array.from(new Set(
      wasteData
        .map(item => item.disposalMethod)
        .filter(Boolean) as string[]
    )).slice(0, 5);
    const disposalQuantities = disposalMethods.map(method => {
      return wasteData
        .filter(item => item.disposalMethod === method)
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });

    // 合并利用和处置方法
    const allMethods = Array.from(new Set([...utilizationMethods, ...disposalMethods]));
    const utilizationData = allMethods.map(method => {
      return wasteData
        .filter(item => item.utilizationMethod === method)
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });
    const disposalData = allMethods.map(method => {
      return wasteData
        .filter(item => item.disposalMethod === method)
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });

    // 贮存地点
    const storageLocations = Array.from(new Set(
      wasteData
        .map(item => item.storageLocation)
        .filter(Boolean) as string[]
    )).slice(0, 6);
    const storageQuantities = storageLocations.map(location => {
      return wasteData
        .filter(item => item.storageLocation === location)
        .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    });

    // 计算利用率和处置率
    const utilizationTotal = wasteData
      .filter(item => item.utilizationMethod)
      .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    const disposalTotal = wasteData
      .filter(item => item.disposalMethod)
      .reduce((sum, item) => sum + (item.quantity ? Number(item.quantity) : 0), 0);
    
    const utilizationRate = totalQuantity > 0 ? (utilizationTotal / totalQuantity) * 100 : 0;
    const disposalRate = totalQuantity > 0 ? (disposalTotal / totalQuantity) * 100 : 0;

    // 如果没有数据，返回模拟数据用于展示
    if (wasteData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalQuantity: 1250.5,
            totalCategories: 8,
            utilizationRate: 65.5,
            disposalRate: 34.5
          },
          categoryDistribution: {
            categories: ['废金属', '废塑料', '废纸', '废玻璃', '废橡胶', '其他'],
            quantities: [450.2, 320.5, 180.3, 150.8, 89.7, 60.0]
          },
          flowAnalysis: {
            directions: ['回收利用', '委托处置', '自行处置', '贮存待处理'],
            quantities: [820.5, 280.3, 100.2, 49.5]
          },
          monthlyTrend: {
            months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            quantities: [95, 102, 108, 115, 120, 125, 130, 128, 122, 118, 110, 105]
          },
          utilizationDisposal: {
            methods: ['再生利用', '焚烧发电', '填埋处置', '资源化利用', '其他'],
            utilization: [450, 280, 0, 200, 0],
            disposal: [0, 0, 180, 0, 100]
          },
          storageStatus: {
            locations: ['1号仓库', '2号仓库', '临时堆放区', '危险废物暂存区', '其他'],
            quantities: [320, 280, 150, 89, 60]
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalQuantity,
          totalCategories: categories.length,
          utilizationRate,
          disposalRate
        },
        categoryDistribution: {
          categories: categories.length > 0 ? categories : ['暂无数据'],
          quantities: categoryQuantities.length > 0 ? categoryQuantities : [0]
        },
        flowAnalysis: {
          directions: flowDirections.length > 0 ? flowDirections : ['暂无数据'],
          quantities: flowQuantities.length > 0 ? flowQuantities : [0]
        },
        monthlyTrend: {
          months,
          quantities: monthlyQuantities
        },
        utilizationDisposal: {
          methods: allMethods.length > 0 ? allMethods : ['暂无数据'],
          utilization: utilizationData.length > 0 ? utilizationData : [0],
          disposal: disposalData.length > 0 ? disposalData : [0]
        },
        storageStatus: {
          locations: storageLocations.length > 0 ? storageLocations : ['暂无数据'],
          quantities: storageQuantities.length > 0 ? storageQuantities : [0]
        }
      }
    });
  } catch (error) {
    console.error('❌ 获取固废管理数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取数据失败' 
      },
      { status: 500 }
    );
  }
}

