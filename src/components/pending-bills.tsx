'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Eye,
  Send,
  Trash2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InvoicePreview, type InvoiceData } from '@/components/invoice-preview'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

interface PendingBill {
  id: string
  invoiceId: string
  customerName: string
  customerPhone: string | null
  mobileName: string
  date: string
  subtotal: number
  discount: number
  grandTotal: number
  amountPaid: number
  balanceDue: number
  paymentStatus: string
  status: string
  items: Array<{
    id: string
    description: string
    costPrice: number
    sellingPrice: number
  }>
  createdAt: string
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function PendingBills() {
  const [bills, setBills] = useState<PendingBill[]>([])
  const [filteredBills, setFilteredBills] = useState<PendingBill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [finalizingId, setFinalizingId] = useState<string | null>(null)
  const { lastEvent } = useRealtime()
  const { toast } = useToast()

  const fetchPendingBills = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices?status=pending')
      if (res.ok) {
        const json = await res.json()
        setBills(json.invoices || [])
      }
    } catch (err) {
      console.error('Failed to fetch pending bills:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingBills()
  }, [fetchPendingBills])

  useEffect(() => {
    if (lastEvent) {
      fetchPendingBills()
    }
  }, [lastEvent, fetchPendingBills])

  // Filter and sort bills
  useEffect(() => {
    let result = [...bills]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (bill) =>
          bill.customerName.toLowerCase().includes(query) ||
          bill.mobileName.toLowerCase().includes(query) ||
          bill.invoiceId.toLowerCase().includes(query)
      )
    }

    switch (sortBy) {
      case 'amount':
        result.sort((a, b) => b.grandTotal - a.grandTotal)
        break
      case 'name':
        result.sort((a, b) => a.customerName.localeCompare(b.customerName))
        break
      case 'date':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    setFilteredBills(result)
  }, [bills, searchQuery, sortBy])

  const handleViewInvoice = (bill: PendingBill) => {
    const invoiceData: InvoiceData = {
      invoiceId: bill.invoiceId,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || undefined,
      mobileName: bill.mobileName,
      date: bill.date,
      items: bill.items?.map((i) => ({
        description: i.description,
        costPrice: i.costPrice,
        sellingPrice: i.sellingPrice,
      })) || [],
      subtotal: bill.subtotal,
      discount: bill.discount,
      grandTotal: bill.grandTotal,
      amountPaid: bill.amountPaid,
      balanceDue: bill.balanceDue,
    }
    setSelectedInvoice(invoiceData)
    setModalOpen(true)
  }

  const handleFinalize = async (id: string) => {
    setFinalizingId(id)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      if (!res.ok) throw new Error('Failed to fetch invoice')
      const { invoice } = await res.json()

      const updateRes = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...invoice, status: 'completed' }),
      })
      if (updateRes.ok) {
        toast({ title: 'Bill Finalized', description: `Invoice ${invoice.invoiceId} has been finalized` })
        fetchPendingBills()
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to finalize bill', variant: 'destructive' })
    } finally {
      setFinalizingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Invoice deleted successfully' })
        fetchPendingBills()
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete invoice', variant: 'destructive' })
    }
    setDeleteConfirm(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    )
  }

  const totalPendingAmount = bills.reduce((sum, b) => sum + b.balanceDue, 0)

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="text-foreground font-bold text-lg">Pending Bills</h2>
            <p className="text-muted-foreground text-xs">
              {bills.length} bill{bills.length !== 1 ? 's' : ''} pending • Total due: {formatCurrency(totalPendingAmount)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPendingBills}
          className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>

      {/* Search & Sort */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, mobile, or invoice ID..."
            className="bg-card border-border text-foreground placeholder:text-muted-foreground pl-9 h-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'amount' | 'name')}>
          <SelectTrigger className="w-full sm:w-40 bg-card border-border text-foreground h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="amount">Sort by Amount</SelectItem>
            <SelectItem value="name">Sort by Name</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-[#10B981]/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-[#10B981]" />
          </div>
          <h3 className="text-foreground font-semibold text-lg">All Caught Up!</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {searchQuery ? 'No pending bills match your search' : 'No pending bills at the moment'}
          </p>
        </motion.div>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-2">
            <AnimatePresence>
              {filteredBills.map((bill, idx) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-card border border-[#F59E0B]/20 hover:border-[#F59E0B]/40 rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground font-semibold text-sm truncate">
                          {bill.customerName}
                        </span>
                        <Badge className="bg-[#F59E0B]/15 text-[#F59E0B] border-0 text-[10px] h-5 px-2 font-semibold">
                          Pending
                        </Badge>
                        {bill.paymentStatus === 'Partial' && (
                          <Badge className="bg-[#3B82F6]/15 text-[#3B82F6] border-0 text-[10px] h-5 px-2 font-semibold">
                            Partial
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {bill.invoiceId}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {bill.mobileName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(bill.date)}
                        </span>
                      </div>
                      {bill.items && bill.items.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {bill.items.slice(0, 3).map((item, i) => (
                            <span key={i} className="text-[10px] bg-background text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                              {item.description}
                            </span>
                          ))}
                          {bill.items.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{bill.items.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatCurrency(bill.grandTotal)}</p>
                        {bill.balanceDue > 0 && (
                          <p className="text-xs text-[#F59E0B] font-semibold">
                            Due: {formatCurrency(bill.balanceDue)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#7C3AED] hover:bg-[#7C3AED]/10"
                          onClick={() => handleViewInvoice(bill)}
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#10B981] hover:bg-[#10B981]/10"
                          onClick={() => handleFinalize(bill.id)}
                          disabled={finalizingId === bill.id}
                          title="Finalize Bill"
                        >
                          {finalizingId === bill.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-[#10B981] border-t-transparent rounded-full" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirm(bill.id)}
                          title="Delete Bill"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {/* Invoice Preview Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Invoice Preview</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoicePreview data={selectedInvoice} showDownload />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Invoice?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This action cannot be undone. The invoice will be permanently deleted.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-border text-foreground hover:bg-muted">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
