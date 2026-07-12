import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const range = searchParams.get('range') || 'today' // today, week, month, all

    // Calculate date range
    const now = new Date()
    let startDate: string | null = null
    let endDate: string | null = null

    if (range === 'today') {
      startDate = now.toISOString().split('T')[0]
      endDate = startDate
    } else if (range === 'week') {
      // Start from Monday of current week
      const dayOfWeek = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
      startDate = monday.toISOString().split('T')[0]
      endDate = now.toISOString().split('T')[0]
    } else if (range === 'month') {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      endDate = now.toISOString().split('T')[0]
    }
    // range === 'all' → no date filter

    // If specific date is provided, override range
    if (date) {
      startDate = date
      endDate = date
    }

    // Build where clause
    const where: any = { status: 'completed' }
    if (startDate && endDate) {
      if (startDate === endDate) {
        where.date = startDate
      } else {
        where.date = { gte: startDate, lte: endDate }
      }
    }

    // Get completed invoices for the date range
    const invoices = await db.invoice.findMany({
      where,
      include: { items: true },
    })

    const totalGrossSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
    const totalCashCollected = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0)
    const totalNetProfit = invoices.reduce((sum, inv) => sum + inv.calculatedNetProfit, 0)

    // Get last 7 days trend
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayInvoices = await db.invoice.findMany({
        where: { status: 'completed', date: dateStr },
      })
      trend.push({
        date: dateStr,
        sales: dayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
        profit: dayInvoices.reduce((sum, inv) => sum + inv.calculatedNetProfit, 0),
        count: dayInvoices.length,
      })
    }

    return NextResponse.json({
      date: startDate || 'all',
      range,
      totalGrossSales,
      totalCashCollected,
      totalOutstanding,
      totalNetProfit,
      invoiceCount: invoices.length,
      trend,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
