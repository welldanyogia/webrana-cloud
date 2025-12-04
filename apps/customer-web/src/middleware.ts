import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Environment-based domain configuration
const LANDING_DOMAIN = process.env.NEXT_PUBLIC_LANDING_DOMAIN || 'webrana.cloud';
const CONSOLE_DOMAIN = process.env.NEXT_PUBLIC_CONSOLE_DOMAIN || 'console.webrana.cloud';
const CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL || 'https://console.webrana.cloud';
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://webrana.cloud';

// Public routes (accessible on landing domain)
const publicRoutes = ['/', '/privacy', '/terms', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

// Routes that require authentication (console domain only)
const protectedRoutes = [
  '/dashboard',
  '/catalog',
  '/order',
  '/vps',
  '/invoices',
  '/profile',
  '/wallet',
  '/notifications',
];

// Auth routes that redirect to console if authenticated
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Check for auth token in cookies
  const token = request.cookies.get('auth-token')?.value;
  
  // Determine which domain we're on
  const isLandingDomain = hostname.includes(LANDING_DOMAIN) && !hostname.includes('console');
  const isConsoleDomain = hostname.includes(CONSOLE_DOMAIN) || hostname.includes('console.');
  
  // Development mode: localhost handling
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  // ═══════════════════════════════════════════════════════════════
  // LANDING DOMAIN LOGIC (webrana.cloud)
  // Only public pages allowed, protected routes redirect to console
  // ═══════════════════════════════════════════════════════════════
  if (isLandingDomain && !isLocalhost) {
    const isPublicRoute = publicRoutes.some((route) => 
      pathname === route || pathname.startsWith(route + '/')
    );
    
    // If trying to access protected route on landing domain, redirect to console
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL(pathname, CONSOLE_URL));
    }
    
    // If authenticated and on auth route, redirect to console dashboard
    if (authRoutes.some((route) => pathname.startsWith(route)) && token) {
      return NextResponse.redirect(new URL('/dashboard', CONSOLE_URL));
    }
    
    // Allow public routes
    if (isPublicRoute) {
      return NextResponse.next();
    }
    
    // Block unknown routes on landing
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CONSOLE DOMAIN LOGIC (console.webrana.cloud)
  // Only protected pages allowed, public pages redirect to landing
  // ═══════════════════════════════════════════════════════════════
  if (isConsoleDomain && !isLocalhost) {
    // Root on console domain should go to dashboard
    if (pathname === '/') {
      if (token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', LANDING_URL));
      }
    }
    
    // If trying to access landing-only pages on console, redirect to landing
    if (pathname === '/privacy' || pathname === '/terms') {
      return NextResponse.redirect(new URL(pathname, LANDING_URL));
    }
    
    // Protected routes without token - redirect to login on landing
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
    if (isProtectedRoute && !token) {
      const loginUrl = new URL('/login', LANDING_URL);
      loginUrl.searchParams.set('redirect', CONSOLE_URL + pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Auth routes on console domain - redirect to landing
    if (authRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL(pathname, LANDING_URL));
    }
    
    return NextResponse.next();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // LOCALHOST / DEVELOPMENT MODE
  // Allow all routes for development
  // ═══════════════════════════════════════════════════════════════
  if (isLocalhost) {
    // Check if the route is protected
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
    
    // For auth routes, if there's a token, redirect to dashboard
    if (authRoutes.some((route) => pathname.startsWith(route)) && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    return NextResponse.next();
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
