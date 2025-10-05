import { useState, useCallback } from 'react'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'

interface Receipt {
  id: string
  filename: string
  uploadDate: string
  status: 'processing' | 'ready' | 'matched' | 'error'
  extractedData?: {
    vendor?: string
    amount?: number
    date?: string
    gst?: number
    category?: string
    matchedInvoice?: string
  }
  previewUrl?: string
}

export function ReceiptProcessor() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [autoMatch, setAutoMatch] = useState(true)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }

  const processFiles = async (files: File[]) => {
    const newReceipts: Receipt[] = files.map(file => ({
      id: `receipt-${Date.now()}-${Math.random()}`,
      filename: file.name,
      uploadDate: new Date().toISOString(),
      status: 'processing',
      previewUrl: URL.createObjectURL(file)
    }))

    setReceipts(prev => [...prev, ...newReceipts])

    // Simulate OCR processing with AI
    for (const receipt of newReceipts) {
      setTimeout(() => {
        setReceipts(prev => prev.map(r =>
          r.id === receipt.id
            ? {
                ...r,
                status: 'ready',
                extractedData: {
                  vendor: 'Google Cloud Platform',
                  amount: 183.50,
                  date: '2025-09-27',
                  gst: 16.68,
                  category: 'Software & Cloud Services',
                  matchedInvoice: autoMatch ? 'INV-0273' : undefined
                }
              }
            : r
        ))
      }, 2000)
    }
  }

  const handleApprove = (receiptId: string) => {
    setReceipts(prev => prev.map(r =>
      r.id === receiptId ? { ...r, status: 'matched' as const } : r
    ))
    setSelectedReceipt(null)
    // TODO: Call backend API to record expense in Xero
  }

  const readyCount = receipts.filter(r => r.status === 'ready').length
  const matchedCount = receipts.filter(r => r.status === 'matched').length
  const processingCount = receipts.filter(r => r.status === 'processing').length

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-start justify-between">
        <div>
          <SectionHeader
            title="🧾 Receipt Intelligence"
            subtitle="Drag & drop receipts for instant processing"
          />
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-clay-100 px-3 py-2 text-sm font-medium text-clay-700">
            <input
              type="checkbox"
              checked={autoMatch}
              onChange={(e) => setAutoMatch(e.target.checked)}
              className="rounded"
            />
            Auto-match to invoices
          </label>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">📥</div>
            <div className="text-2xl font-bold text-clay-900">{receipts.length}</div>
            <div className="text-sm text-clay-600">Total Receipts</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-blue-600">{processingCount}</div>
            <div className="text-sm text-clay-600">Processing</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-yellow-600">{readyCount}</div>
            <div className="text-sm text-clay-600">Ready to Review</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">✨</div>
            <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
            <div className="text-sm text-clay-600">Matched & Filed</div>
          </div>
        </Card>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-50 scale-105'
            : 'border-clay-300 bg-clay-50 hover:border-brand-400 hover:bg-brand-50/50'
        }`}
      >
        <div className="relative z-10">
          <div className="mb-4 text-6xl">📎</div>
          <h3 className="mb-2 text-xl font-semibold text-clay-900">
            Drop receipts here, or click to browse
          </h3>
          <p className="mb-6 text-clay-600">
            Supports PDF, PNG, JPG • AI extracts vendor, amount, GST automatically
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition-all hover:bg-brand-700 hover:scale-105">
            <span>Choose Files</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Receipts List */}
      {receipts.length > 0 && (
        <Card>
          <SectionHeader
            title="Recent Receipts"
            subtitle={`${receipts.length} receipt${receipts.length !== 1 ? 's' : ''} uploaded`}
          />
          <div className="mt-4 space-y-3">
            {receipts.map(receipt => (
              <button
                key={receipt.id}
                onClick={() => setSelectedReceipt(receipt)}
                className={`w-full rounded-lg border p-4 text-left transition-all hover:border-brand-400 hover:bg-brand-50 ${
                  receipt.status === 'ready' ? 'border-yellow-300 bg-yellow-50' :
                  receipt.status === 'matched' ? 'border-green-300 bg-green-50' :
                  receipt.status === 'processing' ? 'border-blue-300 bg-blue-50' :
                  'border-clay-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Preview Thumbnail */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white">
                    {receipt.previewUrl ? (
                      <img
                        src={receipt.previewUrl}
                        alt={receipt.filename}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-2xl">📄</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-clay-900">{receipt.filename}</h4>
                      {receipt.status === 'processing' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          <span className="animate-pulse">⚡</span> Processing
                        </span>
                      )}
                      {receipt.status === 'ready' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          ⏳ Review
                        </span>
                      )}
                      {receipt.status === 'matched' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          ✓ Matched
                        </span>
                      )}
                    </div>

                    {receipt.extractedData && (
                      <div className="mt-2 flex flex-wrap gap-2 text-sm">
                        {receipt.extractedData.vendor && (
                          <span className="text-clay-700">
                            <strong>Vendor:</strong> {receipt.extractedData.vendor}
                          </span>
                        )}
                        {receipt.extractedData.amount && (
                          <span className="text-clay-700">
                            <strong>Amount:</strong> ${receipt.extractedData.amount}
                          </span>
                        )}
                        {receipt.extractedData.gst && (
                          <span className="text-clay-700">
                            <strong>GST:</strong> ${receipt.extractedData.gst}
                          </span>
                        )}
                        {receipt.extractedData.matchedInvoice && (
                          <span className="text-green-700">
                            <strong>Matched:</strong> {receipt.extractedData.matchedInvoice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {receipt.status === 'ready' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApprove(receipt.id)
                      }}
                      className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                    >
                      Approve & File
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="max-w-4xl w-full rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-0">
              {/* Left: Image Preview */}
              <div className="bg-clay-900 p-8 flex items-center justify-center">
                {selectedReceipt.previewUrl ? (
                  <img
                    src={selectedReceipt.previewUrl}
                    alt={selectedReceipt.filename}
                    className="max-h-[600px] w-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-white text-4xl">📄</div>
                )}
              </div>

              {/* Right: Extracted Data */}
              <div className="p-8">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-clay-900">Receipt Details</h2>
                    <p className="text-clay-600">{selectedReceipt.filename}</p>
                  </div>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="rounded-lg bg-clay-100 p-2 hover:bg-clay-200"
                  >
                    ✕
                  </button>
                </div>

                {selectedReceipt.extractedData ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-clay-500">Vendor</label>
                      <input
                        type="text"
                        value={selectedReceipt.extractedData.vendor || ''}
                        className="mt-1 w-full rounded-lg border border-clay-300 px-4 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-clay-500">Amount (AUD)</label>
                        <input
                          type="number"
                          value={selectedReceipt.extractedData.amount || 0}
                          className="mt-1 w-full rounded-lg border border-clay-300 px-4 py-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-clay-500">GST (AUD)</label>
                        <input
                          type="number"
                          value={selectedReceipt.extractedData.gst || 0}
                          className="mt-1 w-full rounded-lg border border-clay-300 px-4 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-clay-500">Date</label>
                      <input
                        type="date"
                        value={selectedReceipt.extractedData.date || ''}
                        className="mt-1 w-full rounded-lg border border-clay-300 px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-clay-500">Category</label>
                      <select className="mt-1 w-full rounded-lg border border-clay-300 px-4 py-2">
                        <option>{selectedReceipt.extractedData.category}</option>
                        <option>Office Supplies</option>
                        <option>Travel & Transport</option>
                        <option>Marketing & Advertising</option>
                        <option>Professional Services</option>
                      </select>
                    </div>

                    {selectedReceipt.extractedData.matchedInvoice && (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">✅</span>
                          <span className="font-semibold text-green-900">Auto-matched to invoice</span>
                        </div>
                        <p className="text-sm text-green-700">
                          This receipt matches invoice <strong>{selectedReceipt.extractedData.matchedInvoice}</strong>
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedReceipt.id)}
                        className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
                      >
                        Approve & File
                      </button>
                      <button className="rounded-lg bg-clay-100 px-6 py-3 font-semibold text-clay-700 hover:bg-clay-200">
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4 animate-pulse">⚡</div>
                    <p className="text-clay-600">Processing receipt...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}