import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/backup - Export ALL data for persistent backup
export async function GET() {
  try {
    const [invoices, invoiceItems, users, counters, settings] = await Promise.all([
      db.invoice.findMany({ orderBy: { createdAt: 'desc' } }),
      db.invoiceItem.findMany({ orderBy: { createdAt: 'desc' } }),
      db.user.findMany({ orderBy: { createdAt: 'desc' } }),
      db.counter.findMany(),
      db.setting.findMany(),
    ])

    const backup = {
      version: 2,
      timestamp: new Date().toISOString(),
      invoices,
      invoiceItems,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        role: u.role,
        counterName: u.counterName,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      counters,
      settings,
    }

    return NextResponse.json({ backup })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}
