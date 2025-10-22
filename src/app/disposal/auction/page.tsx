import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// 简化的图标组件，不依赖 lucide-react
const Heart = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

export default function Component() {
  const biddingHistory = [
    { status: "领先", bidder: "134246", price: "1780.00" },
    { status: "出局", bidder: "134248", price: "1770.00" },
    { status: "出局", bidder: "134246", price: "1760.00" },
    { status: "出局", bidder: "134248", price: "1750.00" },
    { status: "出局", bidder: "134246", price: "1740.00" },
    { status: "出局", bidder: "134247", price: "1730.00" },
    { status: "出局", bidder: "134248", price: "1720.00" },
    { status: "出局", bidder: "134247", price: "1710.00" },
  ]

  const processSteps = [
    { step: "01", title: "阅读公告", icon: "📋" },
    { step: "02", title: "实地看货", icon: "👁️" },
    { step: "03", title: "报名交保证金", icon: "🛡️" },
    { step: "04", title: "出价竞拍", icon: "🔨" },
    { step: "05", title: "竞拍成功", icon: "✅" },
    { step: "06", title: "线下提货", icon: "🛒" },
  ]

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900">
      {/* Header */}
      {/* <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
        <div className="text-sm text-gray-600">手机参与更方便</div>
      </div> */}

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Image */}
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-blue-200/50 dark:border-gray-600/50 shadow-xl">
              <CardContent className="p-0">
                <div className="relative pt-4">
                  <Image
                    src="/images/ceramic-vessels.png"
                    alt="Ceramic vessels"
                    width={400}
                    height={300}
                    className="w-full h-80 object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex gap-2 mb-4">
                    <Image
                      src="/images/ceramic-vessels.png"
                      alt="Thumbnail"
                      width={60}
                      height={60}
                      className="w-15 h-15 object-cover rounded border-2 border-blue-400"
                    />
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <button className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      已拍卖品收藏
                    </button>
                    <button className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      加入收藏
                    </button>
                    <div className="flex items-center gap-1 ml-auto">
                      <Eye className="w-4 h-4" />
                      441次浏览
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Auction Details */}
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-blue-200/50 dark:border-gray-600/50 shadow-xl">
              <CardContent className="p-0 pt-4">
                <div className="bg-gradient-to-r from-blue-400 to-blue-400 dark:from-blue-400 dark:to-blue-400 text-white p-4 pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      竞拍
                    </Badge>
                    <span className="font-medium">废钢-2038</span>
                  </div>
                  <div className="text-center py-4">
                    <div className="text-2xl font-bold">正在进行</div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-gray-600 dark:text-gray-300">当前价格:</span>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-blue-400 dark:text-blue-400">1780元/吨</span>
                      <Button className="bg-blue-500 hover:bg-blue-600 text-white">正在进行</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">起拍价:</span>
                        <span className="text-gray-800 dark:text-gray-200">1600元/吨</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">保证金:</span>
                        <span className="text-gray-800 dark:text-gray-200">50000元</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">加价幅度:</span>
                        <span className="text-gray-800 dark:text-gray-200">10元</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">预计重量:</span>
                        <span className="text-gray-800 dark:text-gray-200">370 吨</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">自由竞价:</span>
                        <span className="text-gray-800 dark:text-gray-200">5分钟</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">保留价:</span>
                        <span className="text-gray-800 dark:text-gray-200">有</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">竞价模式:</span>
                      <span className="text-gray-800 dark:text-gray-200">竞价(?)</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600 dark:text-gray-300">限时竞价:</span>
                      <span className="text-gray-800 dark:text-gray-200">5分钟</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600 dark:text-gray-300">所在地区:</span>
                      <span className="text-gray-800 dark:text-gray-200">黑龙江省 哈尔滨市</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Bidding History */}
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-blue-200/50 dark:border-gray-600/50 shadow-xl">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4 pt-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">出价记录</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>共18次</span>
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-500">
                      全部 →
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-600">
                    <span>出价状态</span>
                    <span>编号</span>
                    <span>价格</span>
                    <span></span>
                  </div>

                  {biddingHistory.map((bid, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 text-sm py-1">
                      <span className={bid.status === "领先" ? "text-blue-400 dark:text-blue-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
                        {bid.status}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">{bid.bidder}</span>
                      <span className={bid.status === "领先" ? "text-blue-400 dark:text-blue-400 font-medium" : "text-gray-600 dark:text-gray-300"}>
                        {bid.price}元
                      </span>
                      <span></span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Process Steps */}
        <div className="mt-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300">竞拍流程</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center">
                {/* <div className="w-16 h-16 bg-gradient-to-r bg-blue-200 dark:from-blue-600 dark:to-blue-700 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-2 shadow-lg">
                  {step.icon}
                </div> */}
                <div className="text-blue-400 dark:text-blue-400 font-bold text-lg mb-1">{step.step}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{step.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
