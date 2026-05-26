import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const weekStart = startOfWeek.toISOString().split('T')[0]
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    // Today's sales
    const todayInvoices = await db.invoice.findMany({
      where: { status: 'completed', date: today },
    })
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)

    // This week's sales
    const weekInvoices = await db.invoice.findMany({
      where: { status: 'completed', date: { gte: weekStart } },
    })
    const weekSales = weekInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)

    // This month's sales
    const monthInvoices = await db.invoice.findMany({
      where: { status: 'completed', date: { gte: startOfMonth } },
    })
    const monthSales = monthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)

    // Pending amount (total balance due across all invoices)
    const allWithBalance = await db.invoice.findMany({
      where: { balanceDue: { gt: 0 } },
    })
    const pendingAmount = allWithBalance.reduce((sum, inv) => sum + inv.balanceDue, 0)

    // Pending bills (drafts)
    const pendingBills = await db.invoice.count({
      where: { status: 'pending' },
    })

    // Today's bills count
    const todayBills = todayInvoices.length

    // Recent completed bills
    const recentBills = await db.invoice.findMany({
      where: { status: 'completed' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      todaySales,
      weekSales,
      monthSales,
      pendingAmount,
      pendingBills,
      todayBills,
      recentBills,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
