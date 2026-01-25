import { useState } from 'react'

interface SectorItem {
  id: string
  name: string
  change: number
  value: number | string
}

type TabId = 'projects' | 'stories' | 'vignettes' | 'handovers'

interface Tab {
  id: TabId
  label: string
}

const tabs: Tab[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'stories', label: 'Stories' },
  { id: 'vignettes', label: 'Vignettes' },
  { id: 'handovers', label: 'Handovers' },
]

// Mock data - would come from API
const mockData: Record<TabId, SectorItem[]> = {
  projects: [
    { id: '1', name: 'The Harvest CSA', change: 12.5, value: '80%' },
    { id: '2', name: 'Goods Marketplace', change: 8.3, value: '65%' },
    { id: '3', name: 'Mingaminga Rangers', change: 15.0, value: '100%' },
    { id: '4', name: "June's Patch", change: 5.2, value: '45%' },
    { id: '5', name: 'DadLab25', change: 3.1, value: '30%' },
  ],
  stories: [
    { id: '1', name: 'Community Voice', change: 7.9, value: 31 },
    { id: '2', name: 'Origin Stories', change: 5.5, value: 6 },
    { id: '3', name: 'Impact Stories', change: 4.2, value: 8 },
    { id: '4', name: 'Practice Stories', change: 2.8, value: 4 },
    { id: '5', name: 'Partner Voices', change: 6.1, value: 12 },
  ],
  vignettes: [
    { id: '1', name: 'Orange Sky Origins', change: 24.0, value: 2400 },
    { id: '2', name: 'Uncle Allan', change: 8.9, value: 890 },
    { id: '3', name: 'Mingaminga Rangers', change: 4.5, value: 450 },
    { id: '4', name: 'The Confessional', change: 3.2, value: 320 },
    { id: '5', name: 'Farm Rhythms', change: 2.1, value: 210 },
  ],
  handovers: [
    { id: '1', name: 'Mingaminga Rangers', change: 100, value: 'Complete' },
    { id: '2', name: 'The Harvest CSA', change: 80, value: 'In Progress' },
    { id: '3', name: 'Goods Marketplace', change: 65, value: 'Building' },
  ],
}

interface SectorsTableProps {
  title?: string
  onViewDetails?: (itemId: string) => void
}

export function SectorsTable({ title = 'Overview', onViewDetails }: SectorsTableProps) {
  const [activeTab, setActiveTab] = useState<TabId>('projects')
  const data = mockData[activeTab]

  const getValueLabel = () => {
    switch (activeTab) {
      case 'projects': return 'Community %'
      case 'stories': return 'Count'
      case 'vignettes': return 'Views'
      case 'handovers': return 'Status'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header with tabs */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-2 ml-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all
                ${activeTab === tab.id
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-500 hover:bg-slate-100'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
        <div className="col-span-6">Name</div>
        <div className="col-span-2 text-right">Change</div>
        <div className="col-span-2 text-right">{getValueLabel()}</div>
        <div className="col-span-2 text-right"></div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-slate-100">
        {data.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors"
          >
            <div className="col-span-6">
              <span className="font-medium text-slate-900">{item.name}</span>
            </div>
            <div className="col-span-2 text-right">
              <span className={`
                inline-flex px-2.5 py-1 text-sm font-medium rounded-lg
                ${item.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
              `}>
                {item.change >= 0 ? '+' : ''}{item.change}%
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-slate-700">{item.value}</span>
            </div>
            <div className="col-span-2 text-right">
              <button
                onClick={() => onViewDetails?.(item.id)}
                className="text-sm font-medium text-slate-500 hover:text-violet-600 underline underline-offset-2"
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
        <button className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          View All
        </button>
      </div>
    </div>
  )
}
