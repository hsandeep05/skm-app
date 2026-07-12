import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    // Date range filter
    if (startDate && endDate) {
      if (startDate === endDate) {
        where.date = startDate
      } else {
        where.date = { gte: startDate, lte: endDate }
      }
    } else if (startDate) {
      where.date = { gte: startDate }
    }

    // Get total count for pagination
    const total = await db.invoice.count({ where })

    // Get paginated invoices
    const invoices = await db.invoice.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
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
    const existingInvoices = await db.invoice.findMany({
      where: { invoiceId: { startsWith: 'SRI' } },
      select: { invoiceId: true },
    })

    let nextValue = 1
    if (existingInvoices.length > 0) {
      const maxNum = existingInvoices.reduce((max, inv) => {
        const num = parseInt(inv.invoiceId.replace('SRI', ''), 10)
        return !isNaN(num) && num > max ? num : max
      }, 0)
      nextValue = maxNum + 1
    }

    const invoiceId = `SRI${String(nextValue).padStart(5, '0')}`

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
