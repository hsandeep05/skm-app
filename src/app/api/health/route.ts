import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/health - Health check endpoint for deployment platform
export async function GET() {
  try {
    // Test database connectivity
    await db.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check failed - DB error:', error)
    return NextResponse.json({
      status: 'error',
      db: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
