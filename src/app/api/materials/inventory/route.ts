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
    const { searchParams } = new URL(request.url);
    const material = searchParams.get('material');

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少参数：material',
        },
        { status: 400 }
      );
    }

    // 查询采购入库总量
    const purchases = await prisma.purchaseWarehouse.findMany({
      where: {
        material: material,
        estimatedDryBasis: {
          not: null,
        },
      },
      select: {
        estimatedDryBasis: true,
      },
    });

    const totalPurchased = purchases.reduce((sum, p) => sum + processDecimal(p.estimatedDryBasis), 0);

    // 查询已使用总量（从生产情况录入表中汇总）
    // 注意：Prisma 的 JSON 字段不能直接使用 not: null，需要查询所有记录后过滤
    const productionRecords = await prisma.processingCostInput.findMany({
      select: {
        materialComposition: true,
      },
    });

    let totalUsed = 0;
    for (const record of productionRecords) {
      // 过滤掉 materialComposition 为 null 的记录
      if (!record.materialComposition) continue;
      const composition = record.materialComposition as Array<{ material: string; tons: number }> | null;
      if (!composition || !Array.isArray(composition)) continue;

      for (const item of composition) {
        if (item.material === material) {
          const tons = typeof item.tons === 'number' ? item.tons : parseFloat(String(item.tons)) || 0;
          totalUsed += tons;
        }
      }
    }

    const inventory = totalPurchased - totalUsed;

    return NextResponse.json({
      success: true,
      data: {
        material,
        totalPurchased,
        totalUsed,
        inventory: Math.max(0, inventory), // 库存不能为负数
      },
    });
  } catch (error) {
    console.error('查询原材料库存失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询原材料库存失败',
      },
      { status: 500 }
    );
  }
}
