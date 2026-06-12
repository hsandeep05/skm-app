import { NextResponse } from 'next/server'

// GET /api/health - Health check endpoint for deployment platform
// This MUST respond quickly without requiring DB connection
// The platform uses this to determine if the function is ready
export async function GET() {
  try {
    // Try DB check but don't block on it
    const { db } = await import('@/lib/db')
    await db.$connect()

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Still return 200 so the platform considers the function "ready"
    // The app itself handles DB errors gracefully
    console.error('Health check - DB not ready:', error)
    return NextResponse.json({
      status: 'starting',
      db: 'connecting',
      timestamp: new Date().toISOString(),
    })
  }
}
