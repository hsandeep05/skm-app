import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Export all completed bills as JSON for CSV backup
export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      where: { status: 'completed' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    // Convert to CSV-friendly format
    const csvRows = invoices.map(inv => ({
      InvoiceId: inv.invoiceId,
      Date: inv.date,
      CustomerName: inv.customerName,
      CustomerPhone: inv.customerPhone || '',
      MobileName: inv.mobileName,
      Items: inv.items.map(i => `${i.description}(${i.sellingPrice})`).join('; '),
      Subtotal: inv.subtotal,
      Discount: inv.discount,
      GrandTotal: inv.grandTotal,
      AmountPaid: inv.amountPaid,
      BalanceDue: inv.balanceDue,
      NetProfit: inv.calculatedNetProfit,
      PaymentStatus: inv.paymentStatus,
    }))

    return NextResponse.json({ invoices: csvRows, total: csvRows.length })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

// Restore from CSV/JSON data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoices } = body

    if (!Array.isArray(invoices)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    let restored = 0
    for (const inv of invoices) {
      try {
        await db.invoice.create({
          data: {
            invoiceId: inv.invoiceId || inv.InvoiceId,
            date: inv.date || inv.Date || new Date().toISOString().split('T')[0],
            customerName: inv.customerName || inv.CustomerName || 'Walk-in Customer',
            customerPhone: inv.customerPhone || inv.CustomerPhone || null,
            mobileName: inv.mobileName || inv.MobileName || 'Unknown',
            subtotal: inv.subtotal || inv.Subtotal || 0,
            discount: inv.discount || inv.Discount || 0,
            grandTotal: inv.grandTotal || inv.GrandTotal || 0,
            amountPaid: inv.amountPaid || inv.AmountPaid || 0,
            balanceDue: inv.balanceDue || inv.BalanceDue || 0,
            calculatedNetProfit: inv.calculatedNetProfit || inv.NetProfit || 0,
            paymentStatus: inv.paymentStatus || inv.PaymentStatus || 'Paid',
            status: 'completed',
            items: {
              create: inv.items?.map((item: any) => ({
                description: item.description,
                costPrice: item.costPrice || 0,
                sellingPrice: item.sellingPrice || 0,
              })) || [],
            },
          },
        })
        restored++
      } catch (e) {
        console.error('Error restoring invoice:', e)
      }
    }

    return NextResponse.json({ restored, total: invoices.length })
  } catch (error) {
    console.error('Error restoring data:', error)
    return NextResponse.json({ error: 'Failed to restore data' }, { status: 500 })
  }
}
