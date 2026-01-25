/**
 * ACT Command Center - Overview Dashboard
 *
 * High-level overview with key metrics and quick actions.
 * Individual sections (Projects, Content, People, etc.) are now
 * accessible via the main sidebar navigation.
 *
 * Philosophy embedded:
 * - "Evidence is story, not surveillance"
 * - "If we cannot hand it over, we are still in Curiosity"
 */

import { useState, useEffect } from 'react'
import { CommandBar, useCommandBar } from './CommandBar'
import { api } from '../../services/api'

interface DashboardStats {
  activeProjects: number
  hotContacts: number
  pendingStories: number
  upcomingEvents: number
  storiesThisMonth: number
  avgTemperature: number
}

export function ACTCommandCenter() {
  const commandBar = useCommandBar()
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    hotContacts: 0,
    pendingStories: 0,
    upcomingEvents: 0,
    storiesThisMonth: 0,
    avgTemperature: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch overview stats from live APIs
    async function fetchStats() {
      try {
        // Fetch from our backend (localhost:4000)
        const projectRes = await fetch('http://localhost:4000/api/notion/projects')
        if (projectRes.ok) {
          const projectData = await projectRes.json()
          const projects = projectData.projects || []
          const activeCount = projects.filter((p: any) => {
            const status = (p.status || '').toLowerCase()
            return status.includes('active')
          }).length

          setStats(prev => ({
            ...prev,
            activeProjects: activeCount,
            hotContacts: 42,  // Mock data
            pendingStories: 12,  // Mock data
            upcomingEvents: 5,   // Mock data
            storiesThisMonth: 8, // Mock data
            avgTemperature: 7.2, // Mock data
          }))
        }
      } catch (err) {
        // Set fallback stats
        setStats({
          activeProjects: 70,
          hotContacts: 42,
          pendingStories: 12,
          upcomingEvents: 5,
          storiesThisMonth: 8,
          avgTemperature: 7.2,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      {/* Command Bar (⌘K) */}
      <CommandBar isOpen={commandBar.isOpen} onClose={commandBar.close} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {greeting}, Ben
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's what's happening across ACT today
          </p>
        </div>

        {/* Command bar trigger */}
        <button
          onClick={commandBar.open}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search</span>
          <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 rounded border border-slate-200">⌘K</kbd>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={<ProjectsIcon />}
          color="emerald"
          href="?tab=projects"
        />
        <StatCard
          label="Hot Contacts"
          value={stats.hotContacts}
          icon={<ContactsIcon />}
          color="rose"
          href="?tab=relationships"
        />
        <StatCard
          label="Pending Stories"
          value={stats.pendingStories}
          icon={<StoriesIcon />}
          color="violet"
          href="?tab=content"
        />
        <StatCard
          label="Upcoming Events"
          value={stats.upcomingEvents}
          icon={<CalendarIcon />}
          color="amber"
          href="?tab=calendar"
        />
      </div>

      {/* Quick Navigation */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          <QuickAction
            title="View Projects"
            description="Track LCAA progress and handover readiness"
            icon={<ProjectsIcon />}
            href="?tab=projects"
          />
          <QuickAction
            title="Content Pipeline"
            description="Stories, media, and publishing queue"
            icon={<StoriesIcon />}
            href="?tab=content"
          />
          <QuickAction
            title="Relationship Health"
            description="Contact temperature and touchpoints"
            icon={<ContactsIcon />}
            href="?tab=relationships"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Philosophy Reminder */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
          <h3 className="font-semibold text-emerald-900 mb-3">Today's Principle</h3>
          <blockquote className="text-emerald-800 italic text-lg mb-4">
            "If we cannot hand it over, we are still in Curiosity"
          </blockquote>
          <p className="text-sm text-emerald-700">
            Every project should build toward Beautiful Obsolescence - the point where
            community ownership means ACT is no longer needed.
          </p>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <ActivityItem
              icon={<StoriesIcon />}
              text="New story added to JusticeHub"
              time="2 hours ago"
            />
            <ActivityItem
              icon={<ContactsIcon />}
              text="3 contacts warming up"
              time="Today"
            />
            <ActivityItem
              icon={<ProjectsIcon />}
              text="Goods moved to Art phase"
              time="Yesterday"
            />
            <ActivityItem
              icon={<CalendarIcon />}
              text="Monthly Dinner scheduled"
              time="2 days ago"
            />
          </div>
        </div>
      </div>
    </>
  )
}

// Stat Card Component
interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: 'emerald' | 'rose' | 'violet' | 'amber'
  href: string
}

function StatCard({ label, value, icon, color, href }: StatCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  }

  return (
    <a
      href={href}
      className={`${colorClasses[color]} rounded-xl p-4 border transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="opacity-80">{icon}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </a>
  )
}

// Quick Action Component
interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
}

function QuickAction({ title, description, icon, href }: QuickActionProps) {
  return (
    <a
      href={href}
      className="bg-white rounded-xl p-5 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
    >
      <div className="text-slate-400 group-hover:text-emerald-600 transition-colors mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </a>
  )
}

// Activity Item Component
interface ActivityItemProps {
  icon: React.ReactNode
  text: string
  time: string
}

function ActivityItem({ icon, text, time }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-700 flex-1">{text}</span>
      <span className="text-slate-400">{time}</span>
    </div>
  )
}

// Icons
function ProjectsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function ContactsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function StoriesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
