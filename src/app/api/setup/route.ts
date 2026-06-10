import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// POST /api/setup - Initialize database schema and seed admin user
// Uses raw SQL to create tables (works on Vercel serverless)
// Call this once after deploying to a new environment
export async function POST() {
  try {
    console.log('[Setup] Creating database tables...')

    // Create tables using raw SQL (PostgreSQL)
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT NOT NULL,
        "invoiceId" TEXT NOT NULL,
        "tempId" TEXT,
        "syncStatus" TEXT NOT NULL DEFAULT 'synced',
        "date" TEXT NOT NULL,
        "customerName" TEXT NOT NULL DEFAULT 'Walk-in Customer',
        "customerPhone" TEXT,
        "mobileName" TEXT NOT NULL,
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "calculatedNetProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
        "status" TEXT NOT NULL DEFAULT 'pending',
        "updatedBy" TEXT NOT NULL DEFAULT 'operator_primary',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id" TEXT NOT NULL,
        "invoiceId" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Counter" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "value" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'operator',
        "counterName" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL DEFAULT '',
        CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
      );
    `)

    // Create unique indexes (IF NOT EXISTS to be safe)
    try {
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceId_key" ON "Invoice"("invoiceId");`)
    } catch (e) { console.log('[Setup] Invoice invoiceId index may already exist') }

    try {
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");`)
    } catch (e) { console.log('[Setup] InvoiceItem invoiceId index may already exist') }

    try {
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Counter_name_key" ON "Counter"("name");`)
    } catch (e) { console.log('[Setup] Counter name index may already exist') }

    try {
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");`)
    } catch (e) { console.log('[Setup] User username index may already exist') }

    try {
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");`)
    } catch (e) { console.log('[Setup] Session token index may already exist') }

    try {
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");`)
    } catch (e) { console.log('[Setup] Setting key index may already exist') }

    // Add foreign key for InvoiceItem -> Invoice
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS "InvoiceItem_invoiceId_fkey";
        ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `)
    } catch (e) { console.log('[Setup] InvoiceItem FK may already exist') }

    // Add foreign key for Session -> User
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";
        ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `)
    } catch (e) { console.log('[Setup] Session FK may already exist') }

    console.log('[Setup] Tables created successfully')

    // Seed the admin user
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

    // Seed default settings
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
      hint: 'POST /api/setup to create tables and seed data',
    })
  }
}
