import { useEffect, useState } from 'react'
import { MorningBrief } from './components/MorningBrief'
import { ContactIntelligenceHub } from './components/ContactIntelligenceHub'
import { CommunityProjects } from './components/CommunityProjects'
import { AIAgentChat, AIAgentButton } from './components/AIAgentChat'
import CuriousTractorResearch from './components/CuriousTractorResearch'
import { Opportunities } from './components/tabs/Opportunities'

function App() {
  const [activeTab, setActiveTab] = useState('morning-brief')
  const [aiChatOpen, setAiChatOpen] = useState(false)

  // ✅ NEW INTELLIGENCE-FOCUSED TABS
  const tabs = [
    { id: 'morning-brief', name: 'Morning Brief', icon: '🌅', description: 'Daily intelligence digest' },
    { id: 'contacts', name: 'Contacts', icon: '🤝', description: '20K relationship network' },
    { id: 'projects', name: 'Projects', icon: '🏘️', description: 'Portfolio & Beautiful Obsolescence tracking' },
    { id: 'opportunities', name: 'Opportunities', icon: '💎', description: 'AI-powered grant discovery' },
    { id: 'research', name: 'Research', icon: '🌱', description: 'Curious Tractor deep dives' },
  ]

  // 🔜 COMING SOON (Ready to build when you say go)
  // { id: 'opportunities', name: 'Opportunities', icon: '💎', description: 'AI-discovered grants' },
  // { id: 'calendar', name: 'Calendar', icon: '📅', description: 'Meeting intelligence' },
  // { id: 'gmail', name: 'Gmail', icon: '📧', description: 'Email analysis' },
  // { id: 'stories', name: 'Stories', icon: '📖', description: 'Impact documentation' }

  // 💰 FINANCIAL TOOLS (Hidden until Thriday integration)
  // { id: 'autopilot', name: 'Autopilot', icon: '🤖' },
  // { id: 'bookkeeping', name: 'Bookkeeping', icon: '📚' },
  // { id: 'money', name: 'Money Flow', icon: '💰' },
  // { id: 'reports', name: 'Financial Reports', icon: '📊' },
  // { id: 'receipts', name: 'Receipts', icon: '🧾' },

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam && tabs.some((tab) => tab.id === tabParam)) {
      setActiveTab(tabParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', activeTab)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [activeTab])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 items-center justify-between px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Beautiful Obsolescence Platform
            </p>
            <h1 className="text-xl font-bold text-slate-900">ACT Intelligence Hub</h1>
          </div>
          <div className="text-sm font-medium text-slate-600">
            🌱 Community-owned • Community-controlled
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex overflow-x-auto px-6">
          <div className="flex gap-8">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="mr-2 text-lg">{tab.icon}</span>
                  {tab.name}
                  {isActive && (
                    <span
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600"
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <main>
        {activeTab === 'morning-brief' && <MorningBrief />}
        {activeTab === 'contacts' && <ContactIntelligenceHub />}
        {activeTab === 'projects' && <CommunityProjects />}
        {activeTab === 'opportunities' && <Opportunities />}
        {activeTab === 'research' && <CuriousTractorResearch />}
      </main>

      {/* AI Agent Chat Sidebar */}
      <AIAgentChat isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      <AIAgentButton onClick={() => setAiChatOpen(true)} />
    </div>
  )
}

export default App
