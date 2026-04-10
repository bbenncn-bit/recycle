import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismadb';

interface MaterialCompositionItem {
  material: string;
  tons: number;
}

interface ProcessingCostInputRequest {
  productName: string;
  productWarehouse: string;
  productTons: number;
  productionDate: string;
  materialComposition: MaterialCompositionItem[];
}

export async function POST(request: Request) {
  try {
    const body: ProcessingCostInputRequest = await request.json();

    // 验证必填字段
    if (!body.productName || !body.productWarehouse || !body.productTons || !body.productionDate) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填字段：productName, productWarehouse, productTons, productionDate',
        },
        { status: 400 }
      );
    }

    // 验证原材料构成
    if (!body.materialComposition || !Array.isArray(body.materialComposition) || body.materialComposition.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '原材料构成不能为空',
        },
        { status: 400 }
      );
    }

    // 验证原材料总重量 >= 成品重量
    const totalMaterialTons = body.materialComposition.reduce((sum, item) => {
      const tons = typeof item.tons === 'number' ? item.tons : parseFloat(String(item.tons)) || 0;
      return sum + tons;
    }, 0);

    if (totalMaterialTons < body.productTons) {
      return NextResponse.json(
        {
          success: false,
          error: `原材料总重量（${totalMaterialTons}吨）必须大于等于成品重量（${body.productTons}吨）`,
        },
        { status: 400 }
      );
    }

    // 验证每个原材料项
    for (const item of body.materialComposition) {
      if (!item.material || !item.tons || item.tons <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: '原材料构成中每个项必须包含有效的material和tons（>0）',
          },
          { status: 400 }
        );
      }
    }

    // 保存到数据库
    const result = await prisma.processingCostInput.create({
      data: {
        productName: body.productName,
        productWarehouse: body.productWarehouse,
        productTons: body.productTons,
        productionDate: body.productionDate,
        materialComposition: body.materialComposition as any,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('保存生产情况数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '保存生产情况数据失败',
      },
      { status: 500 }
    );
  }
}
