'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Download, Upload, LogOut, Mail, Info, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

export function SettingsPage() {
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const { invoices } = await res.json()
        if (!invoices || invoices.length === 0) {
          toast({
            title: 'No Data',
            description: 'No completed bills to export',
          })
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

        toast({
          title: 'Export Complete',
          description: `${invoices.length} bills exported as CSV`,
        })
      } else {
        throw new Error('Export failed')
      }
    } catch (err) {
      console.error('Export error:', err)
      toast({
        title: 'Export Failed',
        description: 'Could not export data. Please try again.',
        variant: 'destructive',
      })
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
        toast({
          title: 'Invalid File',
          description: 'CSV file appears to be empty or invalid',
          variant: 'destructive',
        })
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
        toast({
          title: 'No Valid Data',
          description: 'No valid invoice records found in the CSV',
          variant: 'destructive',
        })
        return
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices }),
      })

      if (res.ok) {
        const result = await res.json()
        toast({
          title: 'Restore Complete',
          description: `${result.restored} of ${result.total} invoices restored`,
        })
      } else {
        throw new Error('Restore failed')
      }
    } catch (err) {
      console.error('Restore error:', err)
      toast({
        title: 'Restore Failed',
        description: 'Could not restore data. Please check the file format.',
        variant: 'destructive',
      })
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
        <div className="overflow-hidden rounded-xl border border-[#7C3AED]/30 bg-[#111827]">
          <div className="h-1 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md bg-[#7C3AED]/20 flex items-center justify-center">
                <Mail className="h-3.5 w-3.5 text-[#7C3AED]" />
              </div>
              <h3 className="text-white text-sm font-semibold">Profile</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">hsandeep799@gmail.com</p>
                <p className="text-xs text-[#94A3B8]">Primary Operator</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/10 gap-1"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
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
        <div className="overflow-hidden rounded-xl border border-[#10B981]/30 bg-[#111827]">
          <div className="h-1 bg-gradient-to-r from-[#10B981] to-[#34D399]" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md bg-[#10B981]/20 flex items-center justify-center">
                <Download className="h-3.5 w-3.5 text-[#10B981]" />
              </div>
              <h3 className="text-white text-sm font-semibold">Backup & Restore</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#7C3AED]/50 text-[#A78BFA] hover:bg-[#7C3AED]/10 hover:text-white gap-2"
                onClick={handleExportCSV}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Sync Completed Bills to Sheet'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-[#10B981]/50 text-[#34D399] hover:bg-[#10B981]/10 hover:text-white gap-2"
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
            <p className="text-xs text-[#64748B] mt-3">
              Export all completed bills as a CSV file for backup or spreadsheet import. 
              Restore previously exported data from a CSV file.
            </p>
          </div>
        </div>
      </motion.div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="overflow-hidden rounded-xl border border-[#3B82F6]/30 bg-[#111827]">
          <div className="h-1 bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md bg-[#3B82F6]/20 flex items-center justify-center">
                <Info className="h-3.5 w-3.5 text-[#3B82F6]" />
              </div>
              <h3 className="text-white text-sm font-semibold">App Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[#94A3B8]">App Name</span>
              <span className="text-white font-medium">Sri Krishna Mobiles Bill Generator</span>
              <span className="text-[#94A3B8]">Version</span>
              <span className="text-white font-medium">1.0.0</span>
              <span className="text-[#94A3B8]">Framework</span>
              <span className="text-white font-medium">Next.js 16</span>
              <span className="text-[#94A3B8]">Database</span>
              <span className="text-white font-medium">SQLite (Prisma)</span>
              <span className="text-[#94A3B8]">Sync</span>
              <span className="text-white font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-[#10B981]" /> Real-time (WebSocket)
              </span>
            </div>
            <Separator className="bg-[#334155] my-3" />
            <p className="text-xs text-[#64748B] text-center">
              Built with ❤️ for Sri Krishna Mobiles, Narayanpet
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
