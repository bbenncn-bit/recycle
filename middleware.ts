import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 注意：数据同步定时任务现在通过 instrumentation.ts 在应用启动时初始化
  // 不再在 middleware 中初始化，以避免每次请求都检查

  // 在生产环境强制HTTPS
  if (process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    // 如果是HTTP访问，重定向到HTTPS
    if (protocol === 'http' && host) {
      url.protocol = 'https:';
      url.host = host;
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 