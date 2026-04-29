import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const OPS_SESSION = 'ops_session';

function opsJwtKey(): Uint8Array {
  const s = process.env.OPS_JWT_SECRET?.trim();
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === 'production') {
    return new TextEncoder().encode('invalid');
  }
  return new TextEncoder().encode('ops-dev-only-change-in-env');
}

export async function middleware(request: NextRequest) {
  // 在生产环境强制HTTPS
  if (process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    if (protocol === 'http' && host) {
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
      await jwtVerify(token, opsJwtKey());
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