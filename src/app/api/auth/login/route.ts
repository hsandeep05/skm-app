import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// Default credentials - auto-seed if no users exist
const DEFAULT_USERNAME = 'SriKrishna'
const DEFAULT_PASSWORD = 'Krishna@123'

async function ensureDefaultUser() {
  try {
    const userCount = await db.user.count()
    if (userCount === 0) {
      console.log('[Login] No users found, creating default admin user...')
      await db.user.create({
        data: {
          username: DEFAULT_USERNAME,
          password: hashPassword(DEFAULT_PASSWORD),
          role: 'admin',
          counterName: 'Main Counter',
        },
      })
      console.log('[Login] Default admin user created successfully')
    }
  } catch (err: any) {
    console.error('[Login] Failed to ensure default user:', err.message)
    // If the User table doesn't exist, try to create it via setup
    if (err?.message?.includes('no such table') || err?.message?.includes('does not exist')) {
      try {
        console.log('[Login] Tables missing, running setup...')
        // Import and run setup
        const setupRes = await fetch(new URL('/api/setup', 'http://localhost:3000'), { method: 'POST' })
        const setupData = await setupRes.json()
        if (setupData.success) {
          await db.user.create({
            data: {
              username: DEFAULT_USERNAME,
              password: hashPassword(DEFAULT_PASSWORD),
              role: 'admin',
              counterName: 'Main Counter',
            },
          })
          console.log('[Login] Setup complete and default user created')
        }
      } catch (setupErr) {
        console.error('[Login] Setup failed:', setupErr)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Ensure at least the default user exists
    await ensureDefaultUser()

    // Find user
    const user = await db.user.findUnique({ where: { username } })

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
      console.error('[Login] Session creation error:', sessionErr.message)
      // Session creation failed - still allow login without persistent session
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
    // Note: Don't use 'secure' flag since the sandbox proxy uses HTTP
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('[Login] Error:', error)
    return NextResponse.json({
      error: 'Login failed',
      detail: error.message || 'Unknown error',
    }, { status: 500 })
  }
}
