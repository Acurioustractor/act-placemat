import { useEffect, useState } from 'react'
import { Card } from './ui/Card'

interface ProjectFinancial {
  id: string
  name: string
  status: string
  category: string
  financial: {
    income: number
    expenses: number
    netProfit: number
    transactionCount: number
    matchedTransactions: Array<{
      xero_id: string
      date: string
      contact_name: string
      total: number
      type: string
      reference?: string
    }>
  }
}

interface BankAccount {
  id: string
  name: string
  totalIn: number
  totalOut: number
  transactionCount: number
}

interface ProjectFinancialsData {
  summary: {
    totalProjects: number
    totalBankAccounts: number
    totalTransactions: number
    unmatchedTransactions: number
  }
  bankAccounts: BankAccount[]
  projects: ProjectFinancial[]
  unmatchedTransactions: Array<any>
}

export function ProjectFinancials() {
  const [data, setData] = useState<ProjectFinancialsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'projects' | 'accounts' | 'unmatched'>('projects')
  const [selectedProject, setSelectedProject] = useState<ProjectFinancial | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:4000/api/v2/projects/financial-overview')
        const result = await response.json()
        if (result.success) {
          setData(result)
        }
      } catch (err) {
        console.error('Failed to fetch project financials:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-clay-600">Loading project financials...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
        <p className="font-bold text-red-900">Failed to load project financials</p>
        <p className="mt-2 text-sm text-red-700">Check that the backend server is running</p>
      </div>
    )
  }

  const { summary, bankAccounts, projects, unmatchedTransactions } = data

  // Filter projects based on search
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-clay-900">🏘️ Project Financials</h1>
        <p className="text-clay-600">
          Link every dollar to ACT projects • {summary.totalProjects} projects • {summary.totalTransactions.toLocaleString()} transactions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card padding="md" className="border-2 border-clay-200">
          <div className="text-sm font-medium uppercase tracking-wide text-clay-700">
            Total Projects
          </div>
          <div className="mt-2 text-3xl font-bold text-clay-900">
            {summary.totalProjects}
          </div>
          <div className="mt-1 text-xs text-clay-600">From Notion</div>
        </Card>

        <Card padding="md" className="border-2 border-emerald-200 bg-emerald-50">
          <div className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Bank Accounts
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-900">
            {summary.totalBankAccounts}
          </div>
          <div className="mt-1 text-xs text-emerald-600">Active accounts</div>
        </Card>

        <Card padding="md" className="border-2 border-blue-200 bg-blue-50">
          <div className="text-sm font-medium uppercase tracking-wide text-blue-700">
            Transactions
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-900">
            {summary.totalTransactions.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-blue-600">Total bank transactions</div>
        </Card>

        <Card padding="md" className="border-2 border-orange-200 bg-orange-50">
          <div className="text-sm font-medium uppercase tracking-wide text-orange-700">
            Unmatched
          </div>
          <div className="mt-2 text-3xl font-bold text-orange-900">
            {summary.unmatchedTransactions}
          </div>
          <div className="mt-1 text-xs text-orange-600">Need project assignment</div>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-clay-200">
        {[
          { id: 'projects', label: '🏘️ Projects', count: filteredProjects.length },
          { id: 'accounts', label: '🏦 Bank Accounts', count: bankAccounts.length },
          { id: 'unmatched', label: '❓ Unmatched Transactions', count: unmatchedTransactions.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeView === tab.id
                ? 'border-b-2 border-rust-600 text-rust-700'
                : 'text-clay-600 hover:text-clay-900'
            }`}
          >
            {tab.label}
            <span className="ml-2 rounded-full bg-clay-200 px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Projects View */}
      {activeView === 'projects' && (
        <div className="space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search projects by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-clay-300 px-4 py-2 focus:border-rust-500 focus:outline-none focus:ring-2 focus:ring-rust-500/20"
          />

          {/* Project List */}
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                padding="lg"
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  project.financial.transactionCount > 0
                    ? 'border-2 border-emerald-200'
                    : 'border border-clay-200'
                }`}
                onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-clay-900">{project.name}</h3>
                      <span className="rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700">
                        {project.category}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        project.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        project.status === 'Planning' ? 'bg-blue-100 text-blue-700' :
                        'bg-clay-100 text-clay-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs font-medium text-emerald-700">Income</div>
                        <div className="mt-1 text-lg font-bold text-emerald-900">
                          {formatCurrency(project.financial.income)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-red-700">Expenses</div>
                        <div className="mt-1 text-lg font-bold text-red-900">
                          {formatCurrency(project.financial.expenses)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-clay-700">Net Profit</div>
                        <div className={`mt-1 text-lg font-bold ${
                          project.financial.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'
                        }`}>
                          {formatCurrency(project.financial.netProfit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-clay-700">Transactions</div>
                        <div className="mt-1 text-lg font-bold text-clay-900">
                          {project.financial.transactionCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="ml-4 text-clay-400 hover:text-clay-600">
                    {selectedProject?.id === project.id ? '▲' : '▼'}
                  </button>
                </div>

                {/* Expanded Transaction Details */}
                {selectedProject?.id === project.id && project.financial.matchedTransactions.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-clay-200 pt-4">
                    <h4 className="font-bold text-clay-900">Matched Transactions:</h4>
                    {project.financial.matchedTransactions.map((txn, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          txn.type === 'RECEIVE'
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className={`font-medium ${
                            txn.type === 'RECEIVE' ? 'text-emerald-900' : 'text-red-900'
                          }`}>
                            {txn.contact_name || 'Unknown'}
                          </div>
                          <div className={`text-xs ${
                            txn.type === 'RECEIVE' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatDate(txn.date)}
                            {txn.reference && ` • ${txn.reference}`}
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          txn.type === 'RECEIVE' ? 'text-emerald-900' : 'text-red-900'
                        }`}>
                          {txn.type === 'RECEIVE' ? '+' : '-'}
                          {formatCurrency(Math.abs(txn.total))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bank Accounts View */}
      {activeView === 'accounts' && (
        <div className="space-y-3">
          {bankAccounts.map((account) => (
            <Card key={account.id} padding="lg" className="border-2 border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-clay-900">🏦 {account.name}</h3>
                  <div className="mt-1 text-sm text-clay-600">
                    {account.transactionCount} transactions
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 text-right">
                  <div>
                    <div className="text-xs font-medium text-emerald-700">Money IN</div>
                    <div className="mt-1 text-xl font-bold text-emerald-900">
                      {formatCurrency(account.totalIn)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-red-700">Money OUT</div>
                    <div className="mt-1 text-xl font-bold text-red-900">
                      {formatCurrency(account.totalOut)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-clay-700">Net</div>
                    <div className={`mt-1 text-xl font-bold ${
                      account.totalIn - account.totalOut >= 0 ? 'text-emerald-900' : 'text-red-900'
                    }`}>
                      {formatCurrency(account.totalIn - account.totalOut)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unmatched Transactions View */}
      {activeView === 'unmatched' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-orange-50 p-4 text-sm text-orange-900">
            💡 <strong>These transactions aren't linked to any project yet.</strong> Review them and assign to the correct ACT project.
          </div>

          {unmatchedTransactions.slice(0, 50).map((txn, idx) => (
            <Card key={idx} padding="md" className="border-2 border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-bold text-clay-900">
                    {txn.contact_name || 'Unknown Vendor'}
                  </div>
                  <div className="mt-1 text-sm text-clay-600">
                    {formatDate(txn.date)} • {txn.bank_account_name || 'Unknown Account'}
                    {txn.reference && ` • ${txn.reference}`}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-4">
                  <div className={`text-xl font-bold ${
                    txn.type === 'RECEIVE' ? 'text-emerald-900' : 'text-red-900'
                  }`}>
                    {txn.type === 'RECEIVE' ? '+' : '-'}
                    {formatCurrency(Math.abs(txn.total))}
                  </div>
                  <button className="rounded bg-rust-600 px-4 py-2 text-sm font-medium text-white hover:bg-rust-700">
                    Assign to Project
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      <Card padding="md" className="border-2 border-clay-200 bg-clay-50">
        <div className="text-sm text-clay-700">
          <p><strong>How it works:</strong></p>
          <p>• Transactions are auto-matched to projects when vendor name matches project name</p>
          <p>• Review <strong>Unmatched Transactions</strong> and assign them manually</p>
          <p>• Each project shows total income, expenses, and net profit</p>
          <p>• Use <strong>Bank Accounts</strong> view to see money flow by account</p>
        </div>
      </Card>
    </div>
  )
}
