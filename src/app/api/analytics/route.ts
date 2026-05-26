import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get all completed invoices for the date
    const invoices = await db.invoice.findMany({
      where: { status: 'completed', date },
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
      date,
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
