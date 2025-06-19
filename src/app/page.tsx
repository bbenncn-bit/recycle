'use client';

import { useTheme } from 'src/components/theme-provider';

export default function Page() {
  const { theme, mounted } = useTheme();
  
  if (!mounted) {
    return (
      <div className="text-center pt-12">
        <div>Loading...</div>
      </div>
    );
  }

  return (
      <div className="text-center pt-12 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300 p-8">
        {/* <div className="mb-8 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            当前主题: <span className="font-bold">{theme}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            data-theme: {document.documentElement.getAttribute('data-theme')}
          </p>
        </div> */}
        
        <h2 className="text-2xl capitalize mb-4 text-gray-900 dark:text-gray-100 transition-colors duration-300">
          再生资源交易中心
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-[16px] transition-colors duration-300">
          变废为宝 - 再生资源交易平台
        </p>
        
        {/* <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg transition-colors duration-300">
            <h3 className="text-blue-900 dark:text-blue-100">测试卡片 1</h3>
            <p className="text-blue-700 dark:text-blue-300">这是一个测试卡片</p>
          </div>
          <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg transition-colors duration-300">
            <h3 className="text-green-900 dark:text-green-100">测试卡片 2</h3>
            <p className="text-green-700 dark:text-green-300">这是另一个测试卡片</p>
          </div>
        </div> */}
      </div>
  );
}
