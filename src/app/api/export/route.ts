import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { status: 'completed' }
    if (startDate && endDate) {
      if (startDate === endDate) {
        where.date = startDate
      } else {
        where.date = { gte: startDate, lte: endDate }
      }
    }

    const invoices = await db.invoice.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    // Generate CSV
    const headers = [
      'Invoice ID',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Mobile Name',
      'Items',
      'Subtotal',
      'Discount',
      'Grand Total',
      'Amount Paid',
      'Balance Due',
      'Net Profit',
      'Payment Status',
    ]

    const rows = invoices.map(inv => [
      inv.invoiceId,
      inv.date,
      inv.customerName,
      inv.customerPhone || '',
      inv.mobileName,
      inv.items.map(i => `${i.description}(₹${i.sellingPrice})`).join('; '),
      inv.subtotal.toFixed(2),
      inv.discount.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.amountPaid.toFixed(2),
      inv.balanceDue.toFixed(2),
      inv.calculatedNetProfit.toFixed(2),
      inv.paymentStatus,
    ])

    // Build CSV string with proper escaping
    const escapeCSV = (val: string | number) => {
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ]

    // Add summary at the bottom
    const totalSales = invoices.reduce((s, i) => s + i.grandTotal, 0)
    const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0)
    const totalDue = invoices.reduce((s, i) => s + i.balanceDue, 0)
    const totalProfit = invoices.reduce((s, i) => s + i.calculatedNetProfit, 0)

    csvLines.push('')
    csvLines.push('Summary')
    csvLines.push(`Total Invoices,${invoices.length}`)
    csvLines.push(`Total Sales,${totalSales.toFixed(2)}`)
    csvLines.push(`Total Paid,${totalPaid.toFixed(2)}`)
    csvLines.push(`Total Due,${totalDue.toFixed(2)}`)
    csvLines.push(`Total Profit,${totalProfit.toFixed(2)}`)

    const csv = csvLines.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="SKM_Bills_${startDate || 'all'}_to_${endDate || 'all'}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
