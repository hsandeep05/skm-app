'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Upload,
  LogOut,
  Mail,
  Info,
  CheckCircle,
  Sun,
  Moon,
  Shield,
  Plus,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Monitor,
  AlertTriangle,
  Database,
  Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'
import { useToast } from '@/hooks/use-toast'

interface SettingsPageProps {
  currentUser?: {
    id: string
    username: string
    role: string
    counterName: string | null
  } | null
  onLogout?: () => void
  stickyBottomBar?: boolean
  onStickyBottomBarChange?: (value: boolean) => void
}

interface UserItem {
  id: string
  username: string
  role: string
  counterName: string | null
  createdAt: string
}

export function SettingsPage({ currentUser, onLogout, stickyBottomBar = true, onStickyBottomBarChange }: SettingsPageProps) {
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  // Hidden admin panel state
  const [tapCount, setTapCount] = useState(0)
  const [showAdmin, setShowAdmin] = useState(false)
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Admin panel states
  const [users, setUsers] = useState<UserItem[]>([])
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('operator')
  const [newCounterName, setNewCounterName] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Clear data states
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearAdminPassword, setClearAdminPassword] = useState('')
  const [showClearPassword, setShowClearPassword] = useState(false)
  const [clearingData, setClearingData] = useState(false)

  // Hidden tap to reveal admin
  const handleVersionTap = () => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)

    const newCount = tapCount + 1
    setTapCount(newCount)

    if (newCount >= 5) {
      setShowAdmin(true)
      setTapCount(0)
      if (currentUser?.role === 'admin') {
        fetchUsers()
      }
      toast({ title: 'Admin Panel Unlocked', description: 'You now have access to user management' })
    } else {
      tapTimerRef.current = setTimeout(() => setTapCount(0), 2000)
    }
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/auth/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (showAdmin && currentUser?.role === 'admin') {
      fetchUsers()
    }
  }, [showAdmin, currentUser?.role])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          counterName: newCounterName || null,
          adminPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({ title: 'User Created', description: `Account "${newUsername}" has been created` })
        setNewUsername('')
        setNewPassword('')
        setNewRole('operator')
        setNewCounterName('')
        setAdminPassword('')
        setShowNewUserForm(false)
        fetchUsers()
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' })
    } finally {
      setCreatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      const res = await fetch(`/api/auth/users?id=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Deleted', description: `User "${username}" has been removed` })
        fetchUsers()
      } else {
        const data = await res.json()
        toast({ title: 'Failed', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' })
    }
    setDeleteConfirmId(null)
  }

  const handleClearAllData = async () => {
    if (!clearAdminPassword) {
      toast({ title: 'Password Required', description: 'Enter your admin password to clear all data', variant: 'destructive' })
      return
    }
    setClearingData(true)
    try {
      const res = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: clearAdminPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Data Cleared', description: `Deleted ${data.deletedInvoices} invoices. All data reset to zero.` })
        setShowClearConfirm(false)
        setClearAdminPassword('')
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to clear data', variant: 'destructive' })
    } finally {
      setClearingData(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const { invoices } = await res.json()
        if (!invoices || invoices.length === 0) {
          toast({ title: 'No Data', description: 'No completed bills to export' })
          return
        }

        const headers = Object.keys(invoices[0])
        const csvRows = [
          headers.join(','),
          ...invoices.map((inv: any) =>
            headers
              .map((h) => {
                const val = inv[h]
                if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                  return `"${val.replace(/"/g, '""')}"`
                }
                return String(val ?? '')
              })
              .join(',')
          ),
        ]
        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `sri-krishna-mobiles-backup-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(link.href)

        toast({ title: 'Export Complete', description: `${invoices.length} bills exported as CSV` })
      } else {
        throw new Error('Export failed')
      }
    } catch (err) {
      console.error('Export error:', err)
      toast({ title: 'Export Failed', description: 'Could not export data. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const handleRestoreCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoring(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        toast({ title: 'Invalid File', description: 'CSV file appears to be empty or invalid', variant: 'destructive' })
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      const rows = lines.slice(1).map((line) => {
        const values: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            inQuotes = !inQuotes
          } else if (ch === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
        values.push(current.trim())
        const obj: any = {}
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || ''
        })
        return obj
      })

      const invoices = rows
        .filter((row) => row.InvoiceId || row.invoiceId)
        .map((row) => {
          const itemsStr = row.Items || row.items || ''
          const items = itemsStr
            ? itemsStr.split('; ').map((itemStr: string) => {
                const match = itemStr.match(/^(.+)\((\d+(?:\.\d+)?)\)$/)
                return match
                  ? { description: match[1], costPrice: 0, sellingPrice: parseFloat(match[2]) }
                  : { description: itemStr, costPrice: 0, sellingPrice: 0 }
              })
            : []

          return {
            invoiceId: row.InvoiceId || row.invoiceId,
            date: row.Date || row.date,
            customerName: row.CustomerName || row.customerName || 'Walk-in Customer',
            customerPhone: row.CustomerPhone || row.customerPhone || null,
            mobileName: row.MobileName || row.mobileName || 'Unknown',
            subtotal: parseFloat(row.Subtotal || row.subtotal) || 0,
            discount: parseFloat(row.Discount || row.discount) || 0,
            grandTotal: parseFloat(row.GrandTotal || row.grandTotal) || 0,
            amountPaid: parseFloat(row.AmountPaid || row.amountPaid) || 0,
            balanceDue: parseFloat(row.BalanceDue || row.balanceDue) || 0,
            calculatedNetProfit: parseFloat(row.NetProfit || row.calculatedNetProfit) || 0,
            paymentStatus: row.PaymentStatus || row.paymentStatus || 'Paid',
            items,
          }
        })
        .filter((inv) => inv.invoiceId)

      if (invoices.length === 0) {
        toast({ title: 'No Valid Data', description: 'No valid invoice records found in the CSV', variant: 'destructive' })
        return
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices }),
      })

      if (res.ok) {
        const result = await res.json()
        toast({ title: 'Restore Complete', description: `${result.restored} of ${result.total} invoices restored` })
      } else {
        throw new Error('Restore failed')
      }
    } catch (err) {
      console.error('Restore error:', err)
      toast({ title: 'Restore Failed', description: 'Could not restore data. Please check the file format.', variant: 'destructive' })
    } finally {
      setRestoring(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#7C3AED]/25 bg-card hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7C3AED] to-[#A78BFA]" />
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }}
          />
          <div className="p-5 pl-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center shadow-[0_0_12px_-3px_#7C3AED40]">
                <Mail className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Profile</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Your account details</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#7C3AED]/25 to-[#A78BFA]/15 flex items-center justify-center shadow-[0_0_16px_-4px_#7C3AED30]">
                  <span className="text-[#7C3AED] font-bold text-xl">
                    {(currentUser?.username || 'O')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">{currentUser?.username || 'operator_primary'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] font-bold">
                      {currentUser?.role === 'admin' ? 'Admin' : 'Operator'}
                    </span>
                    <span>•</span>
                    <span>{currentUser?.counterName || 'Main Counter'}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 gap-1.5 transition-all duration-200 shadow-sm"
                onClick={onLogout}
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Theme Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#7C3AED]/25 bg-card hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7C3AED] to-[#A78BFA]" />
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }}
          />
          <div className="p-5 pl-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center shadow-[0_0_12px_-3px_#7C3AED40]">
                <Monitor className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Appearance</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Choose your preferred theme</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className={`flex-1 gap-2 h-11 transition-all duration-300 ${
                  theme === 'light'
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[0_0_24px_-6px_#7C3AED60,0_0_8px_-2px_#7C3AED30] ring-1 ring-[#7C3AED]/30'
                    : 'border-border text-foreground hover:bg-muted hover:border-[#7C3AED]/30'
                }`}
                onClick={() => setTheme('light')}
              >
                <Sun className={`h-4 w-4 transition-transform duration-300 ${theme === 'light' ? 'scale-110 rotate-12' : ''}`} />
                Light Mode
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className={`flex-1 gap-2 h-11 transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[0_0_24px_-6px_#7C3AED60,0_0_8px_-2px_#7C3AED30] ring-1 ring-[#7C3AED]/30'
                    : 'border-border text-foreground hover:bg-muted hover:border-[#7C3AED]/30'
                }`}
                onClick={() => setTheme('dark')}
              >
                <Moon className={`h-4 w-4 transition-transform duration-300 ${theme === 'dark' ? 'scale-110 -rotate-12' : ''}`} />
                Dark Mode
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sticky Bottom Bar Toggle - Mobile Only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.07 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#06B6D4]/25 bg-card hover:-translate-y-0.5 transition-all duration-300 md:hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#06B6D4] to-[#22D3EE]" />
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
            style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }}
          />
          <div className="p-5 pl-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#06B6D4]/15 flex items-center justify-center shadow-[0_0_12px_-3px_#06B6D440]">
                  <Navigation className="h-5 w-5 text-[#06B6D4]" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-base">Sticky Bottom Bar</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Keep navigation bar visible while scrolling</p>
                </div>
              </div>
              <Button
                variant={stickyBottomBar ? 'default' : 'outline'}
                className={`gap-2 h-9 transition-all duration-300 ${
                  stickyBottomBar
                    ? 'bg-[#06B6D4] hover:bg-[#0891B2] text-white shadow-[0_0_12px_-4px_#06B6D440]'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
                onClick={() => onStickyBottomBarChange?.(!stickyBottomBar)}
              >
                {stickyBottomBar ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Backup & Sync Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#10B981]/25 bg-card hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-[#34D399]" />
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
            style={{ background: 'radial-gradient(circle, #10B981, transparent 70%)' }}
          />
          <div className="p-5 pl-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center shadow-[0_0_12px_-3px_#10B98140]">
                <Download className="h-5 w-5 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Backup & Restore</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Export or import your data</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 border-[#7C3AED]/40 text-[#A78BFA] hover:bg-[#7C3AED]/10 hover:border-[#7C3AED]/60 hover:text-foreground gap-2.5 transition-all duration-200 shadow-sm"
                onClick={handleExportCSV}
                disabled={exporting}
              >
                <Download className="h-4.5 w-4.5" />
                {exporting ? 'Exporting...' : 'Sync Completed Bills to Sheet'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 border-[#10B981]/40 text-[#34D399] hover:bg-[#10B981]/10 hover:border-[#10B981]/60 hover:text-foreground gap-2.5 transition-all duration-200 shadow-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
              >
                <Upload className="h-4.5 w-4.5" />
                {restoring ? 'Restoring...' : 'Restore from CSV'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleRestoreCSV}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Export all completed bills as a CSV file for backup or spreadsheet import.
              Restore previously exported data from a CSV file.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Clear All Data Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#EF4444]/25 bg-card hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#EF4444] to-[#F87171]" />
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
            style={{ background: 'radial-gradient(circle, #EF4444, transparent 70%)' }}
          />
          <div className="p-5 pl-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#EF4444]/15 flex items-center justify-center shadow-[0_0_12px_-3px_#EF444440]">
                <Database className="h-5 w-5 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Clear All Data</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Reset all invoices and amounts to zero</p>
              </div>
            </div>

            {!showClearConfirm ? (
              <Button
                variant="outline"
                className="w-full h-11 border-[#EF4444]/40 text-[#F87171] hover:bg-[#EF4444]/10 hover:border-[#EF4444]/60 hover:text-foreground gap-2.5 transition-all duration-200 shadow-sm"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="h-4.5 w-4.5" /> Clear All Invoice Data
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background rounded-xl p-4 border border-[#EF4444]/20 space-y-3 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[#EF4444]">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm font-bold">This will permanently delete ALL invoice data!</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This action cannot be undone. All invoices, items, and counters will be deleted. Please backup first if needed.
                </p>
                <div>
                  <Label className="text-destructive text-[10px] font-medium flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Admin Password (required)
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showClearPassword ? 'text' : 'password'}
                      value={clearAdminPassword}
                      onChange={(e) => setClearAdminPassword(e.target.value)}
                      placeholder="Enter your admin password"
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground/60 h-9 text-sm pr-10 focus:border-[#EF4444]/50 focus:ring-1 focus:ring-[#EF4444]/20 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClearPassword(!showClearPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showClearPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-border text-foreground hover:bg-muted gap-1 text-sm h-9"
                    onClick={() => {
                      setShowClearConfirm(false)
                      setClearAdminPassword('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-1 text-sm h-9"
                    disabled={clearingData || !clearAdminPassword}
                    onClick={handleClearAllData}
                  >
                    {clearingData ? (
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {clearingData ? 'Clearing...' : 'Clear All Data'}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Hidden Admin Panel - User Management */}
      <AnimatePresence>
        {showAdmin && currentUser?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-[#EF4444]/25 bg-card hover:-translate-y-0.5 transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#EF4444] to-[#F87171]" />
              <div
                className="absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-[0.08] dark:opacity-[0.12] pointer-events-none blur-2xl"
                style={{ background: 'radial-gradient(circle, #EF4444, transparent 70%)' }}
              />
              <div
                className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-[0.04] dark:opacity-[0.06] pointer-events-none blur-2xl"
                style={{ background: 'radial-gradient(circle, #EF4444, transparent 70%)' }}
              />
              <div className="p-5 pl-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#EF4444]/15 flex items-center justify-center shadow-[0_0_12px_-3px_#EF444440]">
                      <Shield className="h-5 w-5 text-[#EF4444]" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-bold text-base">User Management</h3>
                      <p className="text-[#EF4444]/70 text-xs mt-0.5 font-medium">Admin only • Tap version 5 times to unlock</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdmin(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Hide
                  </Button>
                </div>

                {/* Existing Users */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Registered Users ({users.length})
                    </span>
                  </div>

                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-[#7C3AED] border-t-transparent rounded-full" />
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-4">No users found</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between bg-background rounded-xl p-3 border border-border hover:border-[#EF4444]/20 transition-all duration-200"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm ${
                              u.role === 'admin'
                                ? 'bg-gradient-to-br from-[#7C3AED]/25 to-[#A78BFA]/15 text-[#7C3AED]'
                                : 'bg-gradient-to-br from-[#3B82F6]/25 to-[#60A5FA]/15 text-[#3B82F6]'
                            }`}>
                              {u.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-foreground text-xs font-semibold">{u.username}</p>
                              <p className="text-muted-foreground text-[10px] flex items-center gap-1">
                                <span className={`inline-flex items-center px-1 py-0 rounded text-[9px] font-bold ${
                                  u.role === 'admin' ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'bg-[#3B82F6]/10 text-[#3B82F6]'
                                }`}>
                                  {u.role === 'admin' ? 'Admin' : 'Operator'}
                                </span>
                                <span>•</span>
                                <span>{u.counterName || 'No counter'}</span>
                              </p>
                            </div>
                          </div>
                          {u.id !== currentUser?.id && (
                            deleteConfirmId === u.id ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] text-muted-foreground hover:text-foreground px-2"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  No
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-[10px] px-2 gap-1"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                >
                                  <AlertTriangle className="h-3 w-3" /> Delete
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                                onClick={() => setDeleteConfirmId(u.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New User */}
                {!showNewUserForm ? (
                  <Button
                    variant="outline"
                    className="w-full h-11 border-[#7C3AED]/40 text-[#A78BFA] hover:bg-[#7C3AED]/10 hover:border-[#7C3AED]/60 hover:text-foreground gap-2 transition-all duration-200 shadow-sm"
                    onClick={() => setShowNewUserForm(true)}
                  >
                    <Plus className="h-4 w-4" /> Add New Counter / User
                  </Button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleCreateUser}
                    className="bg-background rounded-xl p-4 border border-[#7C3AED]/20 space-y-3 shadow-sm"
                  >
                    <h4 className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-[#7C3AED]" /> New User Credentials
                    </h4>
                    <div>
                      <Label className="text-muted-foreground text-[10px] font-medium">Username</Label>
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g., counter2"
                        required
                        className="bg-card border-border text-foreground placeholder:text-muted-foreground/60 h-9 text-sm focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/20 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[10px] font-medium">Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 4 characters"
                        required
                        className="bg-card border-border text-foreground placeholder:text-muted-foreground/60 h-9 text-sm focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/20 transition-all duration-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-muted-foreground text-[10px] font-medium">Role</Label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="w-full h-9 text-sm bg-card border border-border text-foreground rounded-md px-2 focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/20 transition-all duration-200"
                        >
                          <option value="operator">Operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[10px] font-medium">Counter Name</Label>
                        <Input
                          value={newCounterName}
                          onChange={(e) => setNewCounterName(e.target.value)}
                          placeholder="e.g., Counter 2"
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground/60 h-9 text-sm focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                    <Separator className="bg-border" />
                    <div>
                      <Label className="text-destructive text-[10px] font-medium flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Your Admin Password (required)
                      </Label>
                      <div className="relative">
                        <Input
                          type={showAdminPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Enter your admin password"
                          required
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground/60 h-9 text-sm pr-10 focus:border-[#EF4444]/50 focus:ring-1 focus:ring-[#EF4444]/20 transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showAdminPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-border text-foreground hover:bg-muted gap-1 text-sm h-9"
                        onClick={() => {
                          setShowNewUserForm(false)
                          setNewUsername('')
                          setNewPassword('')
                          setNewRole('operator')
                          setNewCounterName('')
                          setAdminPassword('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-1 text-sm h-9 shadow-[0_0_12px_-4px_#7C3AED40]"
                        disabled={creatingUser}
                      >
                        {creatingUser ? (
                          <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {creatingUser ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </motion.form>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Info - With hidden tap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#3B82F6]/25 bg-card hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#3B82F6] to-[#60A5FA]" />
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
            style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }}
          />
          <div className="p-5 pl-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#3B82F6]/15 flex items-center justify-center shadow-[0_0_12px_-3px_#3B82F640]">
                <Info className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">App Info</h3>
                <p className="text-muted-foreground text-xs mt-0.5">About this application</p>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { label: 'App Name', value: 'Sri Krishna Mobiles Bill Generator', isVersion: false },
                { label: 'Version', value: '1.0.0', isVersion: true },
                { label: 'Framework', value: 'Next.js 16', isVersion: false },
                { label: 'Database', value: 'SQLite (Prisma)', isVersion: false },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between text-sm py-2.5 ${
                    idx < 3 ? 'border-b border-border/50' : ''
                  }`}
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  {item.isVersion ? (
                    <span
                      className="text-foreground font-semibold cursor-pointer select-none hover:text-[#7C3AED] transition-colors duration-200 px-2 py-0.5 rounded-md hover:bg-[#7C3AED]/5"
                      onClick={handleVersionTap}
                      title={tapCount > 0 ? `${5 - tapCount} more tap${5 - tapCount > 1 ? 's' : ''} to unlock admin` : ''}
                    >
                      {item.value}
                    </span>
                  ) : (
                    <span className="text-foreground font-medium">{item.value}</span>
                  )}
                </div>
              ))}
              <div className={`flex items-center justify-between text-sm py-2.5`}>
                <span className="text-muted-foreground">Sync</span>
                <span className="text-foreground font-medium flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-[#10B981]" /> Real-time (WebSocket)
                </span>
              </div>
            </div>
            <Separator className="bg-border/50 my-3" />
            <p className="text-xs text-center font-medium">
              <span className="text-muted-foreground">Built with </span>
              <span className="text-[#EF4444]">&#10084;&#65039;</span>
              <span className="text-muted-foreground"> for </span>
              <span className="text-foreground font-semibold">Sri Krishna Mobiles</span>
              <span className="text-muted-foreground">, Narayanpet</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
