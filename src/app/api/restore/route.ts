import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/restore - Import ALL data from a backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoices, invoiceItems, users, counters, settings } = body

    if (!invoices && !users) {
      return NextResponse.json({ error: 'No data to restore' }, { status: 400 })
    }

    let restoredInvoices = 0
    let restoredUsers = 0
    let restoredSettings = 0

    // Restore settings first (shop name, address, logo, etc.)
    if (settings && Array.isArray(settings)) {
      for (const setting of settings) {
        try {
          await db.setting.upsert({
            where: { key: setting.key },
            update: { value: setting.value },
            create: { key: setting.key, value: setting.value },
          })
          restoredSettings++
        } catch (e) {
          console.error('Error restoring setting:', setting.key, e)
        }
      }
    }

    // Restore counters (for sequential invoice IDs)
    if (counters && Array.isArray(counters)) {
      for (const counter of counters) {
        try {
          await db.counter.upsert({
            where: { name: counter.name },
            update: { value: counter.value },
            create: { name: counter.name, value: counter.value },
          })
        } catch (e) {
          console.error('Error restoring counter:', counter.name, e)
        }
      }
    }

    // Restore users
    if (users && Array.isArray(users)) {
      for (const user of users) {
        try {
          const existingUser = await db.user.findUnique({ where: { username: user.username } })
          if (!existingUser) {
            await db.user.create({
              data: {
                username: user.username,
                password: user.password,
                role: user.role || 'operator',
                counterName: user.counterName || null,
              },
            })
            restoredUsers++
          } else {
            // Update existing user if needed
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                role: user.role || existingUser.role,
                counterName: user.counterName || existingUser.counterName,
                password: user.password || existingUser.password,
              },
            })
            restoredUsers++
          }
        } catch (e) {
          console.error('Error restoring user:', user.username, e)
        }
      }
    }

    // Restore invoices with their items
    if (invoices && Array.isArray(invoices)) {
      for (const inv of invoices) {
        try {
          // Check if invoice already exists by invoiceId
          const existingInvoice = await db.invoice.findUnique({ where: { invoiceId: inv.invoiceId } })
          if (existingInvoice) {
            // Update existing invoice
            await db.invoice.update({
              where: { id: existingInvoice.id },
              data: {
                customerName: inv.customerName,
                customerPhone: inv.customerPhone || null,
                mobileName: inv.mobileName,
                subtotal: inv.subtotal || 0,
                discount: inv.discount || 0,
                grandTotal: inv.grandTotal || 0,
                amountPaid: inv.amountPaid || 0,
                balanceDue: inv.balanceDue || 0,
                calculatedNetProfit: inv.calculatedNetProfit || 0,
                paymentStatus: inv.paymentStatus || 'Pending',
                status: inv.status || 'pending',
              },
            })
            restoredInvoices++
          } else {
            // Find items for this invoice from invoiceItems array
            const invoiceItemsList = invoiceItems?.filter(
              (item: any) => item.invoiceId === inv.id
            ) || inv.items || []

            await db.invoice.create({
              data: {
                invoiceId: inv.invoiceId,
                tempId: inv.tempId || null,
                syncStatus: inv.syncStatus || 'synced',
                date: inv.date || new Date().toISOString().split('T')[0],
                customerName: inv.customerName || 'Walk-in Customer',
                customerPhone: inv.customerPhone || null,
                mobileName: inv.mobileName || 'Unknown',
                subtotal: inv.subtotal || 0,
                discount: inv.discount || 0,
                grandTotal: inv.grandTotal || 0,
                amountPaid: inv.amountPaid || 0,
                balanceDue: inv.balanceDue || 0,
                calculatedNetProfit: inv.calculatedNetProfit || 0,
                paymentStatus: inv.paymentStatus || 'Pending',
                status: inv.status || 'pending',
                updatedBy: inv.updatedBy || 'operator_primary',
                items: {
                  create: invoiceItemsList.map((item: any) => ({
                    description: item.description,
                    costPrice: item.costPrice || 0,
                    sellingPrice: item.sellingPrice || 0,
                  })),
                },
              },
            })
            restoredInvoices++
          }
        } catch (e) {
          console.error('Error restoring invoice:', inv.invoiceId, e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      restored: {
        invoices: restoredInvoices,
        users: restoredUsers,
        settings: restoredSettings,
      },
    })
  } catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: 'Failed to restore data' }, { status: 500 })
  }
}
