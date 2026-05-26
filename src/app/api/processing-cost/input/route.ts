import { NextResponse } from 'next/server';
import { insertProcessingCost } from '@/lib/services/production-entry-service';

interface MaterialCompositionItem {
  material: string;
  warehouse?: string;
  shortName?: string;
  currentPrice?: number;
  tons: number;
}

interface ProcessingCostInputRequest {
  productName: string;
  productWarehouse: string;
  productTons: number;
  productionDate: string;
  materialComposition: MaterialCompositionItem[];
  operatorOpenid?: string;
}

/** 兼容旧路径：与云函数 insertProcessingCost 一致（含库存扣增） */
export async function POST(request: Request) {
  try {
    const body: ProcessingCostInputRequest = await request.json();

    if (!body.productName || !body.productWarehouse || !body.productTons || !body.productionDate) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填字段：productName, productWarehouse, productTons, productionDate',
        },
        { status: 400 }
      );
    }

    if (!body.materialComposition?.length) {
      return NextResponse.json(
        { success: false, error: '原材料构成不能为空' },
        { status: 400 }
      );
    }

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

    const result = await insertProcessingCost({
      productName: body.productName,
      productWarehouse: body.productWarehouse,
      productTons: body.productTons,
      productionDate: body.productionDate,
      materialComposition: body.materialComposition.map((m) => ({
        warehouse: m.warehouse || '',
        material: m.material,
        shortName: m.shortName,
        currentPrice: m.currentPrice,
        tons: m.tons,
      })),
      operatorOpenid: body.operatorOpenid || 'api:processing-cost-input',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      productStockUpdate: result.productStockUpdate,
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
