import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/utils/amplify-server-utils';

/**
 * MIDDLEWARE: Server-Side Route Protection
 *
 * This runs on the server/edge BEFORE pages load.
 * It checks authentication and blocks unauthorized access.
 */

/**
 * Routes that require authentication
 * Middleware will redirect to /authentication/sign-in if not authenticated
 */
const protectedRoutes = [
  '/channel-mappings',
  '/webhook-monitor',
];

/**
 * Public routes that should skip middleware checks
 * These are always accessible regardless of auth state
 */
const publicRoutes = [
  '/',
  '/authentication/sign-in',
  '/authentication/sign-up',
  '/authentication/forgot-password',
];

/**
 * Middleware function: Protects routes before page loads
 * Runs on Edge/Server, NOT in browser
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Request: ${pathname}`);

  // Skip middleware for public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    console.log(`[Middleware] Public route, allowing: ${pathname}`);
    return response;
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    console.log(`[Middleware] Not a protected route, allowing: ${pathname}`);
    return response;
  }

  // This is a protected route - check authentication
  try {
    const authenticated = await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: async (contextSpec) => {
        try {
          const session = await fetchAuthSession(contextSpec);
          const hasValidToken = !!session.tokens?.idToken;
          console.log(`[Middleware] Auth check result: ${hasValidToken}`);
          return hasValidToken;
        } catch (error) {
          console.log('[Middleware] Auth check error:', error);
          return false;
        }
      },
    });

    if (!authenticated) {
      // Not authenticated - redirect to sign in
      console.log(`[Middleware] Blocking access to ${pathname} - redirecting to sign in`);
      const signInUrl = new URL('/authentication/sign-in', request.url);
      // Optional: Store original URL to redirect back after login
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Authenticated - allow access
    console.log(`[Middleware] Allowing access to ${pathname}`);
    return response;

  } catch (error) {
    // On unexpected error, redirect to sign in (fail secure)
    console.error('[Middleware] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/authentication/sign-in', request.url)
    );
  }
}

/**
 * Configure which paths middleware runs on
 * Exclude static files to avoid unnecessary checks
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (separate auth handling)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - images folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images).*)',
  ],
};
