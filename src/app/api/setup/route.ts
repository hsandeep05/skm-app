import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// POST /api/setup - Initialize database and seed admin user
// Works with MongoDB Atlas
export async function POST() {
  try {
    console.log('[Setup] Checking database connection...')

    // Verify database connection
    try {
      await db.$connect()
      console.log('[Setup] Database connection verified')
    } catch (connectErr) {
      console.error('[Setup] Database connection failed:', connectErr)
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to database. Check your DATABASE_URL environment variable.',
      }, { status: 500 })
    }

    // Seed the admin user
    try {
      const userCount = await db.user.count()
      if (userCount === 0) {
        await db.user.create({
          data: {
            username: 'SriKrishna',
            password: hashPassword('Krishna@123'),
            role: 'admin',
            counterName: 'Main Counter',
          },
        })
        console.log('[Setup] Admin user created')
      } else {
        console.log('[Setup] Users already exist, skipping seed')
      }
    } catch (seedErr) {
      console.error('[Setup] User seed error:', seedErr)
    }

    // Seed default settings
    try {
      const shopName = await db.setting.findUnique({ where: { key: 'shopName' } })
      if (!shopName) {
        await db.setting.create({
          data: { key: 'shopName', value: 'Sri Krishna Mobiles' },
        })
      }

      const shopAddress = await db.setting.findUnique({ where: { key: 'shopAddress' } })
      if (!shopAddress) {
        await db.setting.create({
          data: { key: 'shopAddress', value: 'Near Chowk Bazar, Main Road, Narayanpet' },
        })
      }

      const shopTagline = await db.setting.findUnique({ where: { key: 'shopTagline' } })
      if (!shopTagline) {
        await db.setting.create({
          data: { key: 'shopTagline', value: 'Your Trusted Mobile Service Center' },
        })
      }
    } catch (settingErr) {
      console.error('[Setup] Settings seed error:', settingErr)
    }

    // Seed invoice counter
    try {
      const invoiceCounter = await db.counter.findUnique({ where: { name: 'invoice' } })
      if (!invoiceCounter) {
        await db.counter.create({
          data: { name: 'invoice', value: 0 },
        })
      }
    } catch (counterErr) {
      console.error('[Setup] Counter seed error:', counterErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup complete! Connection verified and admin user seeded.',
      credentials: { username: 'SriKrishna', password: 'Krishna@123' },
    })
  } catch (error: any) {
    console.error('[Setup] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Setup failed',
      detail: error?.cause?.message || '',
    }, { status: 500 })
  }
}

// GET /api/setup - Check if database is set up
export async function GET() {
  try {
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
      hint: 'POST /api/setup to verify connection and seed data',
    })
  }
}
