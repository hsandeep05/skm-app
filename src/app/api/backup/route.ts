import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Fetch all data for backup
    const [invoices, users, counters, settings, unlockingEntries] = await Promise.all([
      db.invoice.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } }),
      db.user.findMany({ select: { id: true, username: true, role: true, counterName: true, createdAt: true } }),
      db.counter.findMany(),
      db.setting.findMany(),
      db.unlockingEntry.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      shopName: settings.find(s => s.key === 'shopName')?.value || 'Sri Krishna Mobiles',
      data: { invoices, users, counters, settings, unlockingEntries },
    }

    // Store backup in MongoDB as a Setting
    const backupJson = JSON.stringify(backupData)
    await db.setting.upsert({
      where: { key: 'lastBackup' },
      update: { value: backupJson },
      create: { key: 'lastBackup', value: backupJson },
    })

    return NextResponse.json({
      success: true,
      timestamp: backupData.timestamp,
      invoiceCount: invoices.length,
      userCount: users.length,
      unlockingCount: unlockingEntries.length,
    })
  } catch (error) {
    console.error('Backup failed:', error)
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const backup = await db.setting.findUnique({ where: { key: 'lastBackup' } })
    if (!backup) {
      return NextResponse.json({ error: 'No backup found' }, { status: 404 })
    }
    return NextResponse.json({ backup: JSON.parse(backup.value) })
  } catch (error) {
    console.error('Failed to get backup:', error)
    return NextResponse.json({ error: 'Failed to get backup' }, { status: 500 })
  }
}
