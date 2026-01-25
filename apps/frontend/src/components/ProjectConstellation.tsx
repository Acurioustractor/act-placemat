/**
 * ProjectConstellation - Force-Directed Network Graph
 *
 * Data Visualization Expert Approach:
 * - Projects as nodes with size = autonomy, color = stage
 * - Edges connect projects sharing themes, people, or organizations
 * - Force simulation clusters related projects naturally
 * - Smooth animations with framer-motion
 * - Interactive: hover reveals connections, click for details
 */

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { resolveApiUrl } from '../config/env'
import type { Project, RocketBoosterStage } from '../types/project'
import { getDefaultAutonomy, getProjectStage, stageColors, stageLabels } from '../utils/projectStage'
import { DEMO_PROJECTS } from '../data/demoProjects'

interface Node {
  id: string
  project: Project
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  stage: RocketBoosterStage | 'unknown'
  autonomy: number
  themes: string[]
  people: string[]
  orgs: string[]
}

interface Edge {
  source: string
  target: string
  strength: number // 0-1, based on how many attributes are shared
  sharedThemes: string[]
  sharedPeople: string[]
  sharedOrgs: string[]
}

interface ProjectConstellationProps {
  onProjectSelect?: (project: Project) => void
}

// Stage colors as hex for SVG
const STAGE_HEX: Record<string, string> = {
  orbit: '#10b981',
  beautiful_obsolescence: '#a855f7',
  sustain: '#3b82f6',
  scale: '#06b6d4',
  launch: '#f59e0b',
  incubate: '#f97316',
  ideate: '#ec4899',
  unknown: '#64748b',
}

export function ProjectConstellation({ onProjectSelect }: ProjectConstellationProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [usingDemo, setUsingDemo] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showConnections, setShowConnections] = useState(true)
  const [minConnectionStrength, setMinConnectionStrength] = useState(0.3)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const svgRef = useRef<SVGSVGElement>(null)
  const animationRef = useRef<number | null>(null)

  const WIDTH = 900
  const HEIGHT = 600
  const CENTER_X = WIDTH / 2
  const CENTER_Y = HEIGHT / 2

  // Fetch projects
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
        console.error('Unable to load constellation projects', error)
        setProjects(DEMO_PROJECTS)
        setUsingDemo(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // Build nodes and edges from projects
  useEffect(() => {
    if (projects.length === 0) return

    // Create nodes
    const newNodes: Node[] = projects.map((project, i) => {
      const stage = getProjectStage(project)
      const autonomy = project.autonomyScore ?? getDefaultAutonomy(stage)
      const radius = 8 + (autonomy / 100) * 20 // 8-28px based on autonomy

      // Initial position in a circle
      const angle = (i / projects.length) * 2 * Math.PI
      const initialRadius = Math.min(WIDTH, HEIGHT) * 0.35

      return {
        id: project.id,
        project,
        x: CENTER_X + initialRadius * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y: CENTER_Y + initialRadius * Math.sin(angle) + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        radius,
        stage,
        autonomy,
        themes: project.themes || [],
        people: project.relatedPeople || [],
        orgs: project.relatedOrganisations || [],
      }
    })

    // Create edges based on shared attributes
    const newEdges: Edge[] = []
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const a = newNodes[i]
        const b = newNodes[j]

        const sharedThemes = a.themes.filter(t => b.themes.includes(t))
        const sharedPeople = a.people.filter(p => b.people.includes(p))
        const sharedOrgs = a.orgs.filter(o => b.orgs.includes(o))

        const totalShared = sharedThemes.length + sharedPeople.length + sharedOrgs.length

        if (totalShared > 0) {
          // Normalize strength: more shared = stronger connection
          const maxPossible = Math.max(
            a.themes.length + a.people.length + a.orgs.length,
            b.themes.length + b.people.length + b.orgs.length,
            1
          )
          const strength = Math.min(totalShared / maxPossible, 1)

          newEdges.push({
            source: a.id,
            target: b.id,
            strength,
            sharedThemes,
            sharedPeople,
            sharedOrgs,
          })
        }
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [projects])

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return

    let localNodes = [...nodes]
    const alpha = 0.3
    const decay = 0.99
    let currentAlpha = alpha

    const simulate = () => {
      if (currentAlpha < 0.001) {
        // Simulation cooled down
        return
      }

      // Apply forces
      localNodes = localNodes.map(node => {
        let fx = 0
        let fy = 0

        // 1. Centering force - pull toward center
        const dx = CENTER_X - node.x
        const dy = CENTER_Y - node.y
        fx += dx * 0.01 * currentAlpha
        fy += dy * 0.01 * currentAlpha

        // 2. Repulsion from other nodes
        localNodes.forEach(other => {
          if (other.id === node.id) return
          const ddx = node.x - other.x
          const ddy = node.y - other.y
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1
          const minDist = node.radius + other.radius + 20

          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.5 * currentAlpha
            fx += ddx * force
            fy += ddy * force
          }
        })

        // 3. Attraction along edges
        edges.forEach(edge => {
          if (edge.source !== node.id && edge.target !== node.id) return
          const otherId = edge.source === node.id ? edge.target : edge.source
          const other = localNodes.find(n => n.id === otherId)
          if (!other) return

          const ddx = other.x - node.x
          const ddy = other.y - node.y
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1
          const idealDist = 100 + (1 - edge.strength) * 150 // Stronger = closer

          const force = (dist - idealDist) / dist * 0.02 * edge.strength * currentAlpha
          fx += ddx * force
          fy += ddy * force
        })

        // 4. Keep within bounds
        const margin = 50
        if (node.x < margin) fx += (margin - node.x) * 0.1
        if (node.x > WIDTH - margin) fx += (WIDTH - margin - node.x) * 0.1
        if (node.y < margin) fy += (margin - node.y) * 0.1
        if (node.y > HEIGHT - margin) fy += (HEIGHT - margin - node.y) * 0.1

        return {
          ...node,
          vx: (node.vx + fx) * 0.8, // Damping
          vy: (node.vy + fy) * 0.8,
          x: node.x + node.vx,
          y: node.y + node.vy,
        }
      })

      setNodes([...localNodes])
      currentAlpha *= decay

      animationRef.current = requestAnimationFrame(simulate)
    }

    animationRef.current = requestAnimationFrame(simulate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [nodes.length, edges.length]) // Only run when structure changes

  // Get edges connected to a node
  const getConnectedEdges = useCallback((nodeId: string) => {
    return edges.filter(e => e.source === nodeId || e.target === nodeId)
  }, [edges])

  // Get connected node IDs
  const getConnectedNodeIds = useCallback((nodeId: string) => {
    const connected = new Set<string>()
    edges.forEach(e => {
      if (e.source === nodeId) connected.add(e.target)
      if (e.target === nodeId) connected.add(e.source)
    })
    return connected
  }, [edges])

  // Stats
  const stats = useMemo(() => {
    const byStage: Record<string, number> = {}
    nodes.forEach(n => {
      byStage[n.stage] = (byStage[n.stage] || 0) + 1
    })
    const avgAutonomy = nodes.reduce((sum, n) => sum + n.autonomy, 0) / (nodes.length || 1)
    const strongConnections = edges.filter(e => e.strength >= 0.5).length
    return { byStage, avgAutonomy: Math.round(avgAutonomy), strongConnections, totalEdges: edges.length }
  }, [nodes, edges])

  const selectedProject = selectedNode ? nodes.find(n => n.id === selectedNode)?.project : null
  const connectedToHovered = hoveredNode ? getConnectedNodeIds(hoveredNode) : new Set<string>()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-slate-600">Building constellation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Network Graph</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Project Constellation</h2>
          <p className="text-sm text-slate-500 mt-1">
            Projects connected by shared themes, people, and organizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            usingDemo
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {usingDemo ? 'Demo data' : 'Live data'}
          </span>
          <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs">
            <input
              type="checkbox"
              checked={showConnections}
              onChange={(e) => setShowConnections(e.target.checked)}
              className="rounded text-emerald-500"
            />
            <span>Show connections</span>
          </label>
          <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs">
            <span>Min strength</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minConnectionStrength}
              onChange={(e) => setMinConnectionStrength(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="w-8 text-slate-600">{Math.round(minConnectionStrength * 100)}%</span>
          </label>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-slate-900">{nodes.length}</div>
          <div className="text-xs text-slate-500">Projects</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-emerald-600">{stats.totalEdges}</div>
          <div className="text-xs text-slate-500">Connections</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-blue-600">{stats.strongConnections}</div>
          <div className="text-xs text-slate-500">Strong links (≥50%)</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-violet-600">{stats.avgAutonomy}%</div>
          <div className="text-xs text-slate-500">Avg autonomy</div>
        </div>
      </div>

      {/* Main visualization */}
      <div className="bg-slate-950 rounded-2xl overflow-hidden relative">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.15),transparent_50%)]" />

        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          style={{ minHeight: 500 }}
        >
          {/* Edges */}
          {showConnections && edges
            .filter(e => e.strength >= minConnectionStrength)
            .map(edge => {
              const source = nodes.find(n => n.id === edge.source)
              const target = nodes.find(n => n.id === edge.target)
              if (!source || !target) return null

              const isHighlighted = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode)
              const isDimmed = hoveredNode && !isHighlighted

              return (
                <motion.line
                  key={`${edge.source}-${edge.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted ? '#10b981' : '#475569'}
                  strokeWidth={isHighlighted ? 2 : edge.strength * 2 + 0.5}
                  strokeOpacity={isDimmed ? 0.05 : isHighlighted ? 0.8 : edge.strength * 0.3}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: Math.random() * 0.5 }}
                />
              )
            })}

          {/* Nodes */}
          {nodes.map(node => {
            const isHovered = hoveredNode === node.id
            const isSelected = selectedNode === node.id
            const isConnected = connectedToHovered.has(node.id)
            const isDimmed = hoveredNode && !isHovered && !isConnected

            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: Math.random() * 0.3 }}
              >
                {/* Glow effect */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius + 8}
                  fill={STAGE_HEX[node.stage]}
                  fillOpacity={isHovered || isSelected ? 0.3 : 0.1}
                  className="transition-all duration-200"
                />

                {/* Main node */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered || isSelected ? node.radius + 4 : node.radius}
                  fill={STAGE_HEX[node.stage]}
                  stroke={isSelected ? '#ffffff' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.2)'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                  fillOpacity={isDimmed ? 0.2 : 1}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                  whileHover={{ scale: 1.1 }}
                />

                {/* Pulse animation for high-autonomy projects */}
                {node.autonomy >= 70 && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius}
                    fill="none"
                    stroke={STAGE_HEX[node.stage]}
                    strokeWidth="2"
                    className="animate-ping"
                    style={{ animationDuration: '2s' }}
                  />
                )}

                {/* Label on hover */}
                {(isHovered || isSelected) && (
                  <text
                    x={node.x}
                    y={node.y + node.radius + 16}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-white pointer-events-none"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  >
                    {node.project.name.length > 25 ? node.project.name.slice(0, 22) + '...' : node.project.name}
                  </text>
                )}
              </motion.g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredNode && !selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-4 bg-white rounded-xl p-4 shadow-xl max-w-xs"
            >
              {(() => {
                const node = nodes.find(n => n.id === hoveredNode)
                if (!node) return null
                const connected = getConnectedEdges(hoveredNode)
                return (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STAGE_HEX[node.stage] }}
                      />
                      <span className="font-semibold text-slate-900">{node.project.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Stage: <span className="text-slate-700">{stageLabels[node.stage as RocketBoosterStage] || 'Unknown'}</span></p>
                      <p>Autonomy: <span className="text-slate-700">{node.autonomy}%</span></p>
                      <p>Connections: <span className="text-slate-700">{connected.length}</span></p>
                      {node.themes.length > 0 && (
                        <p>Themes: <span className="text-slate-700">{node.themes.slice(0, 3).join(', ')}</span></p>
                      )}
                    </div>
                  </>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(stageLabels).map(([stage, label]) => (
            <div key={stage} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STAGE_HEX[stage] }}
              />
              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-slate-500">
          Node size = autonomy score • Line thickness = connection strength
        </div>
      </div>

      {/* Selected project detail */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: STAGE_HEX[getProjectStage(selectedProject)] }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                    {stageLabels[getProjectStage(selectedProject)]}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedProject.name}</h3>
                <p className="text-sm text-slate-600 mb-4">
                  {selectedProject.aiSummary || selectedProject.description || 'No description available.'}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Autonomy</span>
                    <div className="font-semibold text-slate-900">
                      {selectedProject.autonomyScore ?? 'Not measured'}
                      {selectedProject.autonomyScore !== undefined && '/100'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Next milestone</span>
                    <div className="font-semibold text-slate-900">
                      {selectedProject.nextMilestoneDate
                        ? new Date(selectedProject.nextMilestoneDate).toLocaleDateString()
                        : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Themes</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(selectedProject.themes || []).map(theme => (
                        <span key={theme} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                          {theme}
                        </span>
                      ))}
                      {(selectedProject.themes || []).length === 0 && (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Connections</span>
                    <div className="font-semibold text-slate-900">
                      {getConnectedEdges(selectedProject.id).length} projects
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => onProjectSelect?.(selectedProject)}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  View details
                </button>
                {selectedProject.notionUrl && (
                  <a
                    href={selectedProject.notionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-center"
                  >
                    Open Notion
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
