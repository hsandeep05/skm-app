import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This proxy fixes the issue where reverse proxies (like Caddy) forward
// the external Host header, which can cause Next.js to crash on POST requests
// in sandbox/development environments.
// On Vercel, the Host header is handled correctly by Vercel's infrastructure,
// so this proxy only rewrites Host in non-Vercel environments.
export function proxy(request: NextRequest) {
  // Only intercept API POST/PUT/DELETE/PATCH requests in development/sandbox
  const isVercel = process.env.VERCEL === '1'
  if (!isVercel && request.nextUrl.pathname.startsWith('/api/') && request.method !== 'GET') {
    const requestHeaders = new Headers(request.headers)
    // Save the original host for reference
    const originalHost = requestHeaders.get('host')
    if (originalHost) {
      requestHeaders.set('x-forwarded-host', originalHost)
    }
    // Rewrite Host to match what the local Next.js server expects
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
