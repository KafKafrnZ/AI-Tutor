import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// FIX-3: Corrected underscores to hyphens to match actual Next.js routes
const PROTECTED_ROUTES = [
  '/dashboard', '/tutor', '/practice', '/mock-tests',
  '/progress', '/error-log', '/explore'
]
const AUTH_ROUTES = ['/login', '/signup', '/']

export function proxy(request: NextRequest) {
  // FIX-1: Corrected cookie name from 'access token' to 'access_token'
  const token = request.cookies.get('access_token')?.value
  
  const isProtected = PROTECTED_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => request.nextUrl.pathname === route)
  
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/tutor/:path*', 
    '/practice/:path*',
    '/mock-tests/:path*', // FIX-2: Changed "path* to :path*
    '/progress/:path*', 
    '/error-log/:path*',
    '/explore/:path*',
    '/login',
    '/signup',
    '/'
  ]
}