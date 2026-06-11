'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Unlock, Phone, Save, CalendarDays, Filter, CalendarRange, CalendarCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'

interface UnlockingEntryData {
  id: string
  phoneName: string
  customerName: string
  frpType: string
  amount: number
  date: string
  createdAt: string
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inputClass = "bg-background border-border/70 text-foreground placeholder:text-muted-foreground/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] hover:border-[#F59E0B]/30 focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-all duration-200 h-9"

export function Unlocking() {
  const [phoneName, setPhoneName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [frpType, setFrpType] = useState<'Online' | 'Tool'>('Online')
  const [amount, setAmount] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<UnlockingEntryData[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0])
  const [showAll, setShowAll] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month'>('today')
  const { toast } = useToast()

  const fetchEntries = useCallback(async () => {
    try {
      let url: string
      if (showAll) {
        url = '/api/unlocking?all=true'
      } else if (filterPeriod === 'week') {
        url = '/api/unlocking?period=week'
      } else if (filterPeriod === 'month') {
        url = '/api/unlocking?period=month'
      } else {
        url = `/api/unlocking?date=${filterDate}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setTotalAmount(data.totalAmount || 0)
      }
    } catch (err) {
      console.error('Fetch entries error:', err)
    }
  }, [filterDate, showAll, filterPeriod])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const resetForm = useCallback(() => {
    setPhoneName('')
    setCustomerName('')
    setFrpType('Online')
    setAmount('')
    setEntryDate(new Date().toISOString().split('T')[0])
  }, [])

  const saveEntry = async () => {
    if (!phoneName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Phone Name is required',
        variant: 'destructive',
      })
      return
    }

    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be greater than 0',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/unlocking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneName: phoneName.trim(),
          customerName: customerName.trim(),
          frpType,
          amount: amt,
          date: entryDate,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Entry Saved!',
          description: `${phoneName} - ${frpType} unlocking for ${formatCurrency(amt)}`,
        })
        resetForm()
        fetchEntries()
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save entry')
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to save entry',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/unlocking?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({
          title: 'Deleted',
          description: 'Unlocking entry removed',
        })
        fetchEntries()
      } else {
        throw new Error('Failed to delete')
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to delete entry',
        variant: 'destructive',
      })
    }
  }

  const todayCount = entries.length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
      {/* LEFT PANEL - Entry Form */}
      <div className="lg:col-span-2">
        <ScrollArea className="h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
          <div className="space-y-4 pr-2">
            {/* Entry Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="overflow-hidden rounded-xl border border-[#F59E0B]/20 bg-card relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F59E0B] to-[#FBBF24]" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="p-5 pl-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-7 w-7 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center ring-1 ring-[#F59E0B]/20">
                      <Unlock className="h-3.5 w-3.5 text-[#F59E0B]" />
                    </div>
                    <h3 className="text-foreground text-sm font-semibold tracking-tight">Unlocking Entry</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground text-xs font-medium">Phone Name <span className="text-[#EF4444]">*</span></Label>
                      <Input
                        value={phoneName}
                        onChange={(e) => setPhoneName(e.target.value)}
                        placeholder="e.g., Samsung S24, Vivo Y21"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-medium">Customer Name (optional)</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Walk-in Customer"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-medium">Date</Label>
                      <Input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-medium">FRP Type <span className="text-[#EF4444]">*</span></Label>
                      <Select value={frpType} onValueChange={(v) => setFrpType(v as 'Online' | 'Tool')}>
                        <SelectTrigger className="w-full bg-background border-border/70 text-foreground hover:border-[#F59E0B]/30 focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 h-9">
                          <SelectValue placeholder="Select FRP Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="Online" className="text-foreground focus:bg-[#F59E0B]/20 focus:text-foreground">
                            🌐 Online
                          </SelectItem>
                          <SelectItem value="Tool" className="text-foreground focus:bg-[#F59E0B]/20 focus:text-foreground">
                            🔧 Tool
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-medium">Amount <span className="text-[#EF4444]">*</span></Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="₹0"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    className="w-full mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold gap-2 h-10 shadow-lg shadow-[#F59E0B]/25 hover:shadow-xl hover:shadow-[#F59E0B]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                    onClick={saveEntry}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" /> {saving ? 'Saving...' : 'Add Entry'}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Total Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <div className="overflow-hidden rounded-xl border border-[#10B981]/20 bg-card relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-[#34D399]" />
                <div className="p-5 pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">
                        {showAll ? 'Total (All)' : filterPeriod === 'week' ? 'Total (This Week)' : filterPeriod === 'month' ? 'Total (This Month)' : `Total (${filterDate})`}
                      </p>
                      <p className="text-2xl font-bold text-[#10B981] tabular-nums mt-1">
                        {formatCurrency(totalAmount)}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                      <span className="text-[#10B981] text-lg font-bold">{todayCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT PANEL - Saved Entries as Cards */}
      <div className="lg:col-span-3">
        <ScrollArea className="h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
          <div className="space-y-3 pr-2">
            {/* Filter Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {/* Quick Period Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                <Button
                  variant={filterPeriod === 'today' && !showAll ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilterPeriod('today'); setShowAll(false) }}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    filterPeriod === 'today' && !showAll
                      ? 'bg-[#F59E0B] hover:bg-[#D97706] text-black'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-[#F59E0B]/30'
                  }`}
                >
                  <CalendarDays className="h-3 w-3" />
                  Today
                </Button>
                <Button
                  variant={filterPeriod === 'week' && !showAll ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilterPeriod('week'); setShowAll(false) }}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    filterPeriod === 'week' && !showAll
                      ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-[#7C3AED]/30'
                  }`}
                >
                  <CalendarRange className="h-3 w-3" />
                  This Week
                </Button>
                <Button
                  variant={filterPeriod === 'month' && !showAll ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilterPeriod('month'); setShowAll(false) }}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    filterPeriod === 'month' && !showAll
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-[#10B981]/30'
                  }`}
                >
                  <CalendarCheck className="h-3 w-3" />
                  This Month
                </Button>
                <Button
                  variant={showAll ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    showAll
                      ? 'bg-[#F59E0B] hover:bg-[#D97706] text-black'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-[#F59E0B]/30'
                  }`}
                >
                  Show All
                </Button>
              </div>

              {/* Date picker - only visible when Today is selected */}
              {filterPeriod === 'today' && !showAll && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value)
                    }}
                    className={`${inputClass} max-w-[180px]`}
                  />
                </div>
              )}
            </motion.div>

            {/* Entries as Cards */}
            <AnimatePresence>
              {entries.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                >
                  <Card className="bg-card border-border/60 hover:border-[#F59E0B]/30 hover:shadow-md transition-all duration-200 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Header: Phone Name + FRP Badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-md bg-[#F59E0B]/15 flex items-center justify-center ring-1 ring-[#F59E0B]/20 flex-shrink-0">
                              <Phone className="h-3 w-3 text-[#F59E0B]" />
                            </div>
                            <h4 className="text-foreground font-semibold text-sm truncate">{entry.phoneName}</h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                              entry.frpType === 'Online'
                                ? 'bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/20'
                                : 'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/20'
                            }`}>
                              {entry.frpType === 'Online' ? '🌐 Online' : '🔧 Tool'}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {entry.customerName && (
                              <span className="truncate">👤 {entry.customerName}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {entry.date}
                            </span>
                          </div>
                        </div>

                        {/* Amount + Delete */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-lg font-bold text-[#10B981] tabular-nums">
                            {formatCurrency(entry.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground/50 hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                            onClick={() => deleteEntry(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {entries.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="h-16 w-16 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-[#F59E0B]/20">
                  <Unlock className="h-7 w-7 text-[#F59E0B]/50" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">No unlocking entries yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Add your first unlocking entry using the form
                </p>
              </motion.div>
            )}

            {/* Bottom Total Bar */}
            {entries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Separator className="bg-border/60 mb-3" />
                <div className="flex items-center justify-between bg-[#10B981]/[0.07] -mx-1 px-4 py-3 rounded-xl border border-[#10B981]/20">
                  <span className="text-foreground font-bold text-sm">
                    Total ({entries.length} {entries.length === 1 ? 'entry' : 'entries'}) • {showAll ? 'All' : filterPeriod === 'week' ? 'This Week' : filterPeriod === 'month' ? 'This Month' : filterDate}
                  </span>
                  <span className="text-xl font-bold text-[#10B981] tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
