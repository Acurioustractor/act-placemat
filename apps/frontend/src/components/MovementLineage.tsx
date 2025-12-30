import { Card } from './ui/Card'
import { useNavigate } from '../hooks/useNavigate'

const movementLineages = [
  {
    title: 'Civil Rights Popular Education',
    era: '1950s–60s',
    icon: '📚',
    insight: '“Strong people don’t need strong leaders.” Ella Baker and Septima Clark trained local organisers so campaigns survived without outside experts.',
    actTranslation: 'Build every ACT deployment with community training loops and documentation sprints that make our facilitation redundant.',
  },
  {
    title: 'Jubilee House & Participatory Development',
    era: '1970s–Now',
    icon: '🧺',
    insight: '“Work ourselves out of a job.” Anti-poverty teams measure success by the speed of their own irrelevance.',
    actTranslation: 'Adopt “exit clocks” for each product surface—hitting green means communities accepted stewardship and ACT’s role contracts.',
  },
  {
    title: 'Zapatista Autonomous Communities',
    era: '1994–Now',
    icon: '🌀',
    insight: 'Mandar obedeciendo (“lead by obeying”) keeps decision-making in community assemblies and asks instigators to step back.',
    actTranslation: 'Our AI agents, governance tooling, and product rituals must default to consent loops and community voting before action.',
  },
  {
    title: 'Mondragón & Cooperative Economies',
    era: '1956–Now',
    icon: '🏭',
    insight: '90+ worker-owned co-ops prove that federated ownership can outlast extractive corporations.',
    actTranslation: 'Financial intelligence modules should foreground revenue-sharing, reinvestment ratios, and pathways to cooperative control.',
  },
  {
    title: 'Indigenous Data Sovereignty / OCAP',
    era: '1990s–Now',
    icon: '🪶',
    insight: 'Ownership, Control, Access, Possession (OCAP) frames data as a communal asset that must answer to liberation, not surveillance.',
    actTranslation: 'Our intelligence layer only answers sovereignty, joy, adventure, or obsolescence questions—everything else is a polite refusal.',
  },
]

const principles = [
  {
    icon: '🌱',
    title: 'Catalysts, Not Owners',
    detail:
      'We ignite, stabilise, then disappear. Every team ritual (stand-ups, retros, launches) ends by asking “how does this make us less necessary?”',
  },
  {
    icon: '🧭',
    title: 'Community Governance First',
    detail:
      'Design interfaces, AI prompts, and data flows so communities can veto, redirect, or fork without touching ACT’s internal tooling.',
  },
  {
    icon: '💫',
    title: 'Joy & Adventure as Economic Proof',
    detail:
      'Adventure-based economics treats curiosity, art, and celebration as valid returns; our revenue stories must show how freedom scales.',
  },
  {
    icon: '📡',
    title: 'Intelligence as Guardian',
    detail:
      'Agents like DNAGuardian exist to refuse extraction, enforce consent, and surface introduction paths instead of transactions.',
  },
]

const reviewQuestions = [
  'Where is the “exit clock” for this initiative and who inside the community owns it?',
  'Which sovereignty / adventure / joy metrics will this feature report, and who decides when the data stops flowing?',
  'How does this product make an extractive system obsolete faster than last quarter?',
  'If we vanished tomorrow, what tooling or documentation remains for the community to run, adapt, and fork?',
]

const extractiveSystems = [
  {
    system: 'Consultant lock-in',
    project: 'PICC Townsville Precinct',
    criteria: 'Community contracting council approving suppliers for 90 days without ACT escalation',
    verified: '12 Mar 2025 – signed by PICC board',
    notionSource: 'Projects/PICC → field: Obsolescence.SystemsRemoved',
  },
  {
    system: 'Predatory lending',
    project: 'Goods. Manufacturing Collective',
    criteria: 'Local cooperative refinancing completed & interest payments < 6%',
    verified: '04 Mar 2025 – finance circle notes',
    notionSource: 'Financial Intelligence → Loans → status: Sovereign',
  },
  {
    system: 'Cultural extraction',
    project: 'Story Studio Network',
    criteria: 'OCAP-compliant story agreements + community-owned distribution server live',
    verified: '22 Feb 2025 – Story Elders council minutes',
    notionSource: 'Stories DB → Consent Protocol state',
  },
  {
    system: 'Data hoarding',
    project: 'Infrastructure Registry',
    criteria: 'DNAGuardian log shows 3 consecutive months of ≥90% decline rate on non-sovereign queries',
    verified: '01 Mar 2025 – DNAGuardian #452 audit',
    notionSource: 'AI Governance → Integrity Log',
  },
]

const scoreboardSnapshots = [
  {
    label: 'Communities in orbit',
    value: 11,
    lastUpdated: '08 Mar 2025',
    trend: '+2 since Dec',
    description: 'Projects with Orbit status + last ACT action > 60 days ago',
    source: 'Notion Projects DB → Status field',
    callout: ['MingaMinga Rangers', 'Goods.', 'PICC Precinct', 'Dad.Lab.25'],
  },
  {
    label: 'Joy & adventure entries',
    value: 1247,
    lastUpdated: 'Rolling 90 days',
    trend: '+318 vs prior',
    description: 'Story Studio uploads + Desert Festival badges tagged “joy/adventure”',
    source: 'Story Studio DB + Festival Badges DB',
  },
  {
    label: 'Data refusals upheld',
    value: '86%',
    lastUpdated: 'Feb 2025',
    trend: '+6pts vs Jan',
    description: 'Queries declined because they were not sovereignty/joy aligned',
    source: 'DNAGuardian refusal ledger',
  },
]

const notionRequirements = [
  {
    area: 'Exit clocks',
    what: 'Every project stores expected exit date, steward, last ACT intervention, and verification doc link.',
    tables: ['Projects DB → Orbit Timeline', 'Communities DB → Stewardship notes'],
  },
  {
    area: 'Extractive systems',
    what: 'Per-project list of systems targeted, criteria for “sunsetted”, verification artefact, and community signer.',
    tables: ['Projects DB → Obsolescence tracker', 'Governance DB → Agreements'],
  },
  {
    area: 'Joy/adventure ledger',
    what: 'Story Studio entries tagged with feeling, location, participants, and whether community approved public sharing.',
    tables: ['Story Studio DB', 'Festival Badges DB'],
  },
  {
    area: 'Intelligence refusals',
    what: 'Every declined query logged with requester, reason, and guardian who blocked it so percentages are auditable.',
    tables: ['AI Governance DB → DNAGuardian log'],
  },
  {
    area: 'Orbit evidence locker',
    what: 'Upload community-signed artefacts (meeting minutes, contracts) and tie them to the metric snapshot that cites them.',
    tables: ['Evidence DB linked to Projects'],
  },
]

export function MovementLineage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-clay-50">
      <section className="bg-gradient-to-br from-brand-50 via-ocean-50 to-purple-50 border-b border-clay-200">
        <div className="max-w-5xl mx-auto px-8 py-16 space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] font-semibold text-brand-700">Historical Lineage</p>
          <h1 className="text-4xl md:text-5xl font-bold text-clay-900">
            Movements that Teach Us How to Disappear Beautifully
          </h1>
          <p className="text-lg md:text-xl text-clay-700 max-w-3xl mx-auto">
            We are a continuation of decentralists, cooperativists, and Indigenous sovereigntists who built systems
            engineered for their own irrelevance. This page keeps that inheritance in front of every product decision.
          </p>
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-full border border-clay-200 shadow-soft">
            <span className="text-xl">🌀</span>
            <span className="text-sm font-semibold text-clay-700">“When their work is done, they will say: we did it ourselves.”</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 space-y-12">
        <section>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Lineage Map</p>
              <h2 className="text-3xl font-bold text-clay-900 mt-2">Who We’re Learning From</h2>
            </div>
            <span className="text-sm font-semibold text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-full px-4 py-2">
              Updated as new elders join the movement
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {movementLineages.map((lineage) => (
              <Card key={lineage.title} padding="lg" hover variant="soft">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{lineage.icon}</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-clay-900">{lineage.title}</h3>
                      <span className="text-xs font-semibold text-clay-500 uppercase tracking-widest">{lineage.era}</span>
                    </div>
                    <p className="text-clay-700">{lineage.insight}</p>
                    <div className="bg-clay-50 border border-clay-200 rounded-2xl p-4">
                      <p className="text-sm font-semibold text-brand-800 uppercase tracking-[0.2em]">ACT translation</p>
                      <p className="text-clay-700 mt-2">{lineage.actTranslation}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card padding="xl" className="bg-white border border-clay-200">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-clay-900">Visualisations Lab</h3>
            <p className="text-clay-600">
              Explore constellation, explorer, and geographic views in the dedicated Visualisations tab. Use it to experiment,
              spot patterns, and co-design with communities.
            </p>
            <button
              onClick={() => navigate('?tab=visualisations')}
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              Open Visualisations
            </button>
          </div>
        </Card>

        <section>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Operating Code</p>
              <h2 className="text-3xl font-bold text-clay-900 mt-2">Principles We Inherit</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {principles.map((principle) => (
              <Card key={principle.title} padding="lg" hover>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{principle.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-clay-900 mb-2">{principle.title}</h3>
                    <p className="text-clay-700">{principle.detail}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Review Lens</p>
              <h2 className="text-3xl font-bold text-clay-900 mt-2">Questions Every Reviewer Should Ask</h2>
            </div>
          </div>
          <Card padding="xl" variant="soft">
            <div className="grid md:grid-cols-2 gap-6">
              {reviewQuestions.map((question) => (
                <div key={question} className="border border-clay-200 rounded-2xl p-4 bg-white/70">
                  <p className="text-sm font-semibold text-brand-700 uppercase tracking-[0.2em] mb-2">Review prompt</p>
                  <p className="text-clay-800">{question}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Obsolescence Scoreboard</p>
              <h2 className="text-3xl font-bold text-clay-900 mt-2">How We Know the Lineage is Alive</h2>
            </div>
            <div className="text-xs font-semibold text-clay-600 bg-white border border-clay-200 rounded-full px-4 py-2">
              Last reviewed: 12 Mar 2025 · Owner: Movement Stewardship Team
            </div>
          </div>

          <Card padding="xl" className="bg-gradient-to-br from-white to-brand-50 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Verified Wins</p>
                <h3 className="text-2xl font-bold text-clay-900">Extractive Systems Sunsetted</h3>
              </div>
              <span className="text-sm font-semibold text-brand-800">Evidence linked in Notion</span>
            </div>
            <div className="space-y-4">
              {extractiveSystems.map((system) => (
                <div
                  key={system.system}
                  className="rounded-2xl border border-clay-200 bg-white/70 p-4 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-clay-900">{system.system}</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-full px-3 py-1">
                      {system.project}
                    </span>
                  </div>
                  <p className="text-sm text-clay-700">{system.criteria}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-clay-600">
                    <span>Verified: {system.verified}</span>
                    <span className="text-brand-700 font-semibold">{system.notionSource}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            {scoreboardSnapshots.map((snapshot) => (
              <Card key={snapshot.label} padding="lg" className="bg-white border border-clay-200">
                <p className="text-sm font-semibold text-clay-500 uppercase tracking-[0.3em]">{snapshot.label}</p>
                <p className="text-4xl font-bold text-clay-900 mt-3">{snapshot.value}</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">{snapshot.trend}</p>
                <p className="text-clay-600 mt-3 text-sm">{snapshot.description}</p>
                <div className="mt-4 text-xs text-clay-500">
                  <p>Source: {snapshot.source}</p>
                  <p>Last updated: {snapshot.lastUpdated}</p>
                </div>
                {snapshot.callout && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600 mb-1">Highlights</p>
                    <div className="flex flex-wrap gap-2">
                      {snapshot.callout.map((item) => (
                        <span
                          key={item}
                          className="text-xs font-semibold text-clay-700 bg-clay-100 rounded-full px-3 py-1"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Data Requirements</p>
              <h2 className="text-3xl font-bold text-clay-900 mt-2">What Notion Must Capture to Keep This Honest</h2>
            </div>
            <span className="text-sm font-semibold text-clay-600 bg-clay-100 border border-clay-200 rounded-full px-4 py-2">
              Review quarterly with data stewards
            </span>
          </div>
          <div className="space-y-4">
            {notionRequirements.map((req) => (
              <Card key={req.area} padding="lg" className="bg-white border border-clay-200">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-clay-900">{req.area}</h3>
                </div>
                <p className="text-clay-700 mb-3">{req.what}</p>
                <div className="text-xs font-semibold text-brand-700 uppercase tracking-[0.3em]">Linked tables</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {req.tables.map((table) => (
                    <span
                      key={table}
                      className="text-xs font-semibold text-clay-700 bg-clay-100 rounded-full px-3 py-1"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
