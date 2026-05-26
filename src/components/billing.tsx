'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, Send, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InvoicePreview, type InvoiceData } from '@/components/invoice-preview'
import { useRealtime } from '@/hooks/use-realtime'
import { saveOfflineInvoice, generateTempId, isOnline } from '@/lib/offline'
import { useToast } from '@/hooks/use-toast'

const SERVICE_CATALOG = [
  'Display (Combo)',
  'Battery',
  'Display Frame',
  'Speakers',
  'Mic',
  'Power Button',
  'Volume Up/Down Button',
  'Back Panel',
  'Full Body',
  'Charging Pin',
  'Motherboard Strip',
  'CC Board',
  'Back Cover',
  'Tempered Glass',
  'Motherboard Work',
  'Battery Boost',
  'Camera Glass',
]

interface LineItem {
  id: string
  description: string
  costPrice: number
  sellingPrice: number
  isCustom: boolean
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Theme-aware input classes
const inputClass = "bg-background border-border/70 text-foreground placeholder:text-muted-foreground/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] hover:border-[#7C3AED]/30 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all duration-200 h-9"
const smallInputClass = "bg-background border-border/70 text-foreground placeholder:text-muted-foreground/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] hover:border-[#7C3AED]/30 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all duration-200 text-sm h-8"

export function Billing() {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [mobileName, setMobileName] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const { emitChange } = useRealtime()
  const { toast } = useToast()

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.sellingPrice, 0), [items])
  const grandTotal = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount])
  const balanceDue = useMemo(() => Math.max(0, grandTotal - amountPaid), [grandTotal, amountPaid])
  const totalCost = useMemo(() => items.reduce((sum, item) => sum + item.costPrice, 0), [items])
  const netProfit = useMemo(() => grandTotal - totalCost, [grandTotal, totalCost])

  const addServiceItem = useCallback((serviceName: string) => {
    const newItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: serviceName,
      costPrice: 0,
      sellingPrice: 0,
      isCustom: false,
    }
    setItems((prev) => [...prev, newItem])
  }, [])

  const addCustomItem = useCallback(() => {
    const newItem: LineItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: '',
      costPrice: 0,
      sellingPrice: 0,
      isCustom: true,
    }
    setItems((prev) => [...prev, newItem])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }, [])

  const invoiceData: InvoiceData = useMemo(() => ({
    invoiceId: 'SRI-NEW',
    customerName: customerName || 'Walk-in Customer',
    customerPhone: customerPhone || undefined,
    mobileName: mobileName || 'N/A',
    date: new Date().toISOString().split('T')[0],
    items: items.map((item) => ({
      description: item.description,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
    })),
    subtotal,
    discount,
    grandTotal,
    amountPaid,
    balanceDue,
  }), [customerName, customerPhone, mobileName, items, subtotal, discount, grandTotal, amountPaid, balanceDue])

  const resetForm = useCallback(() => {
    setCustomerName('')
    setCustomerPhone('')
    setMobileName('')
    setItems([])
    setDiscount(0)
    setAmountPaid(0)
  }, [])

  const saveInvoice = async (status: 'pending' | 'completed') => {
    if (!mobileName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Mobile Name is required',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Add at least one item',
        variant: 'destructive',
      })
      return
    }

    const hasEmptyPrice = items.some(item => !item.sellingPrice || item.sellingPrice <= 0)
    if (hasEmptyPrice) {
      toast({
        title: 'Validation Error',
        description: 'All items must have a selling price greater than 0',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    const invoicePayload = {
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || null,
      mobileName,
      items: items.map((item) => ({
        description: item.description,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
      })),
      subtotal,
      discount,
      grandTotal,
      amountPaid,
      balanceDue,
      calculatedNetProfit: netProfit,
      paymentStatus: balanceDue <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending',
      status,
      updatedBy: 'operator_primary',
      tempId: generateTempId(),
    }

    try {
      if (isOnline()) {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoicePayload),
        })
        if (res.ok) {
          const { invoice } = await res.json()
          emitChange({
            type: status === 'completed' ? 'invoice-finalized' : 'invoice-created',
            invoiceId: invoice.invoiceId,
            timestamp: new Date().toISOString(),
            operator: 'operator_primary',
          })
          toast({
            title: status === 'completed' ? 'Bill Finalized!' : 'Saved as Pending',
            description: `Invoice ${invoice.invoiceId} created successfully`,
          })
          resetForm()
        } else {
          throw new Error('Failed to create invoice')
        }
      } else {
        await saveOfflineInvoice({
          id: invoicePayload.tempId,
          tempId: invoicePayload.tempId,
          syncStatus: 'pending',
          date: new Date().toISOString().split('T')[0],
          customerName: invoicePayload.customerName,
          customerPhone: invoicePayload.customerPhone || undefined,
          mobileName: invoicePayload.mobileName,
          items: invoicePayload.items,
          subtotal: invoicePayload.subtotal,
          discount: invoicePayload.discount,
          grandTotal: invoicePayload.grandTotal,
          amountPaid: invoicePayload.amountPaid,
          balanceDue: invoicePayload.balanceDue,
          calculatedNetProfit: invoicePayload.calculatedNetProfit,
          paymentStatus: invoicePayload.paymentStatus,
          status: invoicePayload.status,
          updatedBy: invoicePayload.updatedBy,
          createdAt: new Date().toISOString(),
        })
        toast({
          title: 'Saved Offline',
          description: 'Invoice saved locally and will sync when online',
        })
        resetForm()
      }
    } catch (err) {
      console.error('Save error:', err)
      toast({
        title: 'Error',
        description: 'Failed to save invoice. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* LEFT PANEL - Service Entry Module */}
      <ScrollArea className="h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
        <div className="space-y-4 pr-2">
          {/* Customer Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-hidden rounded-xl border border-[#7C3AED]/20 bg-card relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7C3AED] to-[#A78BFA]" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="p-5 pl-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center ring-1 ring-[#7C3AED]/20">
                    <span className="text-[#7C3AED] text-xs font-bold">C</span>
                  </div>
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">Customer Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs font-medium">Customer Name</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-medium">Customer Phone (optional)</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone number"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-medium">Mobile Name <span className="text-[#EF4444]">*</span></Label>
                    <Input
                      value={mobileName}
                      onChange={(e) => setMobileName(e.target.value)}
                      placeholder="e.g., Vivo Y21, Samsung S24"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Service Catalog */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <div className="overflow-hidden rounded-xl border border-[#3B82F6]/20 bg-card relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#3B82F6] to-[#60A5FA]" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="p-5 pl-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center ring-1 ring-[#3B82F6]/20">
                    <span className="text-[#3B82F6] text-xs font-bold">S</span>
                  </div>
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">Service Catalog</h3>
                </div>
                <Select onValueChange={addServiceItem}>
                  <SelectTrigger className="w-full bg-background border-border/70 text-foreground hover:border-[#3B82F6]/30 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 h-9">
                    <SelectValue placeholder="Select a service to add..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {SERVICE_CATALOG.map((service) => (
                      <SelectItem key={service} value={service} className="text-foreground focus:bg-[#7C3AED]/20 focus:text-foreground">
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomItem}
                  className="mt-2 w-full border-[#7C3AED]/50 text-[#A78BFA] hover:bg-[#7C3AED]/10 hover:text-foreground gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom Item
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Line Items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <div className="overflow-hidden rounded-xl border border-[#F59E0B]/20 bg-card relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F59E0B] to-[#FBBF24]" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="p-5 pl-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center ring-1 ring-[#F59E0B]/20">
                    <span className="text-[#F59E0B] text-xs font-bold">{items.length}</span>
                  </div>
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">Line Items</h3>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {items.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-background rounded-lg p-3 border border-border/60 hover:border-[#F59E0B]/30 hover:shadow-sm transition-all duration-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded-md">#{idx + 1}</span>
                            {item.isCustom && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#7C3AED]/20 text-[#A78BFA]">Custom</span>
                            )}
                            {item.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{item.description}</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-[10px] font-medium">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Service description"
                            readOnly={!item.isCustom}
                            className={`${smallInputClass} disabled:opacity-80 disabled:text-muted-foreground`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-muted/30 rounded-lg p-2 -mx-1">
                          <div>
                            <Label className="text-muted-foreground text-[10px] font-medium">Cost Price</Label>
                            <Input
                              type="number"
                              value={item.costPrice || ''}
                              onChange={(e) => updateItem(item.id, 'costPrice', parseFloat(e.target.value) || 0)}
                              placeholder="₹0"
                              className={smallInputClass}
                            />
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-[10px] font-medium">Selling Price <span className="text-[#EF4444]">*</span></Label>
                            <Input
                              type="number"
                              value={item.sellingPrice || ''}
                              onChange={(e) => updateItem(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                              placeholder="₹0"
                              className={smallInputClass}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <p className="text-muted-foreground text-xs text-center py-4">
                      No items added. Select a service or add a custom item.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Financial Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
          >
            <div className="overflow-hidden rounded-xl border border-[#10B981]/20 bg-card relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-[#34D399]" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="p-5 pl-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-[#10B981]/15 flex items-center justify-center ring-1 ring-[#10B981]/20">
                    <span className="text-[#10B981] text-xs font-bold">₹</span>
                  </div>
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">Financial Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-medium">Discount</Label>
                    <Input
                      type="number"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="₹0"
                      className={inputClass}
                    />
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex justify-between items-center bg-[#10B981]/[0.07] -mx-2 px-3 py-2.5 rounded-lg">
                    <span className="text-foreground font-bold text-sm">Grand Total</span>
                    <span className="text-2xl font-bold text-[#10B981] tabular-nums">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-medium">Amount Paid</Label>
                    <Input
                      type="number"
                      value={amountPaid || ''}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      placeholder="₹0"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg border transition-all duration-300"
                    style={{ 
                      backgroundColor: balanceDue <= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                      borderColor: balanceDue <= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: balanceDue <= 0 ? '#10B981' : '#F59E0B' }}>
                      Balance Due
                    </span>
                    <span className="text-lg font-bold tabular-nums" style={{ color: balanceDue <= 0 ? '#10B981' : '#F59E0B' }}>
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-3 pb-4">
            <Button
              variant="outline"
              className="flex-1 border-border/70 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border gap-2 h-10 shadow-sm hover:shadow transition-all duration-200"
              onClick={() => saveInvoice('pending')}
              disabled={saving}
            >
              <Save className="h-4 w-4" /> Save as Pending
            </Button>
            <Button
              className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2 h-10 shadow-lg shadow-[#7C3AED]/25 hover:shadow-xl hover:shadow-[#7C3AED]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              onClick={() => saveInvoice('completed')}
              disabled={saving}
            >
              <Send className="h-4 w-4" /> {saving ? 'Processing...' : 'Finalize & Sync'}
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* RIGHT PANEL - Live Invoice Preview (Desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-20">
          <h3 className="text-foreground text-sm font-semibold mb-3 flex items-center gap-2 tracking-tight">
            <div className="h-6 w-6 rounded-md bg-[#7C3AED]/15 flex items-center justify-center ring-1 ring-[#7C3AED]/20">
              <Eye className="h-3.5 w-3.5 text-[#7C3AED]" />
            </div> Live Invoice Preview
          </h3>
          <div className="bg-background rounded-xl p-4 border border-border/60 shadow-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
            <InvoicePreview data={invoiceData} />
          </div>
        </div>
      </div>

      {/* Mobile Preview Button (Floating) */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setShowMobilePreview(true)}
          className="h-12 w-12 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/30"
          size="icon"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Preview Dialog */}
      <Dialog open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#7C3AED]" /> Invoice Preview
            </DialogTitle>
          </DialogHeader>
          <InvoicePreview data={invoiceData} showDownload />
        </DialogContent>
      </Dialog>
    </div>
  )
}
