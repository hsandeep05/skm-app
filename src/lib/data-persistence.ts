// Data Persistence Layer - Auto-backup to localStorage & auto-restore from localStorage
// This ensures data survives server database resets (sandbox rebuilds, etc.)

const BACKUP_KEY = 'skm_data_backup'
const BACKUP_TIMESTAMP_KEY = 'skm_backup_timestamp'
const BACKUP_VERSION_KEY = 'skm_backup_version'
const CURRENT_VERSION = 2

export interface FullBackup {
  version: number
  timestamp: string
  invoices: any[]
  invoiceItems: any[]
  users: any[]
  counters: any[]
  settings: any[]
}

/**
 * Save a full backup to localStorage
 */
export function saveBackupToLocal(data: FullBackup): void {
  try {
    const serialized = JSON.stringify(data)
    localStorage.setItem(BACKUP_KEY, serialized)
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString())
    localStorage.setItem(BACKUP_VERSION_KEY, String(CURRENT_VERSION))
  } catch (err) {
    console.error('Failed to save backup to localStorage:', err)
    // localStorage might be full - try to clear old data and retry
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      try {
        // Remove the old backup and try again
        localStorage.removeItem(BACKUP_KEY)
        const serialized = JSON.stringify(data)
        localStorage.setItem(BACKUP_KEY, serialized)
        localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString())
      } catch (retryErr) {
        console.error('Still failed after clearing old backup:', retryErr)
      }
    }
  }
}

/**
 * Load backup from localStorage
 */
export function loadBackupFromLocal(): FullBackup | null {
  try {
    const serialized = localStorage.getItem(BACKUP_KEY)
    if (!serialized) return null

    const data = JSON.parse(serialized) as FullBackup
    if (!data.version || !data.timestamp) return null

    return data
  } catch (err) {
    console.error('Failed to load backup from localStorage:', err)
    return null
  }
}

/**
 * Get the timestamp of the last backup
 */
export function getLastBackupTime(): string | null {
  return localStorage.getItem(BACKUP_TIMESTAMP_KEY)
}

/**
 * Clear the backup from localStorage
 */
export function clearBackupFromLocal(): void {
  localStorage.removeItem(BACKUP_KEY)
  localStorage.removeItem(BACKUP_TIMESTAMP_KEY)
  localStorage.removeItem(BACKUP_VERSION_KEY)
}

/**
 * Fetch full backup from server API
 */
export async function fetchFullBackupFromServer(): Promise<FullBackup | null> {
  try {
    const res = await fetch('/api/backup')
    if (res.ok) {
      const data = await res.json()
      return data.backup as FullBackup
    }
    return null
  } catch (err) {
    console.error('Failed to fetch backup from server:', err)
    return null
  }
}

/**
 * Restore backup to server API
 */
export async function restoreBackupToServer(backup: FullBackup): Promise<{ success: boolean; restored: { invoices: number; users: number; settings: number } }> {
  try {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup),
    })
    if (res.ok) {
      return await res.json()
    }
    return { success: false, restored: { invoices: 0, users: 0, settings: 0 } }
  } catch (err) {
    console.error('Failed to restore backup to server:', err)
    return { success: false, restored: { invoices: 0, users: 0, settings: 0 } }
  }
}

/**
 * Check if server database appears to be reset (empty)
 */
export async function isServerDatabaseEmpty(): Promise<boolean> {
  try {
    const res = await fetch('/api/backup')
    if (res.ok) {
      const data = await res.json()
      const backup = data.backup as FullBackup
      // If no invoices and no users (except the seeded admin), database is likely reset
      const hasOnlySeededAdmin = backup.users.length <= 1
      return backup.invoices.length === 0 && hasOnlySeededAdmin
    }
    return false
  } catch {
    return false
  }
}

/**
 * Perform a complete auto-backup: fetch from server, save to localStorage
 */
export async function performAutoBackup(): Promise<boolean> {
  try {
    const backup = await fetchFullBackupFromServer()
    if (backup) {
      saveBackupToLocal(backup)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Perform a complete auto-restore: load from localStorage, restore to server
 */
export async function performAutoRestore(): Promise<{ success: boolean; restored: { invoices: number; users: number; settings: number } }> {
  try {
    const backup = loadBackupFromLocal()
    if (!backup) {
      return { success: false, restored: { invoices: 0, users: 0, settings: 0 } }
    }

    const result = await restoreBackupToServer(backup)
    
    // After restoring, do a fresh backup to sync everything
    if (result.success) {
      await performAutoBackup()
    }
    
    return result
  } catch {
    return { success: false, restored: { invoices: 0, users: 0, settings: 0 } }
  }
}

/**
 * Smart sync: compare server data with localStorage backup and restore if needed
 * Returns true if a restore was performed
 */
export async function smartSync(): Promise<{ restored: boolean; invoiceCount: number; userCount: number }> {
  try {
    // Get current server state
    const serverBackup = await fetchFullBackupFromServer()
    const localBackup = loadBackupFromLocal()

    if (!localBackup) {
      // No local backup, nothing to restore from
      return { restored: false, invoiceCount: 0, userCount: 0 }
    }

    if (!serverBackup) {
      // Can't reach server, skip
      return { restored: false, invoiceCount: 0, userCount: 0 }
    }

    // Check if server has less data than local backup
    const serverInvoiceCount = serverBackup.invoices.length
    const localInvoiceCount = localBackup.invoices.length
    const serverUserCount = serverBackup.users.length
    const localUserCount = localBackup.users.length

    // If server has significantly less data, it was likely reset
    if (localInvoiceCount > serverInvoiceCount || localUserCount > serverUserCount) {
      // Merge: keep all server data + add back any missing from local
      const result = await restoreBackupToServer(localBackup)
      return { 
        restored: result.success, 
        invoiceCount: result.restored.invoices, 
        userCount: result.restored.users 
      }
    }

    // Server is up to date, just refresh the local backup
    saveBackupToLocal(serverBackup)
    return { restored: false, invoiceCount: serverInvoiceCount, userCount: serverUserCount }
  } catch {
    return { restored: false, invoiceCount: 0, userCount: 0 }
  }
}
