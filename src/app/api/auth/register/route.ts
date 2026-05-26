import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, role, counterName, adminPassword } = body

    // Require admin password to create new users
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin password is required to create new users' }, { status: 403 })
    }

    // Verify admin exists and password matches
    const adminUser = await db.user.findFirst({ where: { role: 'admin' } })
    if (!adminUser || adminUser.password !== hashPassword(adminPassword)) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    // Check if username already exists
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        username,
        password: hashPassword(password),
        role: role || 'operator',
        counterName: counterName || null,
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
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
