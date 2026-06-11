import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This proxy fixes issues in sandbox/development environments where:
// 1. The reverse proxy (Caddy) forwards an external Host header that Next.js can't handle
// 2. Accept-Encoding with multiple algorithms causes compression crashes
// On Vercel, these headers are handled correctly by Vercel's infrastructure.
export function proxy(request: NextRequest) {
  const isVercel = process.env.VERCEL === '1'
  if (isVercel) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  let modified = false

  // Fix #1: Rewrite Host header for ALL requests (not just API)
  // The Caddy gateway forwards the external Host (e.g., xxx.space-z.ai)
  // which Next.js can't resolve, causing server crashes
  const originalHost = requestHeaders.get('host')
  if (originalHost && originalHost !== 'localhost:3000' && originalHost !== '127.0.0.1:3000') {
    requestHeaders.set('x-forwarded-host', originalHost)
    requestHeaders.set('host', 'localhost:3000')
    // Also strip Origin to prevent CORS issues
    requestHeaders.delete('origin')
    modified = true
  }

  // Fix #2: Simplify Accept-Encoding to prevent compression crash
  const acceptEncoding = requestHeaders.get('accept-encoding')
  if (acceptEncoding && acceptEncoding.includes(',')) {
    const firstEncoding = acceptEncoding.split(',')[0].trim()
    requestHeaders.set('accept-encoding', firstEncoding)
    modified = true
  }

  if (modified) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|logo.png|logo.svg).*)',
  ],
}
