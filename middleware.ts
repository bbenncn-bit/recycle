import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getOpsJwtSecretBytes, shouldSkipHttpsRedirect } from '@/lib/ops-jwt-secret';

const OPS_SESSION = 'ops_session';

export async function middleware(request: NextRequest) {
  // 公网生产环境可强制 HTTPS；内网 IP / OPS_ALLOW_HTTP=1 不跳转（Win10 常用 http://10.x.x.x:3000）
  if (process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    if (protocol === 'http' && host && !shouldSkipHttpsRedirect(host)) {
      url.protocol = 'https:';
      url.host = host;
      return NextResponse.redirect(url, 301);
    }
  }

  const path = request.nextUrl.pathname;
  if (path.startsWith('/profit-management/operations')) {
    if (path === '/profit-management/operations/login' || path === '/profit-management/operations/register') {
      return NextResponse.next();
    }
    const token = request.cookies.get(OPS_SESSION)?.value;
    if (!token) {
      const login = new URL('/profit-management/operations/login', request.url);
      login.searchParams.set('from', path);
      return NextResponse.redirect(login);
    }
    try {
      await jwtVerify(token, getOpsJwtSecretBytes());
    } catch {
      const login = new URL('/profit-management/operations/login', request.url);
      login.searchParams.set('from', path);
      return NextResponse.redirect(login);
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