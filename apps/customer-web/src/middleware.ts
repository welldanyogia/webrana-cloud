import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/catalog',
  '/order',
  '/vps',
  '/invoices',
  '/profile',
];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth token in cookies or localStorage (via cookie)
  // Note: In Next.js middleware, we can only access cookies
  const token = request.cookies.get('auth-token')?.value;

  // For this implementation, we'll check localStorage via a custom header
  // that's set by the client. In production, use httpOnly cookies.
  // For now, we'll do a basic check and let client-side handle the rest.

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // For protected routes, if there's no token cookie, redirect to login
  // The actual token verification is done on the client side
  if (isProtectedRoute && !token) {
    // Allow the request to proceed - client-side will handle redirect
    // This is because we're using localStorage for token storage
    return NextResponse.next();
  }

  // For auth routes, if there's a token, redirect to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
