import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This proxy strips and rewrites headers that would cause Next.js to crash
// when requests come through the Caddy reverse proxy.
// Specifically, X-Forwarded-For causes Next.js to trust proxy headers and crash.
// On Vercel, headers are handled correctly by Vercel's infrastructure.
export function proxy(request: NextRequest) {
  const isVercel = process.env.VERCEL === '1'
  if (isVercel) {
    return NextResponse.next()
  }

  // Check if this request has proxy headers from Caddy
  const hasForwardedFor = request.headers.get('x-forwarded-for')
  const hasRealIP = request.headers.get('x-real-ip')
  const originalHost = request.headers.get('host')
  const isExternalHost = originalHost && originalHost !== 'localhost:3000' && originalHost !== '127.0.0.1:3000'

  if (!hasForwardedFor && !hasRealIP && !isExternalHost) {
    return NextResponse.next()
  }

  // Remove/rename headers that cause Next.js to crash
  const requestHeaders = new Headers(request.headers)

  // Remove X-Forwarded-For - this causes Next.js to trust proxy and crash
  requestHeaders.delete('x-forwarded-for')
  // Remove X-Real-IP - same issue
  requestHeaders.delete('x-real-ip')

  // Rewrite Host if it's external
  if (isExternalHost) {
    requestHeaders.set('x-forwarded-host', originalHost!)
    requestHeaders.set('host', 'localhost:3000')
  }

  // Remove Origin for API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    requestHeaders.delete('origin')
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: '/:path*',
}
