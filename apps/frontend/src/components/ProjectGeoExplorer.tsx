import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Project, RocketBoosterStage } from '../types/project'
import { resolveApiUrl } from '../config/env'
import { DEMO_PROJECTS } from '../data/demoProjects'
import { getDefaultAutonomy, getProjectStage, stageColors, stageLabels, stageSolidColors } from '../utils/projectStage'
import { Card } from './ui/Card'

interface GeoProject {
  project: Project
  lat: number
  lng: number
  stage: RocketBoosterStage
}

interface Cluster {
  key: string
  lat: number
  lng: number
  projects: GeoProject[]
}

const australiaCenter: [number, number] = [-25.2744, 133.7751]

function parseCoordinates(project: Project): { lat: number; lng: number } | null {
  if (typeof project.latitude === 'number' && typeof project.longitude === 'number') {
    return { lat: project.latitude, lng: project.longitude }
  }

  if (project.relatedPlaces?.length) {
    for (const place of project.relatedPlaces) {
      if (typeof place.lat === 'number' && typeof place.lng === 'number') {
        return { lat: place.lat, lng: place.lng }
      }
      if (place.map) {
        const match = place.map.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
        if (match) {
          const lat = parseFloat(match[1])
          const lng = parseFloat(match[2])
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng }
          }
        }
      }
    }
  }

  return null
}

interface ProjectGeoExplorerProps {
  onProjectSelect?: (project: Project) => void
}

export function ProjectGeoExplorer({ onProjectSelect }: ProjectGeoExplorerProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [usingDemo, setUsingDemo] = useState(false)
  const [stageFilter, setStageFilter] = useState<'all' | RocketBoosterStage>('all')
  const [themeFilter, setThemeFilter] = useState<string>('all')
  const [showLabels, setShowLabels] = useState(true)
  const [showHeat, setShowHeat] = useState(true)
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/real/projects'))
        if (!response.ok) throw new Error('Failed to load projects')
        const data = await response.json()
        const fetched = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : []
        if (fetched.length) {
          setProjects(fetched)
          setUsingDemo(false)
        } else {
          setProjects(DEMO_PROJECTS)
          setUsingDemo(true)
        }
      } catch (error) {
        console.error('Unable to load geo projects', error)
        setProjects(DEMO_PROJECTS)
        setUsingDemo(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const themeOptions = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((project) => (project.themes || []).forEach((theme) => set.add(theme)))
    return Array.from(set).sort()
  }, [projects])

  const geoProjects = useMemo<GeoProject[]>(() => {
    return projects
      .map((project) => {
        const coords = parseCoordinates(project)
        if (!coords) return null
        const stage = getProjectStage(project)
        return { project, lat: coords.lat, lng: coords.lng, stage }
      })
      .filter((item): item is GeoProject => item !== null)
  }, [projects])

  const filteredProjects = useMemo(() => {
    return geoProjects.filter((geo) => {
      const matchesStage = stageFilter === 'all' || geo.stage === stageFilter
      const matchesTheme =
        themeFilter === 'all' ||
        (geo.project.themes || [])
          .map((theme) => theme.toLowerCase())
          .includes(themeFilter.toLowerCase())
      return matchesStage && matchesTheme
    })
  }, [geoProjects, stageFilter, themeFilter])

  const clusters = useMemo<Cluster[]>(() => {
    const map = new Map<string, Cluster>()
    filteredProjects.forEach((geo) => {
      const key = `${geo.lat.toFixed(2)},${geo.lng.toFixed(2)}`
      const existing = map.get(key)
      if (existing) {
        existing.projects.push(geo)
      } else {
        map.set(key, {
          key,
          lat: geo.lat,
          lng: geo.lng,
          projects: [geo],
        })
      }
    })
    return Array.from(map.values())
  }, [filteredProjects])

  const regionBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    filteredProjects.forEach((geo) => {
      const place = geo.project.relatedPlaces?.[0]
      const region = place?.state || place?.displayName || 'Unknown'
      counts.set(region, (counts.get(region) || 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [filteredProjects])

  const selectedCluster = useMemo(() => {
    if (!selectedLocationKey) return null
    return clusters.find((cluster) => cluster.key === selectedLocationKey) || null
  }, [clusters, selectedLocationKey])

  useEffect(() => {
    if (selectedLocationKey && !clusters.some((cluster) => cluster.key === selectedLocationKey)) {
      setSelectedLocationKey(null)
    }
  }, [clusters, selectedLocationKey])

  if (loading) {
    return (
      <Card padding="lg" className="bg-white border border-clay-200">
        <p>Loading geographic view…</p>
      </Card>
    )
  }

  if (!filteredProjects.length) {
    return (
      <Card padding="lg" className="bg-white border border-clay-200">
        <p>No projects have valid coordinates yet. Add lat/lng fields or place map links in Notion.</p>
      </Card>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Geography</p>
          <h3 className="text-2xl font-bold text-clay-900">Project Location Explorer</h3>
          <p className="text-sm text-clay-600">
            Toggle stages and themes to see where projects cluster. Heat shows concentration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span
            className={`rounded-full px-3 py-1 ${
              usingDemo ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {usingDemo ? 'Demo snapshot' : 'Live Notion data'}
          </span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as 'all' | RocketBoosterStage)}
            className="bg-white border border-clay-200 rounded-full px-3 py-1 text-clay-700"
          >
            <option value="all">All stages</option>
            {Object.entries(stageLabels).map(([stage, label]) => (
              <option key={stage} value={stage}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="bg-white border border-clay-200 rounded-full px-3 py-1 text-clay-700"
          >
            <option value="all">All themes</option>
            {themeOptions.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 bg-white border border-clay-200 rounded-full px-3 py-1 text-clay-700">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
            Labels
          </label>
          <label className="flex items-center gap-2 bg-white border border-clay-200 rounded-full px-3 py-1 text-clay-700">
            <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
            Heat
          </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        <Card padding="none" className="overflow-hidden">
          <MapContainer
            center={clusters[0] ? [clusters[0].lat, clusters[0].lng] : australiaCenter}
            zoom={5}
            style={{ height: '480px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {clusters.map((cluster) => {
              const totalProjects = cluster.projects.length
              const stage = cluster.projects[0]?.stage || 'launch'
              const color = stageSolidColors[stage]
              const radius = 12 + totalProjects * 4
              const heatRadius = radius * 2.2
              const averageAutonomy =
                cluster.projects.reduce((sum, item) => sum + (item.project.autonomyScore ?? getDefaultAutonomy(item.stage)), 0) /
                totalProjects

              return (
                <div key={`${cluster.lat}-${cluster.lng}`}>
                  {showHeat && (
                    <CircleMarker
                      center={[cluster.lat, cluster.lng]}
                      radius={heatRadius}
                      pathOptions={{ color: '#fb7185', fillOpacity: 0.12, opacity: 0 }}
                    />
                  )}
                  <CircleMarker
                    center={[cluster.lat, cluster.lng]}
                    radius={radius}
                    pathOptions={{
                      color: '#0f172a',
                      weight: 1,
                      fillColor: color,
                      fillOpacity: 0.85,
                    }}
                    eventHandlers={{
                      click: () => setSelectedLocationKey(cluster.key),
                    }}
                  >
                    {showLabels && (
                      <Tooltip permanent direction="top" offset={[0, -radius / 2]}>
                        <div className="text-xs font-semibold text-clay-900">
                          {cluster.projects[0]?.project.relatedPlaces?.[0]?.displayName || 'Community'}
                        </div>
                        <div className="text-[11px] text-clay-600">
                          {totalProjects} projects · Avg autonomy {Math.round(averageAutonomy)}%
                        </div>
                      </Tooltip>
                    )}
                  </CircleMarker>
                </div>
              )
            })}
          </MapContainer>
          <div className="px-4 py-3 bg-clay-50 border-t border-clay-100 flex flex-wrap items-center gap-4 text-xs text-clay-600">
            {Object.entries(stageLabels).map(([stage, label]) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="inline-flex h-3 w-3 rounded-full" style={{ background: stageColors[stage as RocketBoosterStage] }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="bg-white border border-clay-200 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Hot spots</p>
            <ul className="mt-3 space-y-3">
              {regionBreakdown.map(([region, count]) => (
                <li key={region} className="flex items-center justify-between">
                  <span className="font-semibold text-clay-900">{region}</span>
                  <span className="text-sm text-clay-600">{count} projects</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Project list</p>
            <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-2">
              {clusters.map((cluster) => (
                <button
                  key={cluster.key}
                  onClick={() => setSelectedLocationKey(cluster.key)}
                  className={`w-full text-left border rounded-xl p-3 transition ${
                    cluster.key === selectedLocationKey
                      ? 'border-brand-200 bg-brand-50 shadow-sm'
                      : 'border-clay-100 hover:border-brand-200 hover:bg-brand-50/50'
                  }`}
                >
                  <div className="text-sm font-semibold text-clay-900">
                    {cluster.projects[0]?.project.relatedPlaces?.[0]?.displayName || 'Community location'}
                  </div>
                  <div className="text-xs text-clay-500">
                    {cluster.projects.length} projects ·{' '}
                    {stageLabels[getProjectStage(cluster.projects[0]?.project ?? projects[0])]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {selectedCluster && (
        <Card padding="xl" className="mt-6 bg-white border border-clay-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Selected location</p>
              <h3 className="text-2xl font-bold text-clay-900">
                {selectedCluster.projects[0]?.project.relatedPlaces?.[0]?.displayName || 'Community location'}
              </h3>
              <p className="text-sm text-clay-500">{selectedCluster.projects.length} projects in this cluster</p>
            </div>
            <button
              onClick={() => setSelectedLocationKey(null)}
              className="rounded-full border border-clay-200 px-4 py-2 text-sm font-semibold text-clay-700 hover:bg-clay-50"
            >
              Clear selection
            </button>
          </div>
          <div className="grid gap-4">
            {selectedCluster.projects.map(({ project, stage }) => (
              <div key={project.id} className="border border-clay-100 rounded-2xl p-4 space-y-2 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-clay-900">{project.name}</p>
                    <p className="text-xs text-clay-500">{stageLabels[stage]}</p>
                  </div>
                  <div className="text-sm text-clay-600 text-right">
                    <p>
                      Autonomy:{' '}
                      <span className="font-semibold text-ocean-700">
                        {project.autonomyScore !== undefined ? `${project.autonomyScore}/100` : 'Not measured'}
                      </span>
                    </p>
                    {project.nextMilestoneDate && (
                      <p>
                        Next milestone:{' '}
                        <span className="font-semibold text-amber-700">
                          {new Date(project.nextMilestoneDate).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {(project.aiSummary || project.description) && (
                  <p className="text-sm text-clay-700">{project.aiSummary || project.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {(project.themes || []).map((theme) => (
                    <span key={theme} className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-800">
                      {theme}
                    </span>
                  ))}
                  {Array.isArray(project.coreValues)
                    ? project.coreValues.map((value) => (
                        <span key={value} className="text-xs font-semibold px-3 py-1 rounded-full bg-clay-100 text-clay-700">
                          {value}
                        </span>
                      ))
                    : null}
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => onProjectSelect?.(project)}
                    className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    View project detail
                  </button>
                  {project.notionUrl && (
                    <a
                      href={project.notionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-clay-200 px-4 py-2 text-xs font-semibold text-clay-700 hover:bg-clay-50"
                    >
                      Open in Notion
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  )
}
