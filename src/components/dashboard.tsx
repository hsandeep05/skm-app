'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  RefreshCw,
  Eye,
  Wifi,
  WifiOff,
  Receipt,
  AlertCircle,
  Trash2,
  Send,
  CalendarDays,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { InvoicePreview, type InvoiceData } from '@/components/invoice-preview'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

interface DashboardData {
  todaySales: number
  weekSales: number
  monthSales: number
  pendingAmount: number
  pendingBills: number
  todayBills: number
  recentBills: any[]
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  accentColor: string
  gradientFrom: string
  delay?: number
}

function MetricCard({ title, value, icon, accentColor, gradientFrom, delay = 0 }: MetricCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className="group relative overflow-hidden rounded-2xl border bg-card
                    transition-all duration-300 ease-out
                    hover:-translate-y-1
                    cursor-default"
        style={{
          borderColor: hovered ? 'transparent' : undefined,
          boxShadow: hovered
            ? `0 8px 30px -8px ${accentColor}35, 0 0 20px -6px ${accentColor}20`
            : undefined,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Subtle accent gradient overlay on the card */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0,
            background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 60%)`,
          }}
        />

        {/* Subtle dot pattern overlay for visual texture */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${accentColor} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Radial glow from top-right corner */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
          style={{
            background: `radial-gradient(circle, ${accentColor}, transparent 70%)`,
          }}
        />

        {/* Left-side color bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{
            background: `linear-gradient(180deg, ${accentColor}, ${gradientFrom})`,
          }}
        />

        <div className="relative p-3 sm:p-5 pl-4 sm:pl-6">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.1em] truncate"
                style={{ color: accentColor }}
              >
                {title}
              </p>
              <p className="text-lg sm:text-3xl font-extrabold text-foreground mt-1 sm:mt-2 tracking-tight truncate leading-tight sm:leading-none">
                {value}
              </p>
            </div>
            {/* Circular icon with glow */}
            <div
              className="relative h-9 w-9 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0
                          transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${accentColor}${hovered ? '25' : '18'}, ${accentColor}${hovered ? '12' : '08'})`,
                transform: hovered ? 'scale(1.1)' : undefined,
                boxShadow: hovered
                  ? `0 0 20px -4px ${accentColor}40, 0 0 8px -2px ${accentColor}25`
                  : 'none',
              }}
            >
              {/* Inner ring */}
              <div
                className="absolute inset-[2px] rounded-full border transition-colors duration-300"
                style={{ borderColor: `${accentColor}${hovered ? '35' : '20'}` }}
              />
              <div style={{ color: accentColor }}>{icon}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [pendingList, setPendingList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { isConnected, lastEvent, requestRefresh } = useRealtime()
  const { toast } = useToast()

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPendingBills = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices?status=pending')
      if (res.ok) {
        const json = await res.json()
        setPendingList(json.invoices || [])
      }
    } catch (err) {
      console.error('Failed to fetch pending bills:', err)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    fetchPendingBills()
  }, [fetchDashboard, fetchPendingBills])

  useEffect(() => {
    if (lastEvent) {
      fetchDashboard()
      fetchPendingBills()
    }
  }, [lastEvent, fetchDashboard, fetchPendingBills])

  // Expose pending count for parent tab
  useEffect(() => {
    if (data) {
      window.dispatchEvent(new CustomEvent('pending-count', { detail: data.pendingBills }))
    }
  }, [data])

  const handleViewInvoice = (bill: any) => {
    const invoiceData: InvoiceData = {
      invoiceId: bill.invoiceId,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || undefined,
      mobileName: bill.mobileName,
      date: bill.date,
      items: bill.items?.map((i: any) => ({
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
        fetchDashboard()
        fetchPendingBills()
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to finalize bill', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Invoice deleted successfully' })
        fetchDashboard()
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Failed to load dashboard data
      </div>
    )
  }

  const metrics: MetricCardProps[] = [
    {
      title: "Today's Sales",
      value: formatCurrency(data.todaySales),
      icon: <DollarSign className="h-5 w-5" />,
      accentColor: '#10B981',
      gradientFrom: '#34D399',
      delay: 0,
    },
    {
      title: 'Week Sales',
      value: formatCurrency(data.weekSales),
      icon: <TrendingUp className="h-5 w-5" />,
      accentColor: '#7C3AED',
      gradientFrom: '#A78BFA',
      delay: 0.06,
    },
    {
      title: 'Month Sales',
      value: formatCurrency(data.monthSales),
      icon: <CalendarDays className="h-5 w-5" />,
      accentColor: '#3B82F6',
      gradientFrom: '#60A5FA',
      delay: 0.12,
    },
    {
      title: 'Pending Amount',
      value: formatCurrency(data.pendingAmount),
      icon: <Clock className="h-5 w-5" />,
      accentColor: '#F59E0B',
      gradientFrom: '#FBBF24',
      delay: 0.18,
    },
    {
      title: 'Pending Bills',
      value: String(data.pendingBills),
      icon: <AlertCircle className="h-5 w-5" />,
      accentColor: '#EF4444',
      gradientFrom: '#F87171',
      delay: 0.24,
    },
    {
      title: "Today's Bills",
      value: String(data.todayBills),
      icon: <CheckCircle className="h-5 w-5" />,
      accentColor: '#06B6D4',
      gradientFrom: '#22D3EE',
      delay: 0.3,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Sync Status & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 gap-1.5 px-3 py-1">
              <Wifi className="h-3.5 w-3.5" /> Online
            </Badge>
          ) : (
            <Badge className="bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30 gap-1.5 px-3 py-1">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            requestRefresh()
            fetchDashboard()
            fetchPendingBills()
          }}
          className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Force Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Pending Bills Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#F59E0B]/25 bg-card">
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F59E0B] to-[#FBBF24]" />

          {/* Subtle background glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.05] pointer-events-none blur-3xl"
            style={{ background: '#F59E0B' }}
          />

          <div className="p-5 pl-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-base">
                    Pending Bills
                  </h3>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Awaiting payment or finalization
                  </p>
                </div>
              </div>
              <Badge className="bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/25 text-xs px-3 py-1 font-bold">
                {pendingList.length}
              </Badge>
            </div>

            {pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No pending bills</p>
                <p className="text-xs opacity-70">All caught up!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-60">
                <div className="space-y-2">
                  {pendingList.map((bill: any) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between bg-background rounded-xl p-3.5 border border-border
                                  hover:border-[#F59E0B]/30 transition-all duration-200 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {bill.customerName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {bill.mobileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Receipt className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">
                            {bill.invoiceId}
                          </span>
                          <span className="text-xs text-[#F59E0B] font-bold">
                            {formatCurrency(bill.grandTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#7C3AED] hover:bg-[#7C3AED]/10"
                          onClick={() => handleViewInvoice(bill)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#10B981] hover:bg-[#10B981]/10"
                          onClick={() => handleFinalize(bill.id)}
                          title="Finalize"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:bg-red-400/10"
                          onClick={() => setDeleteConfirm(bill.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recent Completed Bills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#10B981]/25 bg-card">
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-[#34D399]" />

          {/* Subtle background glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.05] pointer-events-none blur-3xl"
            style={{ background: '#10B981' }}
          />

          <div className="p-5 pl-6">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center">
                <FileText className="h-5 w-5 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">
                  Recent Completed Bills
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Successfully finalized invoices
                </p>
              </div>
            </div>

            {data.recentBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Receipt className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No completed bills yet</p>
                <p className="text-xs opacity-70">Create your first bill!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {data.recentBills.map((bill: any, idx: number) => (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center justify-between bg-background rounded-xl p-3.5 border border-border
                                  hover:border-[#10B981]/30 transition-all duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {bill.customerName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {bill.mobileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Receipt className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">
                            {bill.invoiceId}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {bill.date}
                          </span>
                          {bill.paymentStatus === 'Paid' ? (
                            <Badge className="bg-[#10B981]/12 text-[#10B981] border-[#10B981]/20 text-[10px] h-5 px-2 font-bold">
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-[#F59E0B]/12 text-[#F59E0B] border-[#F59E0B]/20 text-[10px] h-5 px-2 font-bold">
                              {bill.paymentStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-foreground">
                          {formatCurrency(bill.grandTotal)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#7C3AED] hover:bg-[#7C3AED]/10"
                          onClick={() => handleViewInvoice(bill)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </motion.div>

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
