import { useState, useEffect } from 'react'
import { resolveApiUrl } from '../config/env'
import { Card } from './ui/Card'
import { Pill } from './ui/Pill'

interface Project {
  id: string
  name: string
  themes?: string[]
  relatedOrganisations?: Array<any>
  relatedPlaces?: Array<{ displayName?: string; indigenousName?: string }>
}

export function AboutACT() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch(resolveApiUrl('/api/real/projects'))
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate network stats
  const stats = {
    projects: projects.length,
    partners: new Set(projects.flatMap(p => p.relatedOrganisations || [])).size,
    locations: new Set(
      projects.flatMap(p =>
        (p.relatedPlaces || []).map(place =>
          place.displayName || place.indigenousName
        ).filter(Boolean)
      )
    ).size,
    themes: new Set(projects.flatMap(p => p.themes || [])).size
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-clay-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-brand-500 border-t-transparent"></div>
          <p className="mt-6 text-lg text-clay-700 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clay-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand-50 via-ocean-50 to-purple-50 border-b border-clay-200">
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="text-6xl">🚜</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-clay-900 mb-6">
            A Curious Tractor
          </h1>
          <p className="text-xl md:text-2xl text-clay-700 font-medium mb-8">
            A relational network exploring what happens when good people want to do good things together
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full border-2 border-brand-200 shadow-soft">
            <span className="text-sm font-semibold text-clay-700">
              Community-owned • Community-controlled • Figuring it out as we go
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12 space-y-12">
        {/* The Honest Truth */}
        <Card padding="xl" variant="soft">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-clay-900">We Don't Really Know Yet</h2>
            <p className="text-lg text-clay-700 leading-relaxed">
              And that's okay. A Curious Tractor isn't a traditional organisation with a neat elevator pitch.
              We're a network of people, projects, and possibilities that emerged from a simple question:
              <span className="font-semibold text-brand-800"> What if we worked together differently?</span>
            </p>
            <p className="text-lg text-clay-700 leading-relaxed">
              We're learning in public, building with community, and staying curious about what a relational
              network can be when it's designed for connection over extraction, for relationships over transactions,
              for emergence over execution.
            </p>
          </div>
        </Card>

        {/* What We're Learning */}
        <div>
          <h2 className="text-3xl font-bold text-clay-900 mb-6">What We're Learning</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card padding="lg" hover variant="soft">
              <div className="space-y-3">
                <span className="text-4xl">🌱</span>
                <h3 className="text-xl font-bold text-clay-900">Beautiful Obsolescence</h3>
                <p className="text-clay-700">
                  Projects should be designed to end. When something has served its purpose,
                  it should gracefully make way for what's next. Not everything needs to scale forever.
                </p>
              </div>
            </Card>

            <Card padding="lg" hover variant="soft">
              <div className="space-y-3">
                <span className="text-4xl">🤝</span>
                <h3 className="text-xl font-bold text-clay-900">Relational Infrastructure</h3>
                <p className="text-clay-700">
                  The network is the value. We're building systems that support people connecting,
                  collaborating, and creating together without extractive overhead.
                </p>
              </div>
            </Card>

            <Card padding="lg" hover variant="soft">
              <div className="space-y-3">
                <span className="text-4xl">📖</span>
                <h3 className="text-xl font-bold text-clay-900">Storytelling as Strategy</h3>
                <p className="text-clay-700">
                  Stories aren't just marketing—they're how we make sense of complex change.
                  We work with communities to document and share what matters to them.
                </p>
              </div>
            </Card>

            <Card padding="lg" hover variant="soft">
              <div className="space-y-3">
                <span className="text-4xl">💡</span>
                <h3 className="text-xl font-bold text-clay-900">Innovation Through Partnership</h3>
                <p className="text-clay-700">
                  We don't have all the answers. We partner with communities, organisations,
                  and individuals who are already doing the work—and ask how we can support.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* By The Numbers */}
        <Card padding="xl" variant="soft" className="bg-gradient-to-br from-white to-brand-50">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-clay-900 mb-6">The Network Today</h2>
            <p className="text-lg text-clay-600 mb-8">
              Not because numbers tell the whole story, but because they hint at the scale of connection
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-brand-700 mb-2">{stats.projects}</div>
                <div className="text-sm font-medium text-clay-700">Active Projects</div>
                <div className="text-xs text-clay-500 mt-1">Each one unique</div>
              </div>

              <div className="text-center">
                <div className="text-5xl font-bold text-purple-700 mb-2">{stats.partners}</div>
                <div className="text-sm font-medium text-clay-700">Partner Organisations</div>
                <div className="text-xs text-clay-500 mt-1">And growing</div>
              </div>

              <div className="text-center">
                <div className="text-5xl font-bold text-ocean-700 mb-2">{stats.locations}</div>
                <div className="text-sm font-medium text-clay-700">Locations</div>
                <div className="text-xs text-clay-500 mt-1">Across Australia</div>
              </div>

              <div className="text-center">
                <div className="text-5xl font-bold text-amber-700 mb-2">{stats.themes}</div>
                <div className="text-sm font-medium text-clay-700">Focus Areas</div>
                <div className="text-xs text-clay-500 mt-1">All interconnected</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Our Principles (What We Think We Know) */}
        <div>
          <h2 className="text-3xl font-bold text-clay-900 mb-6">What We Think We Know</h2>
          <Card padding="xl" variant="soft">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                  <span className="text-brand-700 font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-clay-900 mb-2">Community First, Always</h3>
                  <p className="text-clay-700">
                    The community owns the narrative, the data, and the decisions. We're here to support,
                    not to lead.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-ocean-100 rounded-full flex items-center justify-center">
                  <span className="text-ocean-700 font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-clay-900 mb-2">Transparency as Default</h3>
                  <p className="text-clay-700">
                    We share our learnings, our failures, our questions. What we're building isn't proprietary—
                    it's meant to be shared, forked, and improved.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-700 font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-clay-900 mb-2">Value Beyond Money</h3>
                  <p className="text-clay-700">
                    Impact isn't just revenue or scale. It's relationships built, capacity grown,
                    stories told, and communities strengthened.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-700 font-bold">4</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-clay-900 mb-2">Design for Obsolescence</h3>
                  <p className="text-clay-700">
                    We're not trying to build an empire. We're building systems that empower others,
                    then step aside when our work is done.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* What We're Working On */}
        <div>
          <h2 className="text-3xl font-bold text-clay-900 mb-6">What We're Working On</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card padding="lg" variant="bordered">
              <div className="space-y-3">
                <Pill variant="brand">Youth Justice</Pill>
                <p className="text-sm text-clay-700">
                  Supporting communities working with young people caught in the justice system
                </p>
              </div>
            </Card>

            <Card padding="lg" variant="bordered">
              <div className="space-y-3">
                <Pill variant="ocean">Indigenous</Pill>
                <p className="text-sm text-clay-700">
                  Projects led by and for Indigenous communities, on their terms
                </p>
              </div>
            </Card>

            <Card padding="lg" variant="bordered">
              <div className="space-y-3">
                <Pill variant="purple">Economic Freedom</Pill>
                <p className="text-sm text-clay-700">
                  Exploring new models for economic sustainability and community ownership
                </p>
              </div>
            </Card>

            <Card padding="lg" variant="bordered">
              <div className="space-y-3">
                <Pill variant="amber">Storytelling</Pill>
                <p className="text-sm text-clay-700">
                  Helping communities document and share their own narratives
                </p>
              </div>
            </Card>

            <Card padding="lg" variant="bordered">
              <div className="space-y-3">
                <Pill variant="brand">Health & Wellbeing</Pill>
                <p className="text-sm text-clay-700">
                  Supporting holistic approaches to community health
                </p>
              </div>
            </Card>

            <Card padding="lg" variant="bordered">
              <div className="space-y-3">
                <Pill variant="ocean">Innovation</Pill>
                <p className="text-sm text-clay-700">
                  Experimenting with new tools, approaches, and ways of working together
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* The Invitation */}
        <Card padding="xl" variant="soft" className="bg-gradient-to-br from-brand-50 to-ocean-50 border-2 border-brand-200">
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-clay-900">Join Us in Figuring This Out</h2>
            <p className="text-lg text-clay-700 max-w-2xl mx-auto">
              We don't have a membership form or an application process. We're just a network of people
              who want to do good work together. If that resonates with you, reach out. Let's see what
              we might create together.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Pill variant="brand" size="lg">Community-owned</Pill>
              <Pill variant="ocean" size="lg">Curiosity-driven</Pill>
              <Pill variant="purple" size="lg">Relationship-first</Pill>
            </div>
          </div>
        </Card>

        {/* Footer Note */}
        <div className="text-center py-8">
          <p className="text-sm text-clay-500 italic">
            This page will evolve as we learn more about what ACT is and isn't.
            That's kind of the point.
          </p>
        </div>
      </div>
    </div>
  )
}
