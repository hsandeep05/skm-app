import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// Auto-seed the default admin user if no users exist
// Credentials: Username: SriKrishna, Password: Krishna@123
export async function POST() {
  try {
    const userCount = await db.user.count()

    if (userCount > 0) {
      // Default user already exists, nothing to do
      return NextResponse.json({ seeded: false, message: 'Users already exist' })
    }

    const user = await db.user.create({
      data: {
        username: 'SriKrishna',
        password: hashPassword('Krishna@123'),
        role: 'admin',
        counterName: 'Main Counter',
      },
    })

    return NextResponse.json({
      seeded: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        counterName: user.counterName,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Seed error:', error)

    // If collection doesn't exist or connection issue, tell the client to run setup first
    if (error?.message?.includes('does not exist') || error?.code === '42P01' || error?.message?.includes('no such table') || error?.message?.includes('collection')) {
      return NextResponse.json({
        error: 'Database not accessible. Please run setup first: POST /api/setup',
        needsSetup: true,
      }, { status: 503 })
    }

    return NextResponse.json({
      error: 'Failed to seed user',
      detail: error.message,
    }, { status: 500 })
  }
}
