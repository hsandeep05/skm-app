import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    } = body

    await db.invoiceItem.deleteMany({ where: { invoiceId: id } })

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        customerName,
        customerPhone,
        mobileName,
        subtotal,
        discount,
        grandTotal,
        amountPaid,
        balanceDue,
        calculatedNetProfit,
        paymentStatus,
        status,
        updatedBy,
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

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await db.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
