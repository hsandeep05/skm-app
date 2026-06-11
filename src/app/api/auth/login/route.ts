import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Try to find user - handle case where User table might not exist
    let user
    try {
      user = await db.user.findUnique({ where: { username } })
    } catch (dbErr: any) {
      console.error('Login DB error - table may not exist:', dbErr.message)
      // If the User table doesn't exist, try to auto-setup
      try {
        // Check if we need setup
        const setupRes = await fetch(new URL('/api/setup', request.url), { method: 'POST' })
        const setupData = await setupRes.json()
        if (setupData.success) {
          // Try again after setup
          user = await db.user.findUnique({ where: { username } })
        }
      } catch (setupErr) {
        console.error('Auto-setup failed:', setupErr)
      }

      if (!user) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
      }
    }

    if (!user || user.password !== hashPassword(password)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Create session token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 day session

    try {
      await db.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      })
    } catch (sessionErr: any) {
      console.error('Session creation error:', sessionErr.message)
      // If Session table doesn't exist, try creating it
      // Session is optional for basic auth - we can still set the cookie
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        counterName: user.counterName,
      },
    })

    // Set session cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({
      error: 'Login failed',
      detail: error.message || 'Unknown error',
    }, { status: 500 })
  }
}
