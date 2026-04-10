import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismadb';

/**
 * 处理数值：将 Decimal 转换为 number
 */
function processDecimal(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value && typeof value.toString === 'function') {
    return parseFloat(value.toString()) || 0;
  }
  return 0;
}

export async function GET(request: Request) {
  try {
    const configs = await prisma.processingCostConfig.findMany({
      orderBy: {
        productName: 'asc',
      },
      select: {
        productName: true,
        unitProcessingCost: true,
        configMonth: true,
      },
    });

    const result = configs.map(config => ({
      productName: config.productName,
      unitProcessingCost: processDecimal(config.unitProcessingCost),
      configMonth: config.configMonth,
    }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('查询加工成本配置失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询加工成本配置失败',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.productName || body.unitProcessingCost === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填字段：productName, unitProcessingCost',
        },
        { status: 400 }
      );
    }

    const unitCost = typeof body.unitProcessingCost === 'number' 
      ? body.unitProcessingCost 
      : parseFloat(String(body.unitProcessingCost));

    if (isNaN(unitCost) || unitCost < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'unitProcessingCost 必须是有效的非负数',
        },
        { status: 400 }
      );
    }

    // 获取当前月份
    const now = new Date();
    const configMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 使用 upsert 更新或创建配置
    const result = await prisma.processingCostConfig.upsert({
      where: {
        productName: body.productName,
      },
      update: {
        unitProcessingCost: unitCost,
        configMonth: configMonth,
      },
      create: {
        productName: body.productName,
        unitProcessingCost: unitCost,
        configMonth: configMonth,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        productName: result.productName,
        unitProcessingCost: processDecimal(result.unitProcessingCost),
        configMonth: result.configMonth,
      },
    });
  } catch (error) {
    console.error('保存加工成本配置失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '保存加工成本配置失败',
      },
      { status: 500 }
    );
  }
}
