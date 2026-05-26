import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// Seed the default admin user if no users exist
export async function POST(request: NextRequest) {
  try {
    const userCount = await db.user.count()

    if (userCount > 0) {
      return NextResponse.json({ error: 'Users already exist. Use register endpoint.' }, { status: 400 })
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const user = await db.user.create({
      data: {
        username,
        password: hashPassword(password),
        role: 'admin',
        counterName: 'Main Counter',
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        counterName: user.counterName,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed user' }, { status: 500 })
  }
}
