#!/usr/bin/env node
/**
 * Auto-Geocode New Locations
 *
 * This script finds places without coordinates and automatically geocodes them
 * using OpenStreetMap's Nominatim API (free, no API key needed)
 *
 * Run: node geocode-new-locations.js
 */

import { config } from 'dotenv'
import { Client } from '@notionhq/client'
import https from 'https'

config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PLACES_DATABASE_ID = '25debcf9-81cf-808e-a632-cbc6ae78d582'

// Rate limiting for Nominatim (max 1 request per second)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function geocode(query) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`

    const options = {
      headers: {
        'User-Agent': 'ACT-Placemat-LocationSystem/1.0'
      }
    }

    https.get(url, options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const results = JSON.parse(data)
          if (results && results.length > 0) {
            resolve({
              lat: parseFloat(results[0].lat),
              lon: parseFloat(results[0].lon),
              display_name: results[0].display_name
            })
          } else {
            resolve(null)
          }
        } catch (error) {
          reject(error)
        }
      })
    }).on('error', reject)
  })
}

async function main() {
  console.log('🌍 Auto-Geocoding New Locations')
  console.log('=================================\n')

  try {
    // Get all places
    const response = await notion.databases.query({
      database_id: PLACES_DATABASE_ID,
      page_size: 100
    })

    console.log(`📍 Found ${response.results.length} places in database\n`)

    let geocoded = 0
    let skipped = 0
    let failed = 0

    for (const page of response.results) {
      const properties = page.properties

      // Get place details
      const indigenousName = properties['Name']?.title?.[0]?.plain_text ||
                            properties['Place']?.title?.[0]?.plain_text || 'Unknown'
      const westernName = properties['Western Name']?.rich_text?.[0]?.plain_text || null
      const state = properties['State']?.select?.name || null

      // Check if already has coordinates
      const currentCoords = properties['Coordinates']?.rich_text?.[0]?.plain_text || null

      if (currentCoords && currentCoords.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/)) {
        console.log(`⏭️  ${indigenousName}: Already has coordinates`)
        skipped++
        continue
      }

      // Try to geocode
      console.log(`🔍 Geocoding: ${indigenousName} (${westernName || 'no western name'})...`)

      // Build query - prefer western name + state for better results
      let query = westernName || indigenousName
      if (state) {
        query += `, ${state}, Australia`
      } else {
        query += `, Australia`
      }

      try {
        const result = await geocode(query)

        if (result) {
          const coordinates = `${result.lat},${result.lon}`

          // Update Notion
          await notion.pages.update({
            page_id: page.id,
            properties: {
              'Coordinates': {
                rich_text: [{
                  type: 'text',
                  text: { content: coordinates }
                }]
              }
            }
          })

          console.log(`   ✅ ${coordinates}`)
          console.log(`   📍 ${result.display_name}`)
          geocoded++
        } else {
          console.log(`   ⚠️  No results found`)
          failed++
        }

        // Rate limit: 1 request per second for Nominatim
        await sleep(1100)

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`)
        failed++
        await sleep(1100)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Geocoding Summary:')
    console.log(`   ✅ Successfully geocoded: ${geocoded}`)
    console.log(`   ⏭️  Already had coordinates: ${skipped}`)
    console.log(`   ❌ Failed to geocode: ${failed}`)
    console.log('='.repeat(60))

    if (geocoded > 0) {
      console.log('\n✨ Success! New locations have been geocoded.')
      console.log('   Restart your backend to see them on the map.')
    }

  } catch (error) {
    console.error('❌ Geocoding failed:', error.message)
    process.exit(1)
  }
}

main()
