import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This proxy fixes the issue in sandbox/development environments where
// the Caddy reverse proxy forwards an external Host header that Next.js
// can't handle on API POST requests, causing server crashes.
// On Vercel, Host headers are handled correctly by Vercel's infrastructure.
export function proxy(request: NextRequest) {
  const isVercel = process.env.VERCEL === '1'
  if (isVercel) {
    return NextResponse.next()
  }

  // Only fix API non-GET requests - these are the ones that crash
  if (request.nextUrl.pathname.startsWith('/api/') && request.method !== 'GET') {
    const requestHeaders = new Headers(request.headers)
    const originalHost = requestHeaders.get('host')
    if (originalHost && originalHost !== 'localhost:3000' && originalHost !== '127.0.0.1:3000') {
      requestHeaders.set('x-forwarded-host', originalHost)
      requestHeaders.set('host', 'localhost:3000')
      requestHeaders.delete('origin')
    }
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
