import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = [
  '/dashboard', '/tutor', '/practice', '/mock-tests',
  '/progress', '/error-log', '/explore'
]
const AUTH_ROUTES = ['/login', '/signup', '/']

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const tokenValid = token && !isTokenExpired(token)

  const isProtected = PROTECTED_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => request.nextUrl.pathname === route)

  if (isProtected && !tokenValid) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && tokenValid) {
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