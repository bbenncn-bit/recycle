import { prisma } from '../prismadb';

// 能耗查询相关服务
export class EnergyConsumptionService {
  // 获取能耗趋势数据
  static async getConsumptionTrend() {
    try {
      const data = await prisma.eAConsumptionTrend.findMany({
        orderBy: {
          date: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取能耗趋势数据失败:', error);
      throw error;
    }
  }

  // 获取月度汇总数据
  static async getMonthSummary() {
    try {
      const data = await prisma.eAMonthSummary.findMany({
        orderBy: {
          month: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取月度汇总数据失败:', error);
      throw error;
    }
  }

  // 获取能源类型对比数据
  static async getTypeComparison() {
    try {
      const data = await prisma.eATypeComparison.findMany({
        orderBy: {
          month: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取能源类型对比数据失败:', error);
      throw error;
    }
  }
}

// 能源消费量计算相关服务
export class EnergyCalculationService {
  // 获取预算对比图表数据
  static async getBudgetComparison() {
    try {
      const data = await prisma.cBComparisonChart.findMany({
        orderBy: {
          month: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取预算对比数据失败:', error);
      throw error;
    }
  }

  // 获取月度详情数据
  static async getMonthlyDetails() {
    try {
      const data = await prisma.cBMonthlyDetails.findMany({
        orderBy: {
          month: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取月度详情数据失败:', error);
      throw error;
    }
  }

  // 获取汇总卡片数据
  static async getSummaryCards() {
    try {
      const data = await prisma.cBSummaryCards.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取汇总卡片数据失败:', error);
      throw error;
    }
  }
}

// 能源分析与策略相关服务
export class EnergyAnalysisService {
  // 获取策略数据
  static async getStrategies() {
    try {
      const data = await prisma.eAStrategy.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取策略数据失败:', error);
      throw error;
    }
  }
}

// 能效对标相关服务
export class EnergyEfficiencyService {
  // 获取基准排名卡片数据
  static async getBenchmarkRankCards() {
    try {
      const data = await prisma.eEBenchmarkRankCards.findMany({
        orderBy: {
          rank: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取基准排名卡片数据失败:', error);
      throw error;
    }
  }

  // 获取仪表盘指标数据
  static async getGaugeMetrics() {
    try {
      const data = await prisma.eEGaugeMetrics.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取仪表盘指标数据失败:', error);
      throw error;
    }
  }

  // 获取排名列表数据
  static async getRankingList() {
    try {
      const data = await prisma.eERankingList.findMany({
        orderBy: {
          rank: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取排名列表数据失败:', error);
      throw error;
    }
  }

  // 获取趋势图表数据
  static async getTrendChartData() {
    try {
      const data = await prisma.eETrendChartData.findMany({
        orderBy: {
          month: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取趋势图表数据失败:', error);
      throw error;
    }
  }
}

// 能流分析相关服务
export class EnergyFlowService {
  // 获取桑基图节点数据
  static async getSankeyNodes() {
    try {
      const data = await prisma.eFSankeyNodes.findMany({
        orderBy: {
          node: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取桑基图节点数据失败:', error);
      throw error;
    }
  }

  // 获取桑基图链接数据
  static async getSankeyLinks() {
    try {
      const data = await prisma.eFSankeyLinks.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取桑基图链接数据失败:', error);
      throw error;
    }
  }

  // 获取汇总表数据
  static async getSummaryTable() {
    try {
      const data = await prisma.eFSummaryTable.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取汇总表数据失败:', error);
      throw error;
    }
  }
}

// 能效平衡与优化相关服务
export class EnergyBalanceService {
  // 获取参数卡片数据
  static async getParamCards() {
    try {
      const data = await prisma.eBParamCards.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取参数卡片数据失败:', error);
      throw error;
    }
  }

  // 获取饼图数据
  static async getPieChart() {
    try {
      const data = await prisma.eBPieChart.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取饼图数据失败:', error);
      throw error;
    }
  }

  // 获取结果数据
  static async getResults() {
    try {
      const data = await prisma.eBResults.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取结果数据失败:', error);
      throw error;
    }
  }

  // 获取趋势图表数据
  static async getTrendChart() {
    try {
      const data = await prisma.eBTrendChart.findMany({
        orderBy: {
          time: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取趋势图表数据失败:', error);
      throw error;
    }
  }
}

// 碳排放核算相关服务
export class CarbonAccountingService {
  // 获取碳排放详情数据
  static async getCarbonDetails() {
    try {
      const data = await prisma.cFDetails.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取碳排放详情数据失败:', error);
      throw error;
    }
  }

  // 获取碳排放饼图数据
  static async getCarbonPieChart() {
    try {
      const data = await prisma.cFPieChart.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取碳排放饼图数据失败:', error);
      throw error;
    }
  }

  // 获取碳排放趋势图表数据
  static async getCarbonTrendChart() {
    try {
      const data = await prisma.cFTrendChart.findMany({
        orderBy: {
          month: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取碳排放趋势图表数据失败:', error);
      throw error;
    }
  }
}

// 碳资产管理相关服务
export class CarbonAssetService {
  // 获取碳资产持仓数据
  static async getHoldings() {
    try {
      const data = await prisma.cAHoldings.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取碳资产持仓数据失败:', error);
      throw error;
    }
  }

  // 获取市场卡片数据
  static async getMarketCards() {
    try {
      const data = await prisma.cAMarketCards.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取市场卡片数据失败:', error);
      throw error;
    }
  }

  // 获取价格图表数据
  static async getPriceChart() {
    try {
      const data = await prisma.cAPriceChart.findMany({
        orderBy: {
          date: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取价格图表数据失败:', error);
      throw error;
    }
  }
}

// 供应链碳管理相关服务
export class SupplyChainService {
  // 获取供应商排名数据
  static async getSupplierRanking() {
    try {
      const data = await prisma.sCRanking.findMany({
        orderBy: {
          rank: 'asc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取供应商排名数据失败:', error);
      throw error;
    }
  }

  // 获取供应链桑基图数据
  static async getSupplyChainSankey() {
    try {
      const data = await prisma.sCSankeyData.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取供应链桑基图数据失败:', error);
      throw error;
    }
  }
}

// 实时能源监控相关服务
export class RealTimeEnergyService {
  // 获取能源类型数据
  static async getEnergyTypes() {
    try {
      const data = await prisma.eCenergyTypes.findMany();
      return data;
    } catch (error) {
      console.error('❌ 获取能源类型数据失败:', error);
      throw error;
    }
  }

  // 获取实时数据
  static async getRealTimeData() {
    try {
      const data = await prisma.eCrealTime.findMany({
        orderBy: {
          timestamp: 'desc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取实时数据失败:', error);
      throw error;
    }
  }

  // 获取历史数据
  static async getHistoryData() {
    try {
      const data = await prisma.eChistory.findMany({
        orderBy: {
          date_time: 'desc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取历史数据失败:', error);
      throw error;
    }
  }

  // 获取实时能流数据
  static async getEnergyFlowRealTime() {
    try {
      const data = await prisma.eCenergyFlowRealTime.findMany({
        orderBy: {
          timestamp: 'desc'
        }
      });
      return data;
    } catch (error) {
      console.error('❌ 获取实时能流数据失败:', error);
      throw error;
    }
  }
}
