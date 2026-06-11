import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware fixes the issue where the Caddy reverse proxy forwards
// the external Host header, which causes Next.js to crash on POST requests.
// We rewrite the Host header to localhost:3000 for API routes.
export function proxy(request: NextRequest) {
  // Only intercept API POST/PUT/DELETE/PATCH requests (the ones that crash)
  if (request.nextUrl.pathname.startsWith('/api/') && request.method !== 'GET') {
    const requestHeaders = new Headers(request.headers)
    // Save the original host for reference
    const originalHost = requestHeaders.get('host')
    if (originalHost) {
      requestHeaders.set('x-forwarded-host', originalHost)
    }
    // Rewrite Host to match what Next.js expects
    requestHeaders.set('host', 'localhost:3000')

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
