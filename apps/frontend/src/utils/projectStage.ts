import type { Project, RocketBoosterStage } from '../types/project'

export const stageLabels: Record<RocketBoosterStage, string> = {
  launch: 'Ignition (ACT-intensive)',
  orbit: 'Orbit (shared control)',
  cruising: 'Cruising (community-led)',
  landed: 'Landed (community-owned)',
  obsolete: 'Beautifully Obsolete',
}

export const stageBrightness: Record<RocketBoosterStage, number> = {
  launch: 0.45,
  orbit: 0.65,
  cruising: 0.8,
  landed: 1,
  obsolete: 1.1,
}

export const stageColors: Record<RocketBoosterStage, string> = {
  launch: 'linear-gradient(135deg,#fbbf24,#f472b6)',
  orbit: 'linear-gradient(135deg,#fcd34d,#60a5fa)',
  cruising: 'linear-gradient(135deg,#c084fc,#34d399)',
  landed: 'linear-gradient(135deg,#4ade80,#22d3ee)',
  obsolete: 'linear-gradient(135deg,#f472b6,#a855f7)',
}

export const stageSolidColors: Record<RocketBoosterStage, string> = {
  launch: '#f97316',
  orbit: '#3b82f6',
  cruising: '#a855f7',
  landed: '#22d3ee',
  obsolete: '#ec4899',
}

const stageAutonomyDefaults: Record<RocketBoosterStage, number> = {
  launch: 20,
  orbit: 40,
  cruising: 65,
  landed: 85,
  obsolete: 100,
}

const statusStageHints: Array<{ match: RegExp; stage: RocketBoosterStage }> = [
  { match: /obsolete|independent|self-?run/i, stage: 'obsolete' },
  { match: /sunset|handover|complete|maintenance/i, stage: 'landed' },
  { match: /active|delivery|scale/i, stage: 'cruising' },
  { match: /pilot|prototype|orbit/i, stage: 'orbit' },
  { match: /idea|concept|planning|launch/i, stage: 'launch' },
]

export function getProjectStage(project: Project): RocketBoosterStage {
  if (project.rocketBoosterStage) {
    return project.rocketBoosterStage
  }

  if (typeof project.autonomyScore === 'number') {
    if (project.autonomyScore >= 90) return 'obsolete'
    if (project.autonomyScore >= 75) return 'landed'
    if (project.autonomyScore >= 55) return 'cruising'
    if (project.autonomyScore >= 30) return 'orbit'
    return 'launch'
  }

  if (project.status) {
    const hint = statusStageHints.find(({ match }) => match.test(project.status!))
    if (hint) return hint.stage
  }

  return 'launch'
}

export function getDefaultAutonomy(stage: RocketBoosterStage) {
  return stageAutonomyDefaults[stage]
}
