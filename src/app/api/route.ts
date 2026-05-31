import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Quick DB connectivity check
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ 
      message: "Sri Krishna Mobiles Bill Generator",
      status: "ok",
      db: "connected"
    })
  } catch (error) {
    console.error('API health check - DB error:', error)
    return NextResponse.json({ 
      message: "Sri Krishna Mobiles Bill Generator",
      status: "degraded",
      db: "disconnected"
    }, { status: 503 })
  }
}
