import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define static asset paths for optimization
const STATIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/api/auth'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle static assets efficiently
  const isStaticPath = STATIC_PATHS.some(path => pathname.startsWith(path));
  if (isStaticPath) {
    return NextResponse.next();
  }

  // Add any future middleware logic here (logging, headers, etc.)
  // Authentication is handled by AuthProvider client-side

  // Allow all other requests to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};