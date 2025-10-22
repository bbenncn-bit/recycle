'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

// 搜索图标组件
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// 位置图标组件
const LocationIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// 时间图标组件
const TimeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ScrapSteel() {
  const [activeTab, setActiveTab] = useState('scrap-steel');
  const [searchQuery, setSearchQuery] = useState('');

  // 废钢铁采购数据
  const scrapSteelItems = [
    {
      id: 1,
      name: "马蹄铁",
      image: "/images/1.jpg",
      price: "¥2,340/吨",
      quantity: "数量不限",
      company: "欧冶链金物宝(安...",
      location: "安徽省·马鞍山市",
      category: "废钢铁"
    },
    {
      id: 2,
      name: "生铁毛料",
      image: "/images/2.jpg",
      price: "¥1,980/吨",
      quantity: "数量不限",
      company: "欧冶链金(萍乡)再...",
      location: "江西省·萍乡市",
      category: "废钢铁"
    },
    {
      id: 3,
      name: "钢筋毛料",
      image: "/images/3.jpg",
      price: "¥2,330/吨",
      quantity: "数量不限",
      company: "马钢智信资源科技...",
      location: "山东省·临沂市",
      category: "废钢铁"
    },
    {
      id: 4,
      name: "板材余料一",
      image: "/images/4.jpg",
      price: "¥2,420/吨",
      quantity: "数量不限",
      company: "辽宁吉和源再生资...",
      location: "辽宁省·本溪市",
      category: "废钢铁"
    }
  ];

  // 报废机动车采购数据
  const vehicleItems = [
    {
      id: 1,
      name: "报废车辆",
      image: "/images/11.jpg",
      price: "¥1,400-3,000/吨",
      quantity: "数量不限",
      company: "江西环复生再生资...",
      location: "江西省·萍乡市",
      category: "报废机动车"
    },
    {
      id: 2,
      name: "轻型汽车",
      image: "/images/22.jpg",
      price: "¥2,150-2,500/吨",
      quantity: "数量不限",
      company: "常州同正再生资源...",
      location: "江苏省·常州市",
      category: "报废机动车"
    },
    {
      id: 3,
      name: "报废车辆",
      image: "/images/33.jpg",
      price: "¥1,800/辆",
      quantity: "数量不限",
      company: "库车合诚金属制品...",
      location: "新疆维吾尔自治区·阿克苏地区",
      category: "报废机动车"
    },
    {
      id: 4,
      name: "报废车辆",
      image: "/images/44.jpg",
      price: "¥1,000/吨",
      quantity: "数量不限",
      company: "孝义市祥龙废旧物...",
      location: "山西省·吕梁市",
      category: "报废机动车"
    }
  ];

  // 询单采购数据
  const inquiryItems = [
    {
      id: 1,
      title: "辽宁吉和源三千破碎线锤头采购",
      company: "辽宁吉和源再生资源有限公司",
      location: "辽宁省本溪市",
      deadline: "03时18分",
      result: "立即查看"
    },
    {
      id: 2,
      title: "废铜原料分选收集整理装车配送服...",
      company: "湖北皓润新材料科技有限公司",
      location: "湖北省孝感市",
      deadline: "01天01时",
      result: "立即查看"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <select className="bg-transparent text-sm text-gray-600 dark:text-gray-300 border-none outline-none mr-2">
                <option>找需求</option>
                <option>找供应</option>
              </select>
              <input
                type="text"
                placeholder="输入物料名称、省市、公司名称、回收网点"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none outline-none"
              />
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
            <Button className="bg-blue-200 hover:bg-blue-200 text-white px-6">
              搜索
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 收废钢 Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">收废钢</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scrapSteelItems.map((item) => (
              <Card key={item.id} className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-blue-200/50 dark:border-gray-600/50 shadow-xl hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                  <div className="relative">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">采购价:</span>
                        <span className="font-semibold text-blue-400 dark:text-blue-400">{item.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">采购量:</span>
                        <span className="text-gray-900 dark:text-white">{item.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">采购单位:</span>
                        <span className="text-gray-900 dark:text-white truncate ml-2">{item.company}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <LocationIcon className="w-4 h-4 mr-1" />
                        <span className="text-sm">{item.location}</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-blue-200 hover:bg-blue-200 text-white">
                      立即采购
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 收报废机动车 Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">收报废机动车</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vehicleItems.map((item) => (
              <Card key={item.id} className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-blue-200/50 dark:border-gray-600/50 shadow-xl hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                  <div className="relative">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">采购价:</span>
                        <span className="font-semibold text-blue-400 dark:text-blue-400">{item.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">采购量:</span>
                        <span className="text-gray-900 dark:text-white">{item.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">采购单位:</span>
                        <span className="text-gray-900 dark:text-white truncate ml-2">{item.company}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <LocationIcon className="w-4 h-4 mr-1" />
                        <span className="text-sm">{item.location}</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-blue-300 hover:bg-blue-400 text-white">
                      立即采购
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 询单采购 Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">询单采购</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                实现阳光采购, 为企业采购提供多种模式选择
              </p>
            </div>
            <Button variant="outline" className="text-blue-600 hover:text-blue-700">
              查看更多 &gt;
            </Button>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-blue-200/50 dark:border-gray-600/50 shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        采购标题
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        采购单位
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        收货地
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        截止时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        结果
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {inquiryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <TimeIcon className="w-4 h-4 mr-1 text-gray-400" />
                            {item.deadline}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700">
                            {item.result}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}