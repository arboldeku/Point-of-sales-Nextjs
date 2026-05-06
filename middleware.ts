import { NextResponse } from 'next/server'

// Middleware disabled - using client-side auth checks instead
// This prevents hydration mismatches and infinite redirects
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
