import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// POST /api/clear-data - Delete all invoices and reset counters
// Requires admin password for security
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminPassword } = body

    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin password is required' }, { status: 403 })
    }

    // Verify admin password
    const admin = await db.user.findFirst({ where: { role: 'admin' } })
    if (!admin || admin.password !== hashPassword(adminPassword)) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
    }

    // Delete all invoice items first (due to foreign key)
    const deletedItems = await db.invoiceItem.deleteMany()
    // Delete all invoices
    const deletedInvoices = await db.invoice.deleteMany()
    // Delete all unlocking entries
    const deletedUnlocking = await db.unlockingEntry.deleteMany()
    // Reset the invoice counter
    await db.counter.deleteMany()

    return NextResponse.json({
      success: true,
      deletedInvoices: deletedInvoices.count,
      deletedItems: deletedItems.count,
      deletedUnlocking: deletedUnlocking.count,
      message: 'All invoice and unlocking data has been cleared',
    })
  } catch (error) {
    console.error('Clear data error:', error)
    return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 })
  }
}
