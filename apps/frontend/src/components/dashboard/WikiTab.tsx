/**
 * WikiTab - ACT Philosophy & Knowledge
 *
 * Displays:
 * - LCAA Methodology (Listen → Curiosity → Action → Art)
 * - 10 Principles of Practice
 * - Beautiful Obsolescence concept
 *
 * Source: /Users/benknight/Code/act-regenerative-studio/compendium/
 */

import { useState } from 'react'

type WikiSection = 'lcaa' | 'principles' | 'obsolescence'

export function WikiTab() {
  const [activeSection, setActiveSection] = useState<WikiSection>('lcaa')

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar Navigation */}
      <nav className="col-span-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Philosophy
          </h3>
          <ul className="space-y-1">
            <NavItem
              active={activeSection === 'lcaa'}
              onClick={() => setActiveSection('lcaa')}
            >
              LCAA Methodology
            </NavItem>
            <NavItem
              active={activeSection === 'principles'}
              onClick={() => setActiveSection('principles')}
            >
              10 Principles
            </NavItem>
            <NavItem
              active={activeSection === 'obsolescence'}
              onClick={() => setActiveSection('obsolescence')}
            >
              Beautiful Obsolescence
            </NavItem>
          </ul>
        </div>
      </nav>

      {/* Content Area */}
      <main className="col-span-9">
        {activeSection === 'lcaa' && <LCAAContent />}
        {activeSection === 'principles' && <PrinciplesContent />}
        {activeSection === 'obsolescence' && <ObsolescenceContent />}
      </main>
    </div>
  )
}

// Navigation Item
function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`
          w-full text-left px-3 py-2 text-sm rounded-md transition-colors
          ${active
            ? 'bg-emerald-50 text-emerald-700 font-medium'
            : 'text-slate-600 hover:bg-slate-50'
          }
        `}
      >
        {children}
      </button>
    </li>
  )
}

// LCAA Content
function LCAAContent() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        LCAA Methodology
      </h2>
      <p className="text-slate-600 mb-6">
        LCAA (Listen, Curiosity, Action, Art) is ACT's core methodology. It's not linear—each phase informs the others in ongoing cycles. Think of it as a story arc we return to.
      </p>

      {/* LCAA Visual */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <PhaseCard
          phase="L"
          title="Listen"
          quote="We sit in silence to take in knowledge"
          color="emerald"
          items={['Country', 'Traditional Owners', 'Community', 'Elders', 'Youth', 'The Silenced']}
        />
        <PhaseCard
          phase="C"
          title="Curiosity"
          quote="We lean into the unknown with open minds and hearts"
          color="amber"
          items={['What if?', 'How might we?', 'Who says?', "What's possible?", "What are we missing?"]}
        />
        <PhaseCard
          phase="A"
          title="Action"
          quote="We are makers who play and take chances"
          color="orange"
          items={['Platforms', 'Products', 'Spaces', 'Experiences', 'Systems']}
        />
        <PhaseCard
          phase="A"
          title="Art"
          quote="We recognize art as the first form of revolution"
          color="violet"
          items={['Installations', 'Storytelling', 'Visual Identity', 'Performance', 'Land Art']}
        />
      </div>

      {/* Loop Indicator */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span><strong>Art returns us to Listen.</strong> The cycle continues.</span>
        </div>
      </div>

      {/* Field Note */}
      <FieldNote>
        If we cannot hand it over, we are still in Curiosity.
      </FieldNote>
    </div>
  )
}

// Phase Card
function PhaseCard({ phase, title, quote, color, items }: {
  phase: string
  title: string
  quote: string
  color: 'emerald' | 'amber' | 'orange' | 'violet'
  items: string[]
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold mb-1">{phase}</div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-xs italic mb-3">"{quote}"</p>
      <ul className="text-xs space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-slate-600">• {item}</li>
        ))}
      </ul>
    </div>
  )
}

// Principles Content
function PrinciplesContent() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        10 Principles of Practice
      </h2>
      <p className="text-slate-600 mb-6">
        These principles are the backbone of the compendium, not slogans. They are choices we make in rooms, in code, on Country, and in how we show up.
      </p>

      <div className="space-y-4">
        <Principle number={1} title="Country Sets the Pace">
          The land is the teacher and the limiter. We do not scale beyond land capacity or community readiness.
        </Principle>

        <Principle number={2} title="Community Authority Comes First">
          Consent, cultural protocols, and local authority are non-negotiable. OCAP is enforced in code and practice.
        </Principle>

        <Principle number={3} title="Identity Before Product">
          We start with belonging, not features. Events are culture, not marketing.
        </Principle>

        <Principle number={4} title="Build for Handover (Beautiful Obsolescence)">
          We design for transfer from day one. Documentation, training, and governance are deliverables.
        </Principle>

        <Principle number={5} title="Make with Lived Experience">
          Lived experience is not advisory; it is core capability.
        </Principle>

        <Principle number={6} title="Enterprise Funds the Commons">
          Goods, Harvest, and enterprise fund land care and community value, not extraction.
        </Principle>

        <Principle number={7} title="Evidence is Story, Not Surveillance">
          We do not profile people. We track system-level signals and learn from consented stories.
        </Principle>

        <Principle number={8} title="Tools Should Create Space">
          Infrastructure should be quiet. The system is the tractor, the humans are the farmers.
        </Principle>

        <Principle number={9} title="Share with Care">
          The shareability matrix is respect in practice. If a story cannot be told without harm, we do not tell it.
        </Principle>

        <Principle number={10} title="Art Returns Us to Listen">
          Art is not a layer on top. It is how we make change felt and understood.
        </Principle>
      </div>

      <FieldNote className="mt-6">
        When principles conflict, prioritize: (1) Country sets the pace, (2) Community authority comes first, (3) Share with care.
      </FieldNote>
    </div>
  )
}

// Principle Card
function Principle({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 p-4 bg-slate-50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-1">{children}</p>
      </div>
    </div>
  )
}

// Beautiful Obsolescence Content
function ObsolescenceContent() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        Beautiful Obsolescence
      </h2>
      <p className="text-slate-600 mb-6">
        Design for handover, not dependency. Success is measured by how well ACT can step back.
      </p>

      {/* The Curious Tractor Metaphor */}
      <div className="bg-emerald-50 rounded-lg p-5 mb-6">
        <h3 className="font-semibold text-emerald-900 mb-3">The Curious Tractor Metaphor</h3>
        <p className="text-sm text-emerald-800 mb-4">
          A tractor's <strong>Power Take-Off (PTO)</strong> transfers engine power to attached equipment. The tractor provides power; the equipment does the work.
        </p>
        <ul className="text-sm text-emerald-700 space-y-2">
          <li>• <strong>Communities</strong> are the equipment (doing transformative work)</li>
          <li>• <strong>ACT</strong> is the power source (capacity, methodology, connections)</li>
          <li>• <strong>Connection is temporary</strong> (attach/detach as needed)</li>
          <li>• <strong>Equipment becomes independent</strong> (communities generate their own power)</li>
        </ul>
      </div>

      {/* What Handover Means */}
      <h3 className="font-semibold text-slate-900 mb-3">What Handover Means</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <HandoverItem
          title="Documentation"
          description="Playbooks, processes, and knowledge for self-hosting"
          icon="📚"
        />
        <HandoverItem
          title="Training"
          description="Community members trained to operate independently"
          icon="🎓"
        />
        <HandoverItem
          title="Ownership"
          description="Data, stories, and decisions belong to community"
          icon="🔑"
        />
        <HandoverItem
          title="Exit Strategy"
          description="Planned sunset, not hoped-for independence"
          icon="🚪"
        />
      </div>

      <FieldNote>
        If we cannot hand it over, we are still in Curiosity. Success = communities generate their own power.
      </FieldNote>
    </div>
  )
}

// Handover Item
function HandoverItem({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="flex gap-3 p-4 bg-slate-50 rounded-lg">
      <div className="text-2xl">{icon}</div>
      <div>
        <h4 className="font-medium text-slate-900">{title}</h4>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  )
}

// Field Note Component
function FieldNote({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-amber-50 border-l-4 border-amber-400 p-4 ${className}`}>
      <p className="text-sm text-amber-800 italic">
        <span className="font-semibold not-italic">Field note:</span> {children}
      </p>
    </div>
  )
}
