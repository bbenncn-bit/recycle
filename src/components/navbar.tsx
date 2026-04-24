'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bars3Icon, ChevronDownIcon } from '@heroicons/react/24/outline';
import AcmeLogo from './acme-logo';
import ThemeToggle from './theme-toggle';

const navigation = [
  { name: '首页', href: '/'},
  { 
    name: '算账经营', 
    href: '/profit-management/cost-analysis', 
    dropdown: [
      { name: '成本分析', href: '/profit-management/cost-analysis' },
      { name: '利润分析', href: '/profit-management/profit-analysis' },
      { name: '运维', href: '/profit-management/operations' },
    ]
  },
  { 
    name: '能碳管理', 
    href: '/energy/consumption-query', 
    dropdown: [
      { name: '能耗查询', href: '/energy/consumption-query' },
      { name: '能源消费量计算', href: '/energy/consumption-calculation' },
      { name: '能源分析与策略', href: '/energy/analysis-strategy' },
      { name: '能效对标', href: '/energy/efficiency-benchmark' },
      { name: '能流分析', href: '/energy/flow-analysis' },
      { name: '能效平衡与优化', href: '/energy/balance-optimization' },
      { name: '能碳预测管理', href: '/energy/prediction-management' },
      { name: '碳排放核算', href: '/energy/carbon-accounting' },
      { name: '更多', href: '/energy/more' },
      { name: '固废管理', href: '/waste-management' },
      { name: '固废录入', href: '/waste-management/input' },
    ]
  },
  { 
    name: '处置采购', 
    href: '/disposal/auction', 
    dropdown: [
      { name: '竞价拍卖', href: '/disposal/auction' },
      { name: '一口价销售', href: '/disposal/fixedprice' },
      { name: '废钢铁', href: '/purchase/scrapsteel' },
      { name: '报废车', href: '/purchase/scrapcar' },
      { name: '废动力电池', href: '/purchase/evbattery' },
      { name: '废塑料', href: '/purchase/plastic' },
    ]
  },
];

const mainNavActiveClass =
  'bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-white shadow-lg';
const mainNavIdleClass =
  'text-gray-600 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-700/30 hover:text-gray-800 dark:hover:text-white hover:shadow-lg';
/** 桌面端带下拉的父级链接悬停略强，与原先一致 */
const desktopDropdownParentIdleClass =
  'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:text-gray-800 dark:hover:text-white hover:shadow-lg';
const subNavActiveClass =
  'bg-blue-50/50 dark:bg-gray-700/50 text-blue-300 dark:text-blue-400';
const subNavIdleClass =
  'text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  /** 窄屏顶部「算账经营」下拉（成本/利润），与汉堡菜单的 accordion 状态分离 */
  const [accountingQuickOpen, setAccountingQuickOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const profitMgmtSectionActive =
    pathname === '/profit-management/cost-analysis' ||
    pathname === '/profit-management/profit-analysis' ||
    pathname === '/profit-management/operations';

  // 处理桌面端鼠标悬停事件
  const handleMouseEnter = (itemName: string) => {
    setOpenDropdown(itemName);
  };

  const handleMouseLeave = () => {
    setOpenDropdown(null);
  };

  // 处理移动端点击事件
  const handleDropdownToggle = (itemName: string) => {
    setOpenDropdown(openDropdown === itemName ? null : itemName);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        closeDropdown();
        setAccountingQuickOpen(false);
      }
    };

    if (openDropdown || accountingQuickOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, accountingQuickOpen]);

  return (
    <nav ref={navRef} className="bg-blue-200 dark:bg-gray-800 shadow-lg border-b border-blue-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-36">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <AcmeLogo />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-12">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.dropdown && item.dropdown.some(subItem => pathname === subItem.href));
              // const Icon = item.icon;
              
              if (item.dropdown) {
                return (
                  <div 
                    key={item.name} 
                    className="relative group"
                    onMouseEnter={() => handleMouseEnter(item.name)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-normal transition-colors ${
                        isActive ? mainNavActiveClass : desktopDropdownParentIdleClass
                      }`}
                    >
                      <span>{item.name}</span>
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${
                        openDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </Link>
                    
                    {/* Dropdown Menu - 移除mt-1间距，添加pt-1内边距来创建无缝连接 */}
                    {openDropdown === item.name && (
                      <div className="absolute top-full left-0 pt-1 w-56 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600">
                          <div className="py-1">
                            {item.dropdown.map((subItem) => (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={`block px-4 py-2 text-sm transition-colors ${
                                  pathname === subItem.href
                                    ? subNavActiveClass
                                    : subNavIdleClass
                                }`}
                              >
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-normal transition-colors ${
                    isActive ? mainNavActiveClass : mainNavIdleClass
                  }`}
                >
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <ThemeToggle />
            <Link
              href="/login"
              className={`px-3 py-2 rounded-md text-base font-medium transition-colors ${
                pathname === '/login'
                  ? 'bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/20 dark:hover:bg-gray-700/30 hover:shadow-lg'
              }`}
            >
              登录
            </Link>
            <Link
              href="/signup"
              className={`px-4 py-2 rounded-md text-base font-medium transition-colors ${
                pathname === '/signup'
                  ? 'bg-gray-100/50 dark:bg-gray-600/50 text-gray-800 dark:text-white shadow-lg'
                  : 'bg-blue-200/50 dark:bg-blue-600/50 text-gray-600 dark:text-white hover:bg-white/20 dark:hover:bg-blue-500/50 hover:shadow-lg shadow-md'
              }`}
            >
              注册
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              type="button"
              aria-label={isOpen ? '关闭菜单' : '打开菜单'}
              onClick={() => {
                setIsOpen((o) => !o);
                setAccountingQuickOpen(false);
              }}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:text-gray-900 dark:focus:text-white p-2 rounded-md hover:bg-white/30 dark:hover:bg-gray-700/50"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* 手机与窄屏：主导航底色选中；算账经营展开子项（成本/利润），子项选中为淡蓝字+浅底 */}
        <div className="md:hidden flex gap-3 pb-3 -mt-2 justify-center sm:justify-start items-stretch">
          <Link
            href="/"
            className={`flex flex-1 sm:flex-none items-center justify-center text-center px-3 py-2 rounded-md text-base font-normal transition-colors ${
              pathname === '/' ? mainNavActiveClass : mainNavIdleClass
            }`}
          >
            首页
          </Link>
          <div className="relative flex flex-1 sm:flex-none min-w-0">
            <button
              type="button"
              aria-expanded={accountingQuickOpen}
              aria-haspopup="true"
              onClick={() => {
                setAccountingQuickOpen((o) => !o);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-center gap-1 px-3 py-2 rounded-md text-base font-normal transition-colors ${
                profitMgmtSectionActive ? mainNavActiveClass : mainNavIdleClass
              }`}
            >
              <span>算账经营</span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 transition-transform ${accountingQuickOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {accountingQuickOpen && (
              <div className="absolute left-0 right-0 top-full z-50 pt-1">
                <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                  <Link
                    href="/profit-management/cost-analysis"
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === '/profit-management/cost-analysis'
                        ? subNavActiveClass
                        : subNavIdleClass
                    }`}
                    onClick={() => setAccountingQuickOpen(false)}
                  >
                    成本分析
                  </Link>
                  <Link
                    href="/profit-management/profit-analysis"
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === '/profit-management/profit-analysis'
                        ? subNavActiveClass
                        : subNavIdleClass
                    }`}
                    onClick={() => setAccountingQuickOpen(false)}
                  >
                    利润分析
                  </Link>
                  <Link
                    href="/profit-management/operations"
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === '/profit-management/operations'
                        ? subNavActiveClass
                        : subNavIdleClass
                    }`}
                    onClick={() => setAccountingQuickOpen(false)}
                  >
                    运维
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.dropdown && item.dropdown.some(subItem => pathname === subItem.href));
              // const Icon = item.icon;
              
              if (item.dropdown) {
                return (
                  <div key={item.name}>
                    <button
                      type="button"
                      onClick={() => handleDropdownToggle(item.name)}
                      className={`flex w-full items-center justify-between px-3 py-2 rounded-md text-base font-normal transition-colors ${
                        isActive ? mainNavActiveClass : mainNavIdleClass
                      }`}
                    >
                      <span>{item.name}</span>
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${
                        openDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* Mobile Dropdown */}
                    {openDropdown === item.name && (
                      <div className="ml-2 mt-1 space-y-0.5 border-l border-gray-200 pl-3 dark:border-gray-600">
                        {item.dropdown.map((subItem) => (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                              pathname === subItem.href
                                ? subNavActiveClass
                                : subNavIdleClass
                            }`}
                            onClick={() => {
                              setIsOpen(false);
                              closeDropdown();
                            }}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-normal transition-colors ${
                    isActive ? mainNavActiveClass : mainNavIdleClass
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Mobile User Menu */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <Link
                href="/login"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === '/login'
                    ? 'bg-gray-50/60 dark:bg-gray-700/60 text-gray-800 dark:text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50/60 dark:hover:bg-gray-700/60 hover:shadow-lg'
                }`}
                onClick={() => setIsOpen(false)}
              >
                登录
              </Link>
              <Link
                href="/signup"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === '/signup'
                    ? 'bg-blue-600/95 dark:bg-blue-500/95 text-white shadow-lg'
                    : 'bg-blue-500/80 dark:bg-blue-600/80 text-white hover:bg-blue-500/90 dark:hover:bg-blue-600/90 hover:shadow-lg shadow-lg'
                }`}
                onClick={() => setIsOpen(false)}
              >
                注册
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
} 