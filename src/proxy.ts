import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt';

// Paths available without authentication.
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  if (!user) {
    // Return JSON 401 for API requests and redirect page requests to /login.
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Требуется авторизация' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except static files and internal Next.js resources.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
