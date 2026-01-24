import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/Dashboard'
import { Intelligence } from './components/Intelligence'
import { Projects } from './components/Projects'
import { Contacts } from './components/Contacts'
import { Opportunities } from './components/tabs/Opportunities'
import { VisualisationsHub } from './components/VisualisationsHub'
import CuriousTractorResearch from './components/CuriousTractorResearch'
import { ContentTab } from './components/dashboard/ContentTab'
import { CalendarTab } from './components/dashboard/CalendarTab'
import { DevelopmentTab } from './components/dashboard/DevelopmentTab'
import { PeopleTab } from './components/dashboard/PeopleTab'
import { TimeVisualsTab } from './components/dashboard/TimeVisualsTab'
import { AgentApprovals } from './components/AgentApprovals'
import FinanceTab from './components/dashboard/FinanceTab'
import SubscriptionsTab from './components/dashboard/SubscriptionsTab'
import { ACTBrainCenter } from './components/dashboard/ACTBrainCenter'
import { GoalsDashboard } from './components/dashboard/GoalsDashboard'
import GoodsCompendiumPage from './components/dashboard/GoodsCompendiumPage'
import { useGoals, useGoalUpdate, useGoalMove, useGoalReorder } from './hooks/useGoals'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Hooks must be at top level (not inside switch)
  const { goals, loading: goalsLoading, error: goalsError, refetch: refetchGoals } = useGoals()
  const { updateGoal, updating } = useGoalUpdate()
  const { moveGoal } = useGoalMove()
  const { reorderLane } = useGoalReorder()

  // Handle URL params and tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const validTabs = [
      'brain', 'dashboard', 'intelligence', 'projects', 'contacts', 'opportunities',
      'visualisations', 'research', 'content', 'calendar', 'development',
      'relationships', 'timevisuals', 'approvals', 'finance', 'subscriptions',
      'goals', 'goods'
    ]
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', activeTab)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [activeTab])

  const renderContent = () => {
    switch (activeTab) {
      case 'brain':
        return <ACTBrainCenter />
      case 'dashboard':
        return <Dashboard />
      case 'intelligence':
        return <Intelligence />
      case 'projects':
        return <Projects />
      case 'contacts':
        return <Contacts />
      case 'opportunities':
        return <Opportunities />
      case 'visualisations':
        return <VisualisationsHub />
      case 'research':
        return <CuriousTractorResearch />
      case 'content':
        return <ContentTab />
      case 'calendar':
        return <CalendarTab />
      case 'development':
        return <DevelopmentTab />
      case 'relationships':
        return <PeopleTab />
      case 'timevisuals':
        return <TimeVisualsTab />
      case 'approvals':
        return <AgentApprovals />
      case 'finance':
        return <FinanceTab />
      case 'subscriptions':
        return <SubscriptionsTab />
      case 'goals':
        return (
          <GoalsDashboard
            goals={goals}
            loading={goalsLoading}
            error={goalsError}
            updating={updating}
            onUpdateGoal={updateGoal}
            onAddGoal={async () => {}}
            onAddMetric={async () => {}}
            onViewHistory={() => {}}
            onMoveGoal={async (goalId, lane) => {
              await moveGoal(goalId, lane)
              refetchGoals()  // Refresh after move
            }}
            onReorderLane={async (lane, goalIds) => {
              await reorderLane(lane, goalIds)
              refetchGoals()  // Refresh after reorder
            }}
          />
        )
      case 'goods':
        return <GoodsCompendiumPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  )
}

export default App
