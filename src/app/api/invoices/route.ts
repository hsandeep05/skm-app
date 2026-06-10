import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { mobileName: { contains: search } },
        { invoiceId: { contains: search } },
      ]
    }

    const invoices = await db.invoice.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// Helper to sanitize numeric values (handle NaN, undefined, null)
function safeNumber(value: any, defaultValue = 0): number {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      customerPhone,
      mobileName,
      items,
      subtotal,
      discount,
      grandTotal,
      amountPaid,
      balanceDue,
      calculatedNetProfit,
      paymentStatus,
      status,
      updatedBy,
      tempId,
      date,
    } = body

    // Generate sequential invoice ID with counter sync safety
    // First, ensure counter is in sync with the max existing invoiceId
    const maxInvoice = await db.invoice.findFirst({
      where: { invoiceId: { startsWith: 'SRI' } },
      orderBy: { invoiceId: 'desc' },
      select: { invoiceId: true },
    })

    let nextValue = 1
    if (maxInvoice?.invoiceId) {
      const maxNum = parseInt(maxInvoice.invoiceId.replace('SRI', ''), 10)
      if (!isNaN(maxNum)) {
        nextValue = maxNum + 1
      }
    }

    // Update counter to be at least nextValue (handles desync after redeploy/restore)
    const counter = await db.counter.upsert({
      where: { name: 'invoice' },
      update: { value: nextValue },
      create: { name: 'invoice', value: nextValue },
    })

    const invoiceId = `SRI${String(counter.value).padStart(5, '0')}`

    const invoice = await db.invoice.create({
      data: {
        invoiceId,
        tempId: tempId || null,
        syncStatus: 'synced',
        date: date || new Date().toISOString().split('T')[0],
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || null,
        mobileName: mobileName || 'Unknown',
        subtotal: safeNumber(subtotal),
        discount: safeNumber(discount),
        grandTotal: safeNumber(grandTotal),
        amountPaid: safeNumber(amountPaid),
        balanceDue: safeNumber(balanceDue),
        calculatedNetProfit: safeNumber(calculatedNetProfit),
        paymentStatus: paymentStatus || (safeNumber(balanceDue) > 0 ? 'Partial' : 'Paid'),
        status: status || 'pending',
        updatedBy: updatedBy || 'operator_primary',
        items: {
          create: items?.map((item: any) => ({
            description: item.description || 'Item',
            costPrice: safeNumber(item.costPrice),
            sellingPrice: safeNumber(item.sellingPrice),
          })) || [],
        },
      },
      include: { items: true },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({
      error: 'Failed to create invoice',
      detail: error?.message || String(error),
    }, { status: 500 })
  }
}
