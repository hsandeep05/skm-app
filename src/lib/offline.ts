// IndexedDB Offline Storage for offline-first functionality

const DB_NAME = 'SriKrishnaMobiles'
const DB_VERSION = 1

export interface OfflineInvoice {
  id: string
  invoiceId?: string
  tempId: string
  syncStatus: 'synced' | 'pending' | 'conflict'
  date: string
  customerName: string
  customerPhone?: string
  mobileName: string
  items: OfflineInvoiceItem[]
  subtotal: number
  discount: number
  grandTotal: number
  amountPaid: number
  balanceDue: number
  calculatedNetProfit: number
  paymentStatus: string
  status: string
  updatedBy: string
  createdAt: string
}

export interface OfflineInvoiceItem {
  description: string
  costPrice: number
  sellingPrice: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('invoices')) {
        db.createObjectStore('invoices', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
        syncStore.createIndex('status', 'status', { unique: false })
      }
    }
  })
}

export async function saveOfflineInvoice(invoice: OfflineInvoice): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('invoices', 'readwrite')
  const store = tx.objectStore('invoices')
  store.put(invoice)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getOfflineInvoices(): Promise<OfflineInvoice[]> {
  const db = await openDB()
  const tx = db.transaction('invoices', 'readonly')
  const store = tx.objectStore('invoices')
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteOfflineInvoice(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('invoices', 'readwrite')
  const store = tx.objectStore('invoices')
  store.delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function addToSyncQueue(action: { type: string; data: any }): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('syncQueue', 'readwrite')
  const store = tx.objectStore('syncQueue')
  store.add({ ...action, status: 'pending', createdAt: new Date().toISOString() })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getSyncQueue(): Promise<any[]> {
  const db = await openDB()
  const tx = db.transaction('syncQueue', 'readonly')
  const store = tx.objectStore('syncQueue')
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function clearSyncQueue(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('syncQueue', 'readwrite')
  const store = tx.objectStore('syncQueue')
  store.clear()
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function generateTempId(): string {
  return `TEMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
