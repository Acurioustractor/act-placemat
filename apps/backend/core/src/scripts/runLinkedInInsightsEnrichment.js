#!/usr/bin/env node

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnv(envPath) {
  if (!envPath) return
  dotenv.config({ path: envPath })
}

const projectRoot = path.resolve(__dirname, '../../../../../')
const backendRoot = path.resolve(__dirname, '../../../../../apps/backend')
const coreRoot = path.resolve(__dirname, '../../..')

loadEnv(path.join(projectRoot, '.env'))
loadEnv(path.join(projectRoot, '.env.local'))
loadEnv(path.join(backendRoot, '.env'))
loadEnv(path.join(coreRoot, '.env'))

const args = process.argv.slice(2)
const options = { processAll: true }

for (const arg of args) {
  if (arg.startsWith('--limit=')) {
    options.limit = Number(arg.split('=')[1]) || undefined
  } else if (arg.startsWith('--max=')) {
    options.maxContacts = Number(arg.split('=')[1]) || undefined
  } else if (arg.startsWith('--offset=')) {
    options.offset = Number(arg.split('=')[1]) || undefined
  } else if (arg === '--force') {
    options.force = true
  } else if (arg.startsWith('--fetch-multiplier=')) {
    options.fetchMultiplier = Number(arg.split('=')[1]) || undefined
  }
}

async function main() {
  const start = Date.now()

  const { default: enrichmentService } = await import('../services/linkedinInsightsEnrichmentService.js')

  if (!enrichmentService?.isEnabled?.()) {
    console.error('❌ LinkedIn enrichment service unavailable – missing Supabase credentials.')
    process.exit(1)
  }

  const limitDisplay = options.limit ? `${options.limit}` : 'default'
  console.log(`🚀 Running LinkedIn insights enrichment (batch size ${limitDisplay}, processAll=${options.processAll})`)

  const result = await enrichmentService.runBatch(options)
  const duration = ((Date.now() - start) / 1000).toFixed(1)

  if (result?.success) {
    console.log(`✅ Enrichment complete in ${duration}s`)
  } else {
    console.warn(`⚠️  Enrichment finished with issues in ${duration}s`)
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error('❌ Enrichment run failed:', error)
  process.exit(1)
})
