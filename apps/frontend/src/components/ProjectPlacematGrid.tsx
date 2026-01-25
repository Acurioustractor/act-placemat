/**
 * ProjectPlacematGrid - Stage × Theme Matrix Visualization
 *
 * Data Visualization Expert Approach:
 * - True matrix/heatmap showing Stage (columns) vs Theme (rows)
 * - Cell size/color intensity = project count
 * - Click cell to see projects in that intersection
 * - Treemap view option for hierarchical breakdown
 * - Portfolio balance insights
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { resolveApiUrl } from '../config/env'
import type { Project, RocketBoosterStage } from '../types/project'
import { getProjectStage, stageLabels } from '../utils/projectStage'

interface ProjectPlacematGridProps {
  onProjectSelect?: (project: Project) => void
}

type ViewMode = 'matrix' | 'treemap' | 'sunburst'

// Stage colors - using actual RocketBoosterStage values
const STAGE_COLORS: Record<string, string> = {
  launch: '#f97316',      // ACT-intensive (orange)
  orbit: '#3b82f6',       // ACT-supported (blue)
  cruising: '#a855f7',    // ACT-adjacent (purple)
  landed: '#22d3ee',      // Community-owned (cyan)
  obsolete: '#ec4899',    // Beautifully obsolete (pink)
  unknown: '#64748b',
}

// Stage order for matrix - actual RocketBoosterStage values
const STAGE_ORDER: (RocketBoosterStage | 'unknown')[] = [
  'launch', 'orbit', 'cruising', 'landed', 'obsolete'
]

export function ProjectPlacematGrid({ onProjectSelect }: ProjectPlacematGridProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('matrix')
  const [selectedCell, setSelectedCell] = useState<{ stage: string; theme: string } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ stage: string; theme: string } | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/real/projects'))
        if (!response.ok) throw new Error('Failed to load projects')
        const data = await response.json()
        setProjects(data.projects || data || [])
      } catch (error) {
        console.error('Placemat grid failed to load', error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // Build matrix data: Stage × Theme
  const matrixData = useMemo(() => {
    // Get all unique themes
    const themeSet = new Set<string>()
    projects.forEach(p => (p.themes || []).forEach(t => themeSet.add(t)))
    const themes = Array.from(themeSet).sort()
    if (themes.length === 0) themes.push('No theme')

    // Build matrix: theme → stage → projects
    const matrix: Record<string, Record<string, Project[]>> = {}
    themes.forEach(theme => {
      matrix[theme] = {}
      STAGE_ORDER.forEach(stage => {
        matrix[theme][stage] = []
      })
    })

    // Fill matrix
    projects.forEach(project => {
      const stage = getProjectStage(project)
      const projectThemes = project.themes?.length ? project.themes : ['No theme']
      projectThemes.forEach(theme => {
        if (!matrix[theme]) {
          matrix[theme] = {}
          STAGE_ORDER.forEach(s => matrix[theme][s] = [])
        }
        matrix[theme][stage].push(project)
      })
    })

    // Calculate max count for color scaling
    let maxCount = 0
    themes.forEach(theme => {
      STAGE_ORDER.forEach(stage => {
        const count = matrix[theme]?.[stage]?.length || 0
        if (count > maxCount) maxCount = count
      })
    })

    // Stage totals
    const stageTotals: Record<string, number> = {}
    STAGE_ORDER.forEach(stage => {
      stageTotals[stage] = projects.filter(p => getProjectStage(p) === stage).length
    })

    // Theme totals
    const themeTotals: Record<string, number> = {}
    themes.forEach(theme => {
      themeTotals[theme] = STAGE_ORDER.reduce((sum, stage) => sum + (matrix[theme]?.[stage]?.length || 0), 0)
    })

    return { matrix, themes, maxCount, stageTotals, themeTotals }
  }, [projects])

  // Treemap data
  const treemapData = useMemo(() => {
    const data: { name: string; value: number; children: { name: string; value: number; color: string }[] }[] = []

    matrixData.themes.forEach(theme => {
      const children: { name: string; value: number; color: string }[] = []
      STAGE_ORDER.forEach(stage => {
        const count = matrixData.matrix[theme]?.[stage]?.length || 0
        if (count > 0) {
          children.push({ name: stageLabels[stage as RocketBoosterStage] || stage, value: count, color: STAGE_COLORS[stage] })
        }
      })
      if (children.length > 0) {
        data.push({ name: theme, value: children.reduce((s, c) => s + c.value, 0), children })
      }
    })

    return data.sort((a, b) => b.value - a.value)
  }, [matrixData])

  // Cell projects for selected cell
  const selectedCellProjects = useMemo(() => {
    if (!selectedCell) return []
    return matrixData.matrix[selectedCell.theme]?.[selectedCell.stage] || []
  }, [selectedCell, matrixData])

  // Get color intensity based on count
  const getIntensity = (count: number) => {
    if (count === 0) return 0
    return Math.min(count / Math.max(matrixData.maxCount, 1), 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-slate-600">Building portfolio matrix...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Portfolio Balance</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Project Placemat</h2>
          <p className="text-sm text-slate-500 mt-1">
            Stage vs Theme distribution - click any cell to explore
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {[
            { id: 'matrix' as const, label: 'Matrix', icon: '▦' },
            { id: 'treemap' as const, label: 'Treemap', icon: '▤' },
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === mode.id
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-slate-900">{projects.length}</div>
          <div className="text-xs text-slate-500">Total projects</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-emerald-600">{matrixData.themes.length}</div>
          <div className="text-xs text-slate-500">Themes</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-blue-600">
            {STAGE_ORDER.filter(s => matrixData.stageTotals[s] > 0).length}
          </div>
          <div className="text-xs text-slate-500">Active stages</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="text-2xl font-bold text-violet-600">{matrixData.maxCount}</div>
          <div className="text-xs text-slate-500">Max in cell</div>
        </div>
      </div>

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header */}
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-40">
                    Theme / Stage
                  </th>
                  {STAGE_ORDER.map(stage => (
                    <th key={stage} className="p-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[100px]">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STAGE_COLORS[stage] }}
                        />
                        <span>{stageLabels[stage as RocketBoosterStage] || stage}</span>
                      </div>
                      <div className="text-slate-400 font-normal mt-0.5">
                        {matrixData.stageTotals[stage] || 0}
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-100">
                    Total
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {matrixData.themes.map((theme, idx) => (
                  <tr key={theme} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-3 text-sm font-medium text-slate-900 border-r border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[120px]">{theme}</span>
                        <span className="text-slate-400 text-xs ml-2">
                          {matrixData.themeTotals[theme]}
                        </span>
                      </div>
                    </td>
                    {STAGE_ORDER.map(stage => {
                      const count = matrixData.matrix[theme]?.[stage]?.length || 0
                      const intensity = getIntensity(count)
                      const isHovered = hoveredCell?.theme === theme && hoveredCell?.stage === stage
                      const isSelected = selectedCell?.theme === theme && selectedCell?.stage === stage

                      return (
                        <td key={stage} className="p-2">
                          <motion.button
                            onClick={() => count > 0 && setSelectedCell({ stage, theme })}
                            onMouseEnter={() => setHoveredCell({ stage, theme })}
                            onMouseLeave={() => setHoveredCell(null)}
                            disabled={count === 0}
                            className={`
                              w-full h-16 rounded-lg flex items-center justify-center
                              transition-all relative overflow-hidden
                              ${count > 0 ? 'cursor-pointer' : 'cursor-default'}
                              ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                            `}
                            style={{
                              backgroundColor: count > 0
                                ? `${STAGE_COLORS[stage]}${Math.round(intensity * 60 + 20).toString(16).padStart(2, '0')}`
                                : '#f8fafc',
                            }}
                            whileHover={count > 0 ? { scale: 1.05 } : {}}
                            whileTap={count > 0 ? { scale: 0.95 } : {}}
                          >
                            {count > 0 && (
                              <>
                                <span
                                  className="text-lg font-bold"
                                  style={{ color: intensity > 0.5 ? '#ffffff' : STAGE_COLORS[stage] }}
                                >
                                  {count}
                                </span>
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-black/10 flex items-center justify-center"
                                  >
                                    <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded">
                                      Click to view
                                    </span>
                                  </motion.div>
                                )}
                              </>
                            )}
                            {count === 0 && (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </motion.button>
                        </td>
                      )
                    })}
                    <td className="p-2 bg-slate-100 text-center">
                      <span className="text-sm font-bold text-slate-700">
                        {matrixData.themeTotals[theme]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-200">
                  <td className="p-3 text-sm font-bold text-slate-700">Total</td>
                  {STAGE_ORDER.map(stage => (
                    <td key={stage} className="p-3 text-center text-sm font-bold text-slate-700">
                      {matrixData.stageTotals[stage]}
                    </td>
                  ))}
                  <td className="p-3 text-center text-sm font-bold text-slate-900 bg-slate-200">
                    {projects.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Treemap View */}
      {viewMode === 'treemap' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {treemapData.map((themeGroup, idx) => {
              const totalSize = treemapData.reduce((s, g) => s + g.value, 0)
              const relativeSize = Math.max((themeGroup.value / totalSize) * 100, 15)

              return (
                <motion.div
                  key={themeGroup.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-100"
                  style={{ minHeight: `${relativeSize * 2 + 80}px` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 truncate">{themeGroup.name}</h3>
                    <span className="text-sm font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full">
                      {themeGroup.value}
                    </span>
                  </div>

                  {/* Stage breakdown as horizontal bars */}
                  <div className="space-y-2">
                    {themeGroup.children.map(child => (
                      <button
                        key={child.name}
                        onClick={() => {
                          const stage = Object.entries(stageLabels).find(([, l]) => l === child.name)?.[0]
                          if (stage) setSelectedCell({ stage, theme: themeGroup.name })
                        }}
                        className="w-full group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 group-hover:text-slate-900 transition-colors">
                            {child.name}
                          </span>
                          <span className="font-semibold" style={{ color: child.color }}>
                            {child.value}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: child.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(child.value / themeGroup.value) * 100}%` }}
                            transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {STAGE_ORDER.map(stage => (
            <div key={stage} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              <span className="text-slate-600">{stageLabels[stage as RocketBoosterStage] || stage}</span>
            </div>
          ))}
        </div>
        <div className="text-slate-500">
          Color intensity = project count in cell
        </div>
      </div>

      {/* Selected cell detail panel */}
      <AnimatePresence>
        {selectedCell && selectedCellProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-4 bottom-4 md:inset-x-auto md:right-4 md:bottom-4 md:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[60vh] overflow-hidden flex flex-col z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STAGE_COLORS[selectedCell.stage] }}
                    />
                    <span className="font-semibold text-slate-900">
                      {stageLabels[selectedCell.stage as RocketBoosterStage] || selectedCell.stage}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {selectedCell.theme} • {selectedCellProjects.length} projects
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Project list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedCellProjects.map((project, idx) => (
                <motion.button
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onProjectSelect?.(project)}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                >
                  <div className="font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {project.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {project.aiSummary || project.description || 'No description'}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    {project.autonomyScore !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {project.autonomyScore}% autonomy
                      </span>
                    )}
                    {project.area && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {project.area}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
