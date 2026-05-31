import { NextResponse } from 'next/server'

// GET /api - Root API endpoint
// Responds quickly without blocking on DB connection
export async function GET() {
  return NextResponse.json({ 
    message: "Sri Krishna Mobiles Bill Generator",
    status: "ok",
    version: "1.0.0",
  })
}
