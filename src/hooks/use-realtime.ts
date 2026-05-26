'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getOfflineInvoices, deleteOfflineInvoice, isOnline } from '@/lib/offline'

export function useRealtime() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<any>(null)

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

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      // Sync offline invoices when connection is restored
      syncOfflineInvoices()
    })
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('invoice-change', (event: any) => setLastEvent(event))
    socket.on('force-refresh', () => setLastEvent({ type: 'force-refresh' }))

    return () => { socket.disconnect() }
  }, [syncOfflineInvoices])

  const emitChange = (event: any) => {
    socketRef.current?.emit('invoice-change', event)
  }

  const requestRefresh = () => {
    socketRef.current?.emit('force-refresh')
  }

  return { isConnected, lastEvent, emitChange, requestRefresh, syncOfflineInvoices }
}
