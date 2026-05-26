'use client'

import React, { useRef } from 'react'
import { format } from 'date-fns'
import { toPng } from 'html-to-image'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export interface InvoiceItem {
  description: string
  costPrice: number
  sellingPrice: number
}

export interface InvoiceData {
  invoiceId: string
  customerName: string
  customerPhone?: string
  mobileName: string
  date: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  grandTotal: number
  amountPaid: number
  balanceDue: number
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return format(d, 'dd MMMM yyyy')
  } catch {
    return dateStr
  }
}

export function InvoicePreview({ data, showDownload = false }: { data: InvoiceData; showDownload?: boolean }) {
  const invoiceRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!invoiceRef.current) return
    try {
      const dataUrl = await toPng(invoiceRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      })
      const link = document.createElement('a')
      link.download = `invoice-${data.invoiceId}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to download invoice:', err)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={invoiceRef}
        className="invoice-preview w-full max-w-[400px] bg-white text-gray-900 p-6 rounded-lg shadow-lg"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1E3A8A' }}>
              SRI Krishna Mobiles
            </h1>
            <p className="text-[10px] mt-0.5" style={{ color: '#60A5FA' }}>
              Near Chowk bazar, MainRoad, Narayanpet
            </p>
            <p className="text-[10px]" style={{ color: '#60A5FA' }}>
              Your Trusted Mobile Service Center
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold tracking-wider" style={{ color: '#1E3A8A' }}>
              INVOICE
            </span>
            <p className="text-xs font-semibold mt-0.5" style={{ color: '#1E3A8A' }}>
              #{data.invoiceId}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b-2 my-3" style={{ borderColor: '#1E3A8A' }} />

        {/* Bill To */}
        <div className="mb-3 text-xs">
          <p className="font-semibold" style={{ color: '#1E3A8A' }}>
            Bill To: <span className="font-normal text-gray-800">{data.customerName || 'Walk-in Customer'}</span>
          </p>
          {data.customerPhone && (
            <p className="text-gray-600 mt-0.5">Phone: {data.customerPhone}</p>
          )}
          <p className="text-gray-600">Mobile: {data.mobileName}</p>
          <p className="text-gray-600">Date: {formatDate(data.date)}</p>
        </div>

        {/* Items Table */}
        <table className="w-full text-xs mb-3 border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>
              <th className="py-1.5 px-2 text-left font-semibold">#</th>
              <th className="py-1.5 px-2 text-left font-semibold">Item Description</th>
              <th className="py-1.5 px-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-200"
                style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}
              >
                <td className="py-1.5 px-2 text-gray-600">{idx + 1}</td>
                <td className="py-1.5 px-2 text-gray-800">{item.description}</td>
                <td className="py-1.5 px-2 text-right text-gray-800">{formatCurrency(item.sellingPrice)}</td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-400 italic">
                  No items added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Financial Totals */}
        <div className="flex justify-end mb-3">
          <div className="w-48 text-xs">
            <div className="flex justify-between py-1 text-gray-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between py-1 text-gray-600">
                <span>Discount:</span>
                <span>-{formatCurrency(data.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 font-bold border-t border-gray-300" style={{ color: '#1E3A8A' }}>
              <span>Grand Total:</span>
              <span>{formatCurrency(data.grandTotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-gray-600">
              <span>Amount Paid:</span>
              <span>{formatCurrency(data.amountPaid)}</span>
            </div>
            <div
              className="flex justify-between py-1 font-bold border-t border-gray-300"
              style={{ color: data.balanceDue <= 0 ? '#10B981' : '#F59E0B' }}
            >
              <span>Balance Due:</span>
              <span>{formatCurrency(data.balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 pt-3 text-center" style={{ borderColor: '#1E3A8A' }}>
          <p className="text-xs text-gray-600">Thank you for visiting our store :)</p>
          <p className="text-[10px] text-gray-400 mt-1">
            Generated by SRI Krishna Mobiles Bill Generator
          </p>
        </div>
      </div>

      {/* Download Button */}
      {showDownload && (
        <Button
          onClick={handleDownload}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2"
        >
          <Download className="h-4 w-4" />
          Download as Image
        </Button>
      )}
    </div>
  )
}
