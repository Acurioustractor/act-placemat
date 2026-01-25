import { useState, useEffect } from 'react'

interface Story {
  id: string
  quote: string
  storyteller: string
  project: string
  imageUrl?: string
  audioUrl?: string
  hasElderApproval: boolean
  capturedAt: string
}

// Mock stories - would come from API
const mockStories: Story[] = [
  {
    id: '1',
    quote:
      "When I first came to the Farm, I didn't know what community meant. Now I do. It means showing up, even when you don't feel like it. It means putting your hands in the dirt alongside someone you've never met and finding out you're not so different after all.",
    storyteller: 'Uncle Allan',
    project: 'The Harvest',
    hasElderApproval: true,
    capturedAt: '2024-01-15',
  },
  {
    id: '2',
    quote:
      "The first time someone handed me a meal without asking for anything in return, I cried. Not because I was hungry—I was—but because I'd forgotten what it felt like to be seen as a person, not a problem.",
    storyteller: 'Sarah M.',
    project: 'Orange Sky',
    hasElderApproval: true,
    capturedAt: '2024-01-12',
  },
  {
    id: '3',
    quote:
      "My grandmother used to say that every story we tell is a seed. Some grow into trees that shelter generations. I want my story to be that kind of tree.",
    storyteller: 'Aunty June',
    project: "June's Patch",
    hasElderApproval: true,
    capturedAt: '2024-01-10',
  },
]

interface StoryHeroProps {
  onViewStory?: (storyId: string) => void
}

export function StoryHero({ onViewStory }: StoryHeroProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    // TODO: Replace with API call
    const fetchStories = async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      setStories(mockStories)
      setLoading(false)
    }
    fetchStories()
  }, [])

  const currentStory = stories[currentIndex]

  const goToNext = () => {
    if (transitioning || stories.length <= 1) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(i => (i + 1) % stories.length)
      setTransitioning(false)
    }, 300)
  }

  const goToPrev = () => {
    if (transitioning || stories.length <= 1) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(i => (i - 1 + stories.length) % stories.length)
      setTransitioning(false)
    }, 300)
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 min-h-[320px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading today's story...</p>
        </div>
      </div>
    )
  }

  if (!currentStory) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 min-h-[320px] flex items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-lg mb-2">No stories to display</p>
          <p className="text-sm">Stories will appear here once captured</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative p-8 md:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-xl">📖</span>
            </div>
            <div>
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                Today's Story
              </h2>
              <p className="text-xs text-white/40">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'} to share
              </p>
            </div>
          </div>

          {/* Elder Approval Badge */}
          {currentStory.hasElderApproval && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
              <span className="text-sm">👴</span>
              <span className="text-xs font-medium text-amber-400">Elder Approved</span>
            </div>
          )}
        </div>

        {/* Story Quote - The Hero */}
        <div
          className={`transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        >
          <blockquote className="relative">
            {/* Opening quote mark */}
            <span className="absolute -top-4 -left-2 text-6xl text-white/10 font-serif">"</span>

            <p className="text-xl md:text-2xl lg:text-3xl text-white font-light leading-relaxed pl-6">
              {currentStory.quote}
            </p>

            {/* Attribution */}
            <footer className="mt-8 pl-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-lg">
                  {currentStory.storyteller.charAt(0)}
                </div>
                <div>
                  <cite className="not-italic font-medium text-white text-lg">
                    — {currentStory.storyteller}
                  </cite>
                  <p className="text-white/50 text-sm">{currentStory.project}</p>
                </div>
              </div>
            </footer>
          </blockquote>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            onClick={goToPrev}
            disabled={stories.length <= 1}
            className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Previous</span>
          </button>

          {/* Story Dots */}
          <div className="flex items-center gap-2">
            {stories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!transitioning) {
                    setTransitioning(true)
                    setTimeout(() => {
                      setCurrentIndex(idx)
                      setTransitioning(false)
                    }, 300)
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-8 bg-orange-500'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            disabled={stories.length <= 1}
            className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-sm">Next</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* View Full Story Button */}
      {onViewStory && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => onViewStory(currentStory.id)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors"
          >
            Read Full Story →
          </button>
        </div>
      )}
    </div>
  )
}
