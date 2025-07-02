'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon} from '@heroicons/react/24/outline';
import AcmeLogo from './acme-logo';
import ThemeToggle from './theme-toggle';

const navigation = [
  { name: '首页', href: '/'},
  { name: '市场', href: '/market'},
  { 
    name: '物资处置', 
    href: '/disposal', 
    dropdown: [
      { name: '竞价拍卖', href: '/disposal/auction' },
      { name: '一口价销售', href: '/disposal/fixedprice' },
    ]
  },
  { 
    name: '物资采购', 
    href: '/purchase', 
    dropdown: [
      { name: '废钢铁', href: '/purchase/scrapsteel' },
      { name: '报废车', href: '/purchase/scrapcar' },
      { name: '废动力电池', href: '/purchase/evbattery' },
      { name: '废塑料', href: '/purchase/plastic' },
    ]
  },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

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
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

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
                        isActive
                          ? 'bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:text-gray-800 dark:hover:text-white hover:shadow-lg'
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
                                    ? 'bg-blue-50/50 dark:bg-gray-700/50 text-blue-300 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
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
                    isActive
                      ? 'bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-700/30 hover:text-gray-800 dark:hover:text-white hover:shadow-lg'
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
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:text-gray-900 dark:focus:text-white p-2"
            >
              {/* {isOpen ? (
                // <XMarkIcon className="h-6 w-6" />
              ) : (
                // <Bars3Icon className="h-6 w-6" />
              )} */}
            </button>
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
                      onClick={() => handleDropdownToggle(item.name)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-blue-50/60 dark:bg-gray-700/60 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50/60 dark:hover:bg-gray-700/60 hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* <Icon className="h-5 w-5" />
                        <span>{item.name}</span> */}
                      </div>
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${
                        openDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* Mobile Dropdown */}
                    {openDropdown === item.name && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.dropdown.map((subItem) => (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={`block px-3 py-2 rounded-md text-sm ${
                              pathname === subItem.href
                                ? 'bg-blue-50/60 dark:bg-gray-700/60 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50/60 dark:hover:bg-gray-700/60 hover:text-gray-800 dark:hover:text-white'
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
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? 'bg-blue-50/60 dark:bg-gray-700/60 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50/60 dark:hover:bg-gray-700/60 hover:text-gray-800 dark:hover:text-white'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {/* <Icon className="h-5 w-5" /> */}
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