import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 xl:col-span-1">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">萍乡市再生资源交易平台</h3>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                变废为宝，推动循环经济发展，打造绿色可持续的再生资源交易生态系统。
              </p>
            </div>
            <div className="flex space-x-6">
              {/* Social media links can be added here */}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">关注萍乡</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      萍乡市政府官网
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      萍乡市政府发布
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      萍乡县区发布
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">平台规则</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      平台服务条款
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      会员管理条款
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      平台交易规则
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      注册准入协议
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">帮助中心</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      快速入门
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      使用手册
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      常见问题
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">联系方式</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <span className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                      客服电话：0799-3673070
                    </span>
                  </li>
                  <li>
                    <span className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                      服务时间：周一至周日 8:30-17:00
                    </span>
                  </li>
                  <li>
                    <span className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                      地址：江西省萍乡市萍乡经济技术开发区彭高镇彭高工业园27号
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-gray-200 dark:border-gray-700 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400 text-center">
            Copyright © 2025 萍乡再生资源交易平台 版权所有 ICP备案号：赣ICP备2025052575号-3
          </p>
        </div>
      </div>
    </footer>
  );
} 