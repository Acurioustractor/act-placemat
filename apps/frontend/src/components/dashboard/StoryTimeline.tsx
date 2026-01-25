import { useState, useEffect } from 'react'

interface TimelineStory {
  id: string
  time: string
  title: string
  type: 'story' | 'vignette' | 'review'
  status: 'pending' | 'ready' | 'approved'
  project: string
  projectIcon?: string
}

// Mock data - would come from API
const mockStories: TimelineStory[] = [
  {
    id: '1',
    time: '2:00 pm',
    title: 'Uncle Allan - Palm Island Journey',
    type: 'story',
    status: 'pending',
    project: 'The Harvest',
    projectIcon: '🌾',
  },
  {
    id: '2',
    time: '1:30 pm',
    title: 'Mingaminga Rangers Documentary',
    type: 'vignette',
    status: 'ready',
    project: 'Mingaminga',
    projectIcon: '🌿',
  },
  {
    id: '3',
    time: '11:00 am',
    title: 'Orange Sky Origins',
    type: 'vignette',
    status: 'approved',
    project: 'Orange Sky',
    projectIcon: '🧡',
  },
  {
    id: '4',
    time: '10:00 am',
    title: 'Community Garden Voices',
    type: 'story',
    status: 'approved',
    project: "June's Patch",
    projectIcon: '🥬',
  },
  {
    id: '5',
    time: '9:00 am',
    title: 'DadLab Reflections',
    type: 'review',
    status: 'pending',
    project: 'DadLab25',
    projectIcon: '👨‍👧',
  },
]

const statusStyles = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending' },
  ready: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Ready' },
  approved: { bg: 'bg-violet-50', text: 'text-violet-600', label: 'Approved' },
}

const typeIcons = {
  story: '📖',
  vignette: '🎨',
  review: '👴',
}

interface StoryTimelineProps {
  title?: string
  date?: Date
  stories?: TimelineStory[]
  onStoryClick?: (storyId: string) => void
}

export function StoryTimeline({
  title = 'Agenda',
  date = new Date(),
  stories = mockStories,
  onStoryClick,
}: StoryTimelineProps) {
  const formattedDate = date.toLocaleDateString('en-AU', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900">
          {title} <span className="text-slate-400 font-normal">({formattedDate})</span>
        </h3>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="relative">
          {stories.map((story, idx) => {
            const status = statusStyles[story.status]
            const isLast = idx === stories.length - 1

            return (
              <div key={story.id} className="relative flex items-start gap-4">
                {/* Time */}
                <div className="w-20 flex-shrink-0 text-right">
                  <span className="text-sm text-slate-500">{story.time}</span>
                </div>

                {/* Timeline connector */}
                <div className="relative flex flex-col items-center">
                  {/* Dot */}
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10">
                    <span className="text-base">{story.projectIcon || typeIcons[story.type]}</span>
                  </div>
                  {/* Line */}
                  {!isLast && (
                    <div className="w-0.5 h-full bg-slate-200 absolute top-10 left-1/2 -translate-x-1/2" style={{ height: 'calc(100% + 1rem)' }} />
                  )}
                </div>

                {/* Content */}
                <div
                  className="flex-1 pb-6 cursor-pointer group"
                  onClick={() => onStoryClick?.(story.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900 group-hover:text-violet-600 transition-colors">
                        {story.title}
                      </h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {story.project}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
