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

    // Generate sequential invoice ID
    const counter = await db.counter.upsert({
      where: { name: 'invoice' },
      update: { value: { increment: 1 } },
      create: { name: 'invoice', value: 1 },
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
        mobileName,
        subtotal: subtotal || 0,
        discount: discount || 0,
        grandTotal: grandTotal || 0,
        amountPaid: amountPaid || 0,
        balanceDue: balanceDue || 0,
        calculatedNetProfit: calculatedNetProfit || 0,
        paymentStatus: paymentStatus || (balanceDue > 0 ? 'Partial' : 'Paid'),
        status: status || 'pending',
        updatedBy: updatedBy || 'operator_primary',
        items: {
          create: items?.map((item: any) => ({
            description: item.description,
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
          })) || [],
        },
      },
      include: { items: true },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
