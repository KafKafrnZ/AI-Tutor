import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = [
  '/dashboard', '/tutor', '/practice', '/mock-tests',
  '/progress', '/error-log', '/explore'
]
const AUTH_ROUTES = ['/login', '/signup', '/']
const PREVIEW_AUTH_ENABLED = process.env.NEXT_PUBLIC_PREVIEW_AUTH === 'true'

function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export function proxy(request: NextRequest) {
  const previewAuth = PREVIEW_AUTH_ENABLED && isLocalhost(request)
  const token = request.cookies.get('access_token')?.value
  const tokenValid = token && !isTokenExpired(token)

  const isProtected = PROTECTED_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => request.nextUrl.pathname === route)

  if (isProtected && !tokenValid && !previewAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && tokenValid && !previewAuth) {
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
