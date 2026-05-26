'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, Send, Eye, X } from 'lucide-react'
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
import { InvoicePreview, type InvoiceData, type InvoiceItem } from '@/components/invoice-preview'
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
            <Card className="bg-[#111827] border-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Customer Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="bg-[#0B0F19] border-[#1E293B] text-white placeholder:text-muted-foreground/50 focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Customer Phone (optional)</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone number"
                    className="bg-[#0B0F19] border-[#1E293B] text-white placeholder:text-muted-foreground/50 focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Mobile Name *</Label>
                  <Input
                    value={mobileName}
                    onChange={(e) => setMobileName(e.target.value)}
                    placeholder="e.g., Samsung Galaxy S24"
                    className="bg-[#0B0F19] border-[#1E293B] text-white placeholder:text-muted-foreground/50 focus:border-[#7C3AED]"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Service Catalog */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <Card className="bg-[#111827] border-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Service Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={addServiceItem}>
                  <SelectTrigger className="w-full bg-[#0B0F19] border-[#1E293B] text-white focus:border-[#7C3AED]">
                    <SelectValue placeholder="Select a service to add..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111827] border-[#1E293B]">
                    {SERVICE_CATALOG.map((service) => (
                      <SelectItem key={service} value={service} className="text-white focus:bg-[#7C3AED]/20 focus:text-white">
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomItem}
                  className="mt-2 w-full border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom Item
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Line Items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <Card className="bg-[#111827] border-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">
                  Line Items ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence>
                  {items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[#0B0F19] rounded-lg p-3 border border-[#1E293B] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">#{idx + 1} {item.isCustom ? '(Custom)' : ''}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[10px]">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Service description"
                          readOnly={!item.isCustom}
                          className="bg-[#111827] border-[#1E293B] text-white text-xs h-8 placeholder:text-muted-foreground/50 focus:border-[#7C3AED] disabled:opacity-70"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-muted-foreground text-[10px]">Cost Price (Hidden)</Label>
                          <Input
                            type="number"
                            value={item.costPrice || ''}
                            onChange={(e) => updateItem(item.id, 'costPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="bg-[#111827] border-[#1E293B] text-white text-xs h-8 placeholder:text-muted-foreground/50 focus:border-[#7C3AED]"
                          />
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-[10px]">Selling Price *</Label>
                          <Input
                            type="number"
                            value={item.sellingPrice || ''}
                            onChange={(e) => updateItem(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="bg-[#111827] border-[#1E293B] text-white text-xs h-8 placeholder:text-muted-foreground/50 focus:border-[#7C3AED]"
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
              </CardContent>
            </Card>
          </motion.div>

          {/* Financial Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
          >
            <Card className="bg-[#111827] border-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Discount</Label>
                  <Input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-[#0B0F19] border-[#1E293B] text-white h-8 placeholder:text-muted-foreground/50 focus:border-[#7C3AED]"
                  />
                </div>
                <Separator className="bg-[#1E293B]" />
                <div className="flex justify-between text-sm">
                  <span className="text-white font-semibold">Grand Total</span>
                  <span className="text-white font-bold text-lg">{formatCurrency(grandTotal)}</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Amount Paid</Label>
                  <Input
                    type="number"
                    value={amountPaid || ''}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-[#0B0F19] border-[#1E293B] text-white h-8 placeholder:text-muted-foreground/50 focus:border-[#7C3AED]"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span
                    className="font-bold"
                    style={{ color: balanceDue <= 0 ? '#10B981' : '#F59E0B' }}
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-3 pb-4">
            <Button
              variant="outline"
              className="flex-1 border-[#1E293B] text-muted-foreground hover:bg-[#1E293B]/50 hover:text-white gap-2"
              onClick={() => saveInvoice('pending')}
              disabled={saving}
            >
              <Save className="h-4 w-4" /> Save as Pending
            </Button>
            <Button
              className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2 shadow-lg shadow-[#7C3AED]/20"
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
          <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#7C3AED]" /> Live Invoice Preview
          </h3>
          <div className="bg-[#0B0F19] rounded-xl p-4 border border-[#1E293B] max-h-[calc(100vh-12rem)] overflow-y-auto">
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
        <DialogContent className="bg-[#111827] border-[#1E293B] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#7C3AED]" /> Invoice Preview
            </DialogTitle>
          </DialogHeader>
          <InvoicePreview data={invoiceData} showDownload />
        </DialogContent>
      </Dialog>
    </div>
  )
}
