import './globals.css';
import { inter,lusitana } from 'src/components/fonts';
import { Metadata } from 'next';
import Navbar from 'src/components/navbar';
import Footer from 'src/components/footer';
import { ThemeProvider } from 'src/components/theme-provider';

export const metadata: Metadata = {
  title: '萍乡再生资源交易中心',
  description: '变废为宝 - 再生资源交易平台',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
        <ThemeProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
