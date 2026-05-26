'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { DollarSign, TrendingUp, Clock, BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AnalyticsData {
  date: string
  totalGrossSales: number
  totalCashCollected: number
  totalOutstanding: number
  totalNetProfit: number
  invoiceCount: number
  trend: {
    date: string
    sales: number
    profit: number
    count: number
  }[]
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface SummaryCardProps {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-[#111827] border-[#1E293B] hover:border-[#7C3AED]/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className="text-lg font-bold text-white mt-1">{value}</p>
            </div>
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
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

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-xs font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function Analytics() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?date=${selectedDate}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const summaryCards: SummaryCardProps[] = data
    ? [
        {
          title: 'Total Gross Sales',
          value: formatCurrency(data.totalGrossSales),
          icon: <DollarSign className="h-5 w-5" />,
          color: '#10B981',
        },
        {
          title: 'Total Cash Collected',
          value: formatCurrency(data.totalCashCollected),
          icon: <TrendingUp className="h-5 w-5" />,
          color: '#7C3AED',
        },
        {
          title: 'Total Outstanding',
          value: formatCurrency(data.totalOutstanding),
          icon: <Clock className="h-5 w-5" />,
          color: '#F59E0B',
        },
        {
          title: 'Total Net Profit',
          value: formatCurrency(data.totalNetProfit),
          icon: <BarChart3 className="h-5 w-5" />,
          color: '#3B82F6',
        },
      ]
    : []

  const chartData = data?.trend.map((t) => ({
    ...t,
    dateLabel: format(new Date(t.date), 'dd MMM'),
  })) || []

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <Label className="text-muted-foreground text-xs">Select Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#111827] border-[#1E293B] text-white"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card, idx) => (
          <SummaryCard key={idx} {...card} />
        ))}
      </div>

      {/* Sales & Profit Trend Chart */}
      <Card className="bg-[#111827] border-[#1E293B]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Last 7 Days — Sales & Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#1E293B' }}
                    tickLine={{ stroke: '#1E293B' }}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#1E293B' }}
                    tickLine={{ stroke: '#1E293B' }}
                    tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#salesGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#profitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
