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
  const [shopLogo, setShopLogo] = useState<string | null>(null)
  const { lastEvent } = useRealtime()
  const { toast } = useToast()

  // Load shop logo
  useEffect(() => {
    fetch('/api/logo')
      .then(res => res.json())
      .then(d => { if (d.logo) setShopLogo(d.logo) })
      .catch(() => {})
  }, [])

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
      shopLogo,
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
      {/* Header with Gradient Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#F59E0B]/10 via-[#F59E0B]/5 to-transparent border border-[#F59E0B]/20 p-4"
      >
        {/* Subtle dot pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-[#F59E0B]/30 to-[#F59E0B]/10 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Clock className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground font-bold text-lg">Pending Bills</h2>
                {bills.length > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold animate-pulse">
                    {bills.length}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Total due: <span className="font-semibold text-[#F59E0B]">{formatCurrency(totalPendingAmount)}</span>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingBills}
            className="border-[#7C3AED]/50 text-[#7C3AED] hover:bg-[#7C3AED]/10 hover:border-[#7C3AED] gap-1.5 backdrop-blur-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats Strip */}
      {bills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-muted-foreground">Bills</span>
            <span className="font-semibold text-foreground">{bills.length}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-foreground">{formatCurrency(totalPendingAmount)}</span>
          </div>
          {bills.filter((b) => b.paymentStatus === 'Partial').length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
              <div className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
              <span className="text-muted-foreground">Partial</span>
              <span className="font-semibold text-foreground">{bills.filter((b) => b.paymentStatus === 'Partial').length}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Search & Sort */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl bg-card/50 border border-border/50"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, mobile, or invoice ID..."
            className="bg-background border-border text-foreground placeholder:text-muted-foreground pl-9 h-9 focus-visible:ring-[#7C3AED]/30 focus-visible:border-[#7C3AED]/50 focus-visible:shadow-[0_0_12px_rgba(124,58,237,0.15)]"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'amount' | 'name')}>
          <SelectTrigger className="w-full sm:w-44 bg-background border-border text-foreground h-9 focus:ring-[#7C3AED]/30">
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <CheckCircle className="h-10 w-10 text-[#10B981]" />
          </div>
          <h3 className="text-foreground font-bold text-xl">All Caught Up!</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs">
            {searchQuery
              ? 'No pending bills match your search. Try different keywords.'
              : 'No pending bills at the moment. Great job staying on top of things!'}
          </p>
        </motion.div>
      ) : (
        <ScrollArea className="h-[calc(100vh-18rem)]">
          <div className="space-y-2.5">
            <AnimatePresence>
              {filteredBills.map((bill, idx) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.02 }}
                  className="group relative bg-card border border-[#F59E0B]/15 hover:border-[#F59E0B]/40 rounded-xl p-4 pl-5 transition-all duration-300 hover:shadow-lg hover:shadow-[#F59E0B]/5"
                >
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-[#F59E0B] to-[#F59E0B]/30" />

                  {/* Subtle radial glow in top-right */}
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-tr-xl bg-gradient-to-bl from-[#F59E0B]/5 to-transparent pointer-events-none" />

                  {/* Dot pattern overlay */}
                  <div className="absolute inset-0 rounded-xl opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }} />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground font-bold text-sm truncate">
                          {bill.customerName}
                        </span>
                        <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[10px] h-5 px-2.5 font-semibold rounded-full">
                          Pending
                        </Badge>
                        {bill.paymentStatus === 'Partial' && (
                          <Badge className="bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 text-[10px] h-5 px-2.5 font-semibold rounded-full">
                            Partial
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <AlertCircle className="h-3 w-3" />
                          {bill.invoiceId}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {bill.mobileName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(bill.date)}
                        </span>
                      </div>
                      {bill.items && bill.items.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {bill.items.slice(0, 3).map((item, i) => (
                            <span key={i} className="text-[10px] bg-background/80 text-muted-foreground px-2 py-0.5 rounded-full border border-border/50 font-medium">
                              {item.description}
                            </span>
                          ))}
                          {bill.items.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-medium px-1.5">
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
                          className="h-8 w-8 text-[#7C3AED] hover:bg-[#7C3AED]/15 hover:text-[#7C3AED] rounded-lg transition-colors"
                          onClick={() => handleViewInvoice(bill)}
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#10B981] hover:bg-[#10B981]/15 hover:text-[#10B981] rounded-lg transition-colors"
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
                          className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
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
        <DialogContent className="bg-card border-border/80 max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold">Invoice Preview</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoicePreview data={selectedInvoice} showDownload />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border/80 max-w-sm shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold">Delete Invoice?</DialogTitle>
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
              className="hover:shadow-md hover:shadow-destructive/20 transition-shadow"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
