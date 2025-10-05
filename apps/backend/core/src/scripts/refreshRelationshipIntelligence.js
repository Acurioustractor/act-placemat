#!/usr/bin/env node

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function safeConfig(envPath) {
  if (!envPath) return
  dotenv.config({ path: envPath })
}

const projectRoot = path.resolve(__dirname, '../../../../../')
const backendRoot = path.resolve(__dirname, '../../../../../apps/backend')
const coreRoot = path.resolve(__dirname, '../../..')

safeConfig(path.join(projectRoot, '.env'))
safeConfig(path.join(projectRoot, '.env.local'))
safeConfig(path.join(backendRoot, '.env'))
safeConfig(path.join(coreRoot, '.env'))

async function main() {
  const { default: relationshipIntelligenceOrchestrator } = await import('../services/relationshipIntelligenceOrchestrator.js')

  if (!relationshipIntelligenceOrchestrator) {
    console.error('❌ Relationship intelligence orchestrator not available (missing Supabase credentials).')
    process.exit(1)
  }

  try {
    console.log('🔄 Refreshing relationship intelligence datasets...')
    await relationshipIntelligenceOrchestrator.refreshAll()
    console.log('✅ Relationship intelligence refresh complete')
  } catch (error) {
    console.error('❌ Refresh failed:', error)
    process.exit(1)
  }
}

main()
