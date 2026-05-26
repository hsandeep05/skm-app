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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  color: string
  delay?: number
}

function MetricCard({ title, value, icon, color, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="bg-[#111827] border-[#1E293B] hover:border-[#7C3AED]/40 transition-all duration-200 group">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
              <p className="text-xl font-bold text-white mt-1 truncate">{value}</p>
            </div>
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${color}20` }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
          </div>
        </CardContent>
      </Card>
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
      color: '#10B981',
      delay: 0,
    },
    {
      title: 'Week Sales',
      value: formatCurrency(data.weekSales),
      icon: <TrendingUp className="h-5 w-5" />,
      color: '#7C3AED',
      delay: 0.05,
    },
    {
      title: 'Month Sales',
      value: formatCurrency(data.monthSales),
      icon: <TrendingUp className="h-5 w-5" />,
      color: '#3B82F6',
      delay: 0.1,
    },
    {
      title: 'Pending Amount',
      value: formatCurrency(data.pendingAmount),
      icon: <Clock className="h-5 w-5" />,
      color: '#F59E0B',
      delay: 0.15,
    },
    {
      title: 'Pending Bills',
      value: String(data.pendingBills),
      icon: <Receipt className="h-5 w-5" />,
      color: '#EF4444',
      delay: 0.2,
    },
    {
      title: "Today's Bills",
      value: String(data.todayBills),
      icon: <CheckCircle className="h-5 w-5" />,
      color: '#10B981',
      delay: 0.25,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Sync Status & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 gap-1">
              <Wifi className="h-3 w-3" /> Online
            </Badge>
          ) : (
            <Badge className="bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30 gap-1">
              <WifiOff className="h-3 w-3" /> Offline
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
          className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Force Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((metric, idx) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Pending Bills Section */}
      {pendingList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-[#111827] border-[#1E293B] border-l-4 border-l-[#F59E0B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
                Pending Bills ({pendingList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-48">
                <div className="px-4 pb-4 space-y-2">
                  {pendingList.map((bill: any) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between bg-[#0B0F19] rounded-lg p-3 border border-[#1E293B]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {bill.customerName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {bill.mobileName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {bill.invoiceId} • {bill.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#7C3AED] hover:bg-[#7C3AED]/10"
                          onClick={() => handleViewInvoice(bill)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#10B981] hover:bg-[#10B981]/10"
                          onClick={() => handleFinalize(bill.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:bg-red-400/10"
                          onClick={() => setDeleteConfirm(bill.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Completed Bills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Card className="bg-[#111827] border-[#1E293B]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Recent Completed Bills</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="px-4 pb-4">
                {data.recentBills.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No completed bills yet. Create your first bill!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.recentBills.map((bill: any, idx: number) => (
                      <motion.div
                        key={bill.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between bg-[#0B0F19] rounded-lg p-3 border border-[#1E293B] hover:border-[#7C3AED]/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {bill.customerName}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {bill.mobileName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">
                              {bill.invoiceId} • {bill.date}
                            </p>
                            {bill.paymentStatus === 'Paid' ? (
                              <Badge className="bg-[#10B981]/20 text-[#10B981] border-0 text-[10px] h-4 px-1.5">
                                Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-0 text-[10px] h-4 px-1.5">
                                {bill.paymentStatus}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-white">
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
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invoice Preview Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#111827] border-[#1E293B] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Invoice Preview</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoicePreview data={selectedInvoice} showDownload />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#111827] border-[#1E293B] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Invoice?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This action cannot be undone. The invoice will be permanently deleted.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-[#1E293B]">
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
