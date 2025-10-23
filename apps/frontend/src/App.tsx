import { useEffect, useState } from 'react'
import { MorningBrief } from './components/MorningBrief'
import { ContactIntelligenceHub } from './components/ContactIntelligenceHub'
import { CommunityProjects } from './components/CommunityProjects'
import { AIAgentChat, AIAgentButton } from './components/AIAgentChat'
import CuriousTractorResearch from './components/CuriousTractorResearch'
import { Opportunities } from './components/tabs/Opportunities'
import { AboutACT } from './components/AboutACT'

function App() {
  const [activeTab, setActiveTab] = useState('morning-brief')
  const [aiChatOpen, setAiChatOpen] = useState(false)

  // ✅ NEW INTELLIGENCE-FOCUSED TABS
  const tabs = [
    { id: 'about', name: 'About ACT', icon: '🚜', description: 'What is A Curious Tractor?' },
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
    <div className="min-h-screen bg-clay-50">
      {/* Modern Header */}
      <header className="bg-white border-b border-clay-200 shadow-soft sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                Beautiful Obsolescence Platform
              </p>
              <h1 className="text-2xl font-bold text-clay-900">ACT Intelligence Hub</h1>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-50 to-ocean-50 rounded-full border border-brand-200">
              <span className="text-lg">🌱</span>
              <span className="text-sm font-semibold text-clay-700">
                Community-owned • Community-controlled
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Navigation */}
      <nav className="bg-white border-b border-clay-200 shadow-soft sticky top-[88px] z-40">
        <div className="mx-auto max-w-7xl px-8">
          <div className="flex overflow-x-auto py-4">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-ocean-600 text-white shadow-medium'
                        : 'bg-clay-50 text-clay-700 hover:bg-clay-100 hover:shadow-soft hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tab.icon}</span>
                      <span>{tab.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      <main>
        {activeTab === 'about' && <AboutACT />}
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
