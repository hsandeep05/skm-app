import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/unlocking - Fetch unlocking entries
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const all = searchParams.get('all')
    const period = searchParams.get('period') // 'week' or 'month'

    let entries
    if (all === 'true') {
      entries = await db.unlockingEntry.findMany({
        orderBy: { createdAt: 'desc' },
      })
    } else if (period === 'week') {
      // This week: from Monday to Sunday of current week
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + mondayOffset)
      monday.setHours(0, 0, 0, 0)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      const startDate = monday.toISOString().split('T')[0]
      const endDate = sunday.toISOString().split('T')[0]

      entries = await db.unlockingEntry.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (period === 'month') {
      // This month: 1st to last day of current month
      const now = new Date()
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      entries = await db.unlockingEntry.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (date) {
      entries = await db.unlockingEntry.findMany({
        where: { date },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // Default: today's entries
      const today = new Date().toISOString().split('T')[0]
      entries = await db.unlockingEntry.findMany({
        where: { date: today },
        orderBy: { createdAt: 'desc' },
      })
    }

    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({
      entries,
      totalAmount,
      count: entries.length,
    })
  } catch (error: any) {
    console.error('[Unlocking GET] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unlocking entries' },
      { status: 500 }
    )
  }
}

// POST /api/unlocking - Create new unlocking entry
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneName, customerName, frpType, amount, date } = body

    if (!phoneName || !phoneName.trim()) {
      return NextResponse.json(
        { error: 'Phone Name is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    if (!frpType || !['Online', 'Tool'].includes(frpType)) {
      return NextResponse.json(
        { error: 'FRP Type must be Online or Tool' },
        { status: 400 }
      )
    }

    const entry = await db.unlockingEntry.create({
      data: {
        phoneName: phoneName.trim(),
        customerName: customerName?.trim() || '',
        frpType,
        amount: parseFloat(amount),
        date: date || new Date().toISOString().split('T')[0],
      },
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error: any) {
    console.error('[Unlocking POST] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create unlocking entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/unlocking?id=xxx - Delete an unlocking entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    await db.unlockingEntry.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Entry deleted' })
  } catch (error: any) {
    console.error('[Unlocking DELETE] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete entry' },
      { status: 500 }
    )
  }
}
