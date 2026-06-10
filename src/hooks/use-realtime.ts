'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { getOfflineInvoices, deleteOfflineInvoice, isOnline } from '@/lib/offline'

// On Vercel/serverless, WebSocket (Socket.io) is not available
// The hook gracefully degrades — isConnected stays false, 
// but all other functionality (fetch, backup, restore) works via HTTP

export function useRealtime() {
  const [isConnected] = useState(false)
  const [lastEvent] = useState<any>(null)

  const syncOfflineInvoices = useCallback(async () => {
    if (!isOnline()) return
    try {
      const offlineInvoices = await getOfflineInvoices()
      for (const inv of offlineInvoices) {
        if (inv.syncStatus === 'pending') {
          try {
            const res = await fetch('/api/invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerName: inv.customerName,
                customerPhone: inv.customerPhone || null,
                mobileName: inv.mobileName,
                items: inv.items,
                subtotal: inv.subtotal,
                discount: inv.discount,
                grandTotal: inv.grandTotal,
                amountPaid: inv.amountPaid,
                balanceDue: inv.balanceDue,
                calculatedNetProfit: inv.calculatedNetProfit,
                paymentStatus: inv.paymentStatus,
                status: inv.status,
                updatedBy: inv.updatedBy,
                tempId: inv.tempId,
              }),
            })
            if (res.ok) {
              await deleteOfflineInvoice(inv.id)
            }
          } catch (e) {
            console.error('Failed to sync offline invoice:', e)
          }
        }
      }
    } catch (e) {
      console.error('Error during offline sync:', e)
    }
  }, [])

  // Try to connect to WebSocket (only works when sync-service is running)
  useEffect(() => {
    let socket: any = null

    const tryConnect = async () => {
      try {
        // Dynamically import socket.io-client — fails gracefully if not available
        const { io } = await import('socket.io-client')
        socket = io('/?XTransformPort=3003', {
          transports: ['websocket', 'polling'],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
        })

        socket.on('connect', () => {
          syncOfflineInvoices()
        })
      } catch (e) {
        // Socket.io not available (Vercel/serverless) — that's OK
        console.log('WebSocket not available, using HTTP-only mode')
      }
    }

    tryConnect()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [syncOfflineInvoices])

  const emitChange = (_event: any) => {
    // No-op when WebSocket is not available
    // Data sync happens via auto-backup/restore through HTTP
  }

  const requestRefresh = () => {
    // No-op when WebSocket is not available
    // Components handle their own data fetching
  }

  return { isConnected, lastEvent, emitChange, requestRefresh, syncOfflineInvoices }
}
