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
}

interface UserItem {
  id: string
  username: string
  role: string
  counterName: string | null
  createdAt: string
}

export function SettingsPage({ currentUser, onLogout }: SettingsPageProps) {
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
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return
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
        <div className="overflow-hidden rounded-xl border border-[#7C3AED]/30 bg-card">
          <div className="h-1 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md bg-[#7C3AED]/20 flex items-center justify-center">
                <Mail className="h-3.5 w-3.5 text-[#7C3AED]" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">Profile</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm font-medium">{currentUser?.username || 'operator_primary'}</p>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.role === 'admin' ? 'Admin' : 'Operator'} • {currentUser?.counterName || 'Main Counter'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1"
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
        <div className="overflow-hidden rounded-xl border border-[#7C3AED]/30 bg-card">
          <div className="h-1 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md bg-[#7C3AED]/20 flex items-center justify-center">
                <Monitor className="h-3.5 w-3.5 text-[#7C3AED]" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">Appearance</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className={`flex-1 gap-2 ${theme === 'light' ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white' : 'border-border text-foreground hover:bg-muted'}`}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" /> Light Mode
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className={`flex-1 gap-2 ${theme === 'dark' ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white' : 'border-border text-foreground hover:bg-muted'}`}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" /> Dark Mode
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
        <div className="overflow-hidden rounded-xl border border-[#10B981]/30 bg-card">
          <div className="h-1 bg-gradient-to-r from-[#10B981] to-[#34D399]" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md bg-[#10B981]/20 flex items-center justify-center">
                <Download className="h-3.5 w-3.5 text-[#10B981]" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">Backup & Restore</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#7C3AED]/50 text-[#A78BFA] hover:bg-[#7C3AED]/10 hover:text-foreground gap-2"
                onClick={handleExportCSV}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Sync Completed Bills to Sheet'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-[#10B981]/50 text-[#34D399] hover:bg-[#10B981]/10 hover:text-foreground gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
              >
                <Upload className="h-4 w-4" />
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

      {/* Hidden Admin Panel - User Management */}
      <AnimatePresence>
        {showAdmin && currentUser?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="overflow-hidden rounded-xl border border-[#EF4444]/30 bg-card">
              <div className="h-1 bg-gradient-to-r from-[#EF4444] to-[#F87171]" />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-[#EF4444]/20 flex items-center justify-center">
                      <Shield className="h-3.5 w-3.5 text-[#EF4444]" />
                    </div>
                    <h3 className="text-foreground text-sm font-semibold">User Management (Admin)</h3>
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
                          className="flex items-center justify-between bg-background rounded-lg p-2.5 border border-border"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              u.role === 'admin' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'bg-[#3B82F6]/20 text-[#3B82F6]'
                            }`}>
                              {u.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-foreground text-xs font-medium">{u.username}</p>
                              <p className="text-muted-foreground text-[10px]">
                                {u.role === 'admin' ? 'Admin' : 'Operator'} • {u.counterName || 'No counter'}
                              </p>
                            </div>
                          </div>
                          {u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
                    className="w-full border-[#7C3AED]/50 text-[#A78BFA] hover:bg-[#7C3AED]/10 hover:text-foreground gap-2"
                    onClick={() => setShowNewUserForm(true)}
                  >
                    <Plus className="h-4 w-4" /> Add New Counter / User
                  </Button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleCreateUser}
                    className="bg-background rounded-lg p-4 border border-border space-y-3"
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
                        className="bg-card border-border text-foreground placeholder:text-muted-foreground h-8 text-sm"
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
                        className="bg-card border-border text-foreground placeholder:text-muted-foreground h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-muted-foreground text-[10px] font-medium">Role</Label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="w-full h-8 text-sm bg-card border border-border text-foreground rounded-md px-2"
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
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground h-8 text-sm"
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
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground h-8 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAdminPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-border text-foreground hover:bg-muted gap-1 text-sm"
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
                        className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-1 text-sm"
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
        <div className="overflow-hidden rounded-xl border border-[#3B82F6]/30 bg-card">
          <div className="h-1 bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md bg-[#3B82F6]/20 flex items-center justify-center">
                <Info className="h-3.5 w-3.5 text-[#3B82F6]" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">App Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">App Name</span>
              <span className="text-foreground font-medium">Sri Krishna Mobiles Bill Generator</span>
              <span className="text-muted-foreground">Version</span>
              {/* Tap version 5 times to reveal admin panel */}
              <span
                className="text-foreground font-medium cursor-pointer select-none hover:text-[#7C3AED] transition-colors"
                onClick={handleVersionTap}
                title={tapCount > 0 ? `${5 - tapCount} more tap${5 - tapCount > 1 ? 's' : ''} to unlock admin` : ''}
              >
                1.0.0
              </span>
              <span className="text-muted-foreground">Framework</span>
              <span className="text-foreground font-medium">Next.js 16</span>
              <span className="text-muted-foreground">Database</span>
              <span className="text-foreground font-medium">SQLite (Prisma)</span>
              <span className="text-muted-foreground">Sync</span>
              <span className="text-foreground font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-[#10B981]" /> Real-time (WebSocket)
              </span>
            </div>
            <Separator className="bg-border my-3" />
            <p className="text-xs text-muted-foreground text-center">
              Built with ❤️ for Sri Krishna Mobiles, Narayanpet
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
