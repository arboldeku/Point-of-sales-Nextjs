import { NextRequest, NextResponse } from 'next/server'

const protectedRoutes = [
  '/pos',
  '/home',
  '/orders',
  '/product',
  '/records',
  '/analytics',
  '/settings',
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for login page and API routes
  if (pathname === '/login' || pathname.startsWith('/api/') || pathname === '/' || pathname === '/auth/login') {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    const token = request.cookies.get('pos_token')?.value

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
