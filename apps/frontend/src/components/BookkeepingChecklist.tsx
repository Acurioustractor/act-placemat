import { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'

interface ChecklistItem {
  id: string
  category: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
  priority: 'high' | 'medium' | 'low'
  xeroLink?: string
  automatable: boolean
  steps?: string[]
  requiredFor?: string // What accountant needs this for
}

export function BookkeepingChecklist() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    completionRate: 0
  })

  useEffect(() => {
    loadChecklist()
  }, [])

  useEffect(() => {
    // Calculate stats whenever checklist changes
    const total = checklist.length
    const completed = checklist.filter(i => i.status === 'completed').length
    const inProgress = checklist.filter(i => i.status === 'in_progress').length
    const blocked = checklist.filter(i => i.status === 'blocked').length
    const completionRate = total > 0 ? (completed / total) * 100 : 0

    setStats({ total, completed, inProgress, blocked, completionRate })
  }, [checklist])

  const loadChecklist = () => {
    // Core bookkeeping functions mapped to actionable checklist
    const items: ChecklistItem[] = [
      // ========================================
      // DAILY TASKS
      // ========================================
      {
        id: 'daily-bank-check',
        category: 'daily',
        title: '💰 Check Bank Balance',
        description: 'Verify actual bank balance matches Xero',
        status: 'not_started',
        priority: 'high',
        xeroLink: 'https://go.xero.com/Bank/ViewAccount.aspx',
        automatable: true,
        steps: [
          'Open Xero Bank Accounts',
          'Click "Reconcile" tab',
          'Compare statement balance with Xero balance',
          'Investigate any discrepancies'
        ],
        requiredFor: 'Accurate cash flow reporting'
      },
      {
        id: 'daily-receipts',
        category: 'daily',
        title: '🧾 Upload Today\'s Receipts',
        description: 'Scan and attach receipts to expenses',
        status: 'not_started',
        priority: 'high',
        automatable: true,
        steps: [
          'Take photo/scan physical receipts',
          'Upload to Receipt Processor (OCR)',
          'Review extracted data (vendor, amount, GST)',
          'Match to Xero transactions or create new',
          'Tag with correct account code',
          'Attach receipt file to transaction'
        ],
        requiredFor: 'ATO audit compliance, GST claims'
      },
      {
        id: 'daily-invoice-review',
        category: 'daily',
        title: '📨 Review New Invoices',
        description: 'Check for new bills to pay and invoices to send',
        status: 'not_started',
        priority: 'medium',
        xeroLink: 'https://go.xero.com/AccountsPayable/Search.aspx',
        automatable: false,
        steps: [
          'Check email for new supplier bills',
          'Enter bills into Xero (or forward to bills@xero.com)',
          'Review all invoices for accuracy',
          'Set payment due dates',
          'Schedule payment runs'
        ],
        requiredFor: 'Cash flow management, supplier relationships'
      },

      // ========================================
      // WEEKLY TASKS
      // ========================================
      {
        id: 'weekly-bank-rec',
        category: 'weekly',
        title: '🏦 Bank Reconciliation',
        description: 'Match all bank transactions to Xero records',
        status: 'not_started',
        priority: 'high',
        xeroLink: 'https://go.xero.com/Bank/BankAccounts.aspx',
        automatable: true,
        steps: [
          'Import bank statement (or use bank feed)',
          'Match transactions to existing invoices/bills',
          'Create new transactions for unmatched items',
          'Code each transaction to correct account',
          'Reconcile: confirm statement balance = Xero balance',
          'Mark reconciliation complete'
        ],
        requiredFor: 'Accurate financial statements, fraud detection'
      },
      {
        id: 'weekly-invoice-chase',
        category: 'weekly',
        title: '💸 Chase Overdue Invoices',
        description: 'Follow up on unpaid invoices',
        status: 'not_started',
        priority: 'high',
        automatable: true,
        steps: [
          'Run Aged Receivables report',
          'Identify overdue invoices (30+ days)',
          'Send payment reminders (via email)',
          'Call high-value overdue clients',
          'Update invoice notes with follow-up actions'
        ],
        requiredFor: 'Cash flow, reducing bad debts'
      },
      {
        id: 'weekly-expense-coding',
        category: 'weekly',
        title: '🏷️ Code All Expenses',
        description: 'Assign correct account codes to all transactions',
        status: 'not_started',
        priority: 'medium',
        automatable: false,
        steps: [
          'Review uncoded transactions',
          'Assign to correct expense category (travel, office, etc)',
          'Verify GST treatment (GST on Purchases, GST-Free, etc)',
          'Add tracking categories (projects, departments)',
          'Add notes/descriptions for clarity'
        ],
        requiredFor: 'Accurate P&L, GST reporting, tax deductions'
      },

      // ========================================
      // MONTHLY TASKS
      // ========================================
      {
        id: 'monthly-close',
        category: 'monthly',
        title: '📅 Month-End Close',
        description: 'Complete all transactions for the month',
        status: 'not_started',
        priority: 'high',
        automatable: false,
        steps: [
          'Ensure all bank accounts reconciled',
          'Record all invoices sent/received',
          'Process credit card statements',
          'Record accruals (expenses incurred but not billed)',
          'Record prepayments (paid in advance)',
          'Review balance sheet for anomalies',
          'Lock period in Xero (prevent backdated changes)'
        ],
        requiredFor: 'Accurate monthly reporting, year-end close'
      },
      {
        id: 'monthly-payroll',
        category: 'monthly',
        title: '💼 Process Payroll',
        description: 'Pay employees and file payroll tax',
        status: 'not_started',
        priority: 'high',
        xeroLink: 'https://go.xero.com/Payroll/Employees.aspx',
        automatable: false,
        steps: [
          'Enter timesheets/hours worked',
          'Calculate pay (salary + super)',
          'Process pay run in Xero',
          'Pay employees (bank transfer)',
          'Pay PAYG withholding to ATO',
          'Pay superannuation (quarterly)'
        ],
        requiredFor: 'Employee compliance, STP reporting'
      },
      {
        id: 'monthly-reports',
        category: 'monthly',
        title: '📊 Generate Monthly Reports',
        description: 'Create P&L, Balance Sheet, Cash Flow',
        status: 'not_started',
        priority: 'medium',
        xeroLink: 'https://go.xero.com/Reports/',
        automatable: true,
        steps: [
          'Run Profit & Loss (current month vs budget)',
          'Run Balance Sheet',
          'Run Cash Flow Statement',
          'Export to PDF/Excel',
          'Review for unusual items',
          'Send to accountant/directors'
        ],
        requiredFor: 'Board meetings, financial decision-making'
      },

      // ========================================
      // QUARTERLY TASKS
      // ========================================
      {
        id: 'quarterly-bas',
        category: 'quarterly',
        title: '🇦🇺 Lodge BAS (Business Activity Statement)',
        description: 'Report and pay GST to the ATO',
        status: 'not_started',
        priority: 'high',
        xeroLink: 'https://go.xero.com/Reports/Report.aspx?reportId=GST',
        automatable: true,
        steps: [
          'Run GST report for the quarter',
          'Verify all GST coded correctly',
          'Review GST on Sales (G1)',
          'Review GST on Purchases (G11)',
          'Calculate Net GST (1A = G1 - G11)',
          'Lodge BAS via Xero or myGovID',
          'Pay GST liability to ATO (if owing)',
          'Record BAS lodgement in Xero'
        ],
        requiredFor: 'ATO compliance, avoid penalties (due 28 days after quarter)'
      },
      {
        id: 'quarterly-super',
        category: 'quarterly',
        title: '🏦 Pay Superannuation',
        description: 'Pay employer super contributions',
        status: 'not_started',
        priority: 'high',
        automatable: false,
        steps: [
          'Calculate 11% super on gross wages',
          'Generate super payment file from Xero',
          'Pay via SuperStream or clearing house',
          'Record payment in Xero',
          'Verify funds received by super funds'
        ],
        requiredFor: 'Employee retirement, ATO compliance (quarterly deadline)'
      },

      // ========================================
      // ANNUAL TASKS
      // ========================================
      {
        id: 'annual-year-end',
        category: 'annual',
        title: '📆 Year-End Close',
        description: 'Finalize accounts for financial year',
        status: 'not_started',
        priority: 'high',
        automatable: false,
        steps: [
          'Complete all monthly closes for the year',
          'Reconcile ALL accounts (bank, credit cards, loans)',
          'Record depreciation on assets',
          'Write off bad debts',
          'Accrue for unpaid expenses',
          'Defer income received in advance',
          'Prepare trial balance',
          'Lock financial year in Xero',
          'Send to accountant for tax return'
        ],
        requiredFor: 'Tax return, financial statements, audit (June 30 year-end)'
      },
      {
        id: 'annual-stocktake',
        category: 'annual',
        title: '📦 Annual Stocktake',
        description: 'Count and value inventory',
        status: 'not_started',
        priority: 'medium',
        automatable: false,
        steps: [
          'Physical count of all inventory',
          'Value at cost or market value (whichever lower)',
          'Adjust Xero inventory to match physical count',
          'Write off damaged/obsolete stock',
          'Record inventory value in balance sheet'
        ],
        requiredFor: 'Accurate balance sheet, COGS calculation'
      },
      {
        id: 'annual-tax-planning',
        category: 'annual',
        title: '💰 Tax Planning Meeting',
        description: 'Meet with accountant to minimize tax',
        status: 'not_started',
        priority: 'high',
        automatable: false,
        steps: [
          'Review projected profit for the year',
          'Identify tax deductions (equipment purchases, etc)',
          'Consider timing of income/expenses',
          'Review business structure (company vs trust)',
          'Discuss franking credits, dividends',
          'Plan estimated tax payments (PAYG instalments)'
        ],
        requiredFor: 'Tax minimization, cash flow planning'
      }
    ]

    setChecklist(items)
  }

  const updateStatus = (id: string, status: ChecklistItem['status']) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status } : item
      )
    )
  }

  const filteredChecklist = selectedCategory === 'all'
    ? checklist
    : checklist.filter(item => item.category === selectedCategory)

  const categories = [
    { id: 'all', name: 'All Tasks', icon: '📋' },
    { id: 'daily', name: 'Daily', icon: '☀️' },
    { id: 'weekly', name: 'Weekly', icon: '📅' },
    { id: 'monthly', name: 'Monthly', icon: '🗓️' },
    { id: 'quarterly', name: 'Quarterly', icon: '📊' },
    { id: 'annual', name: 'Annual', icon: '🎯' }
  ]

  const getStatusColor = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'blocked': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityColor = (priority: ChecklistItem['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="📚 Bookkeeping Checklist"
        subtitle="Core accounting functions for a healthy business"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Total Tasks</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Completed</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.completed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">In Progress</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{stats.inProgress}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Blocked</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{stats.blocked}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Completion</div>
          <div className="mt-2 text-3xl font-bold text-brand-600">{stats.completionRate.toFixed(0)}%</div>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {cat.id === 'all'
                ? checklist.length
                : checklist.filter(i => i.category === cat.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {filteredChecklist.map(item => (
          <Card key={item.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.automatable && (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                        ⚡ Automatable
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority === 'high' && '🔴 High'}
                      {item.priority === 'medium' && '🟡 Medium'}
                      {item.priority === 'low' && '🟢 Low'}
                    </span>
                  </div>
                </div>

                {/* Required For */}
                {item.requiredFor && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3">
                    <span className="text-xs font-medium text-blue-900">💡 Why this matters: </span>
                    <span className="text-xs text-blue-700">{item.requiredFor}</span>
                  </div>
                )}

                {/* Steps */}
                {item.steps && item.steps.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-900">Steps:</div>
                    <ol className="mt-2 space-y-2">
                      {item.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-gray-700">
                          <span className="font-medium text-brand-600">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Xero Link */}
                {item.xeroLink && (
                  <div className="mt-4">
                    <a
                      href={item.xeroLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      <span>🔗 Open in Xero</span>
                      <span>→</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Status Controls */}
            <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
              <button
                onClick={() => updateStatus(item.id, 'not_started')}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  item.status === 'not_started'
                    ? 'border-gray-300 bg-gray-100 text-gray-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Not Started
              </button>
              <button
                onClick={() => updateStatus(item.id, 'in_progress')}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  item.status === 'in_progress'
                    ? 'border-blue-300 bg-blue-100 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => updateStatus(item.id, 'completed')}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  item.status === 'completed'
                    ? 'border-green-300 bg-green-100 text-green-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                ✓ Completed
              </button>
              <button
                onClick={() => updateStatus(item.id, 'blocked')}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  item.status === 'blocked'
                    ? 'border-red-300 bg-red-100 text-red-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🚫 Blocked
              </button>
            </div>
          </Card>
        ))}
      </div>

      {filteredChecklist.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-4xl">📋</div>
          <div className="mt-4 text-lg font-medium text-gray-900">No tasks in this category</div>
          <div className="mt-2 text-sm text-gray-600">Select a different category to view tasks</div>
        </Card>
      )}
    </div>
  )
}
