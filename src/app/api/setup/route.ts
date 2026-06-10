import { NextResponse } from 'next/server'

// POST /api/setup - Initialize database schema and seed admin user
// This endpoint creates all tables and the default admin user
// Call this once after deploying to a new environment
export async function POST() {
  try {
    // Use dynamic import to avoid build-time issues
    const { execSync } = await import('child_process')

    // Push schema to database (creates tables if they don't exist)
    console.log('[Setup] Pushing database schema...')
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'pipe',
      timeout: 60000,
      env: {
        ...process.env,
        // Use DIRECT_URL for schema migrations (requires direct connection)
        DATABASE_URL: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    })
    console.log('[Setup] Schema pushed successfully')

    // Now seed the admin user
    const { db } = await import('@/lib/db')
    const { createHash } = await import('crypto')

    const userCount = await db.user.count()

    if (userCount === 0) {
      await db.user.create({
        data: {
          username: 'SriKrishna',
          password: createHash('sha256').update('Krishna@123').digest('hex'),
          role: 'admin',
          counterName: 'Main Counter',
        },
      })
      console.log('[Setup] Admin user created')
    }

    // Also seed default settings if needed
    const shopName = await db.setting.findUnique({ where: { key: 'shopName' } })
    if (!shopName) {
      await db.setting.create({
        data: { key: 'shopName', value: 'Sri Krishna Mobiles' },
      })
    }

    const invoiceCounter = await db.counter.findUnique({ where: { name: 'invoice' } })
    if (!invoiceCounter) {
      await db.counter.create({
        data: { name: 'invoice', value: 0 },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup complete! Tables created and admin user seeded.',
      credentials: { username: 'SriKrishna', password: 'Krishna@123' },
    })
  } catch (error: any) {
    console.error('[Setup] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Setup failed',
      stderr: error.stderr?.toString()?.slice(-500) || '',
    }, { status: 500 })
  }
}

// GET /api/setup - Check if database is set up
export async function GET() {
  try {
    const { db } = await import('@/lib/db')

    // Check if tables exist by trying to count users
    const userCount = await db.user.count()

    return NextResponse.json({
      setup: userCount > 0,
      userCount,
      message: userCount > 0 ? 'Database is set up and ready' : 'Database needs setup - POST /api/setup to initialize',
    })
  } catch (error: any) {
    return NextResponse.json({
      setup: false,
      error: error.message || 'Database not accessible',
      hint: 'POST /api/setup to create tables and seed data',
    })
  }
}
