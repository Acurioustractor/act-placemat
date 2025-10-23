#!/usr/bin/env node
/**
 * Add Coordinates to Notion Places - Simple Version
 * Run: node add-coordinates-now.js
 */

import { config } from 'dotenv'
import { Client } from '@notionhq/client'

config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PLACES_DATABASE_ID = '25debcf9-81cf-808e-a632-cbc6ae78d582'

// Australian location coordinates
const COORDS = {
  'Palm Island': '-18.7544,146.5811', 'Bwgcolman': '-18.7544,146.5811',
  'Witta': '-26.5833,152.7833', 'Gubbi Gubbi': '-26.5833,152.7833',
  'Brisbane': '-27.4705,153.0260', 'Meanjin': '-27.4705,153.0260',
  'Mount Isa': '-20.7256,139.4927', 'Kalkadoon': '-20.7256,139.4927',
  'Sydney': '-33.8688,151.2093', 'Warrang': '-33.8688,151.2093',
  'Melbourne': '-37.8136,144.9631', 'Naarm': '-37.8136,144.9631',
  'Darwin': '-12.4634,130.8456', 'Gulumoerrgin': '-12.4634,130.8456',
  'Alice Springs': '-23.6980,133.8807', 'Mbantua': '-23.6980,133.8807',
  'Tennant Creek': '-19.6497,134.1947', 'Jurnkkurakurr': '-19.6497,134.1947',
  'Perth': '-31.9505,115.8605', 'Canberra': '-35.2809,149.1300',
  'Maningrida': '-12.0563,134.2342', 'Townsville': '-19.2590,146.8169',
  'Newcastle': '-32.9283,151.7817', 'Adelaide': '-34.9285,138.6007',
  'Sunshine Coast': '-26.6500,153.0667', 'Gold Coast': '-28.0167,153.4000'
}

console.log('🗺️  Adding Coordinates to Notion Places\n')

try {
  // Check if Coordinates property exists
  const db = await notion.databases.retrieve({ database_id: PLACES_DATABASE_ID })

  if (!db.properties['Coordinates']) {
    console.log('❌ "Coordinates" property not found!')
    console.log('\n💡 To add it:')
    console.log('   1. Open your Places database in Notion')
    console.log('   2. Click "+ New property"')
    console.log('   3. Name: "Coordinates", Type: "Text"')
    console.log('   4. Run this script again\n')
    process.exit(1)
  }

  console.log('✅ Coordinates property exists\n')

  // Get all places
  const response = await notion.databases.query({
    database_id: PLACES_DATABASE_ID,
    page_size: 100
  })

  console.log(`📍 Processing ${response.results.length} places...\n`)

  let updated = 0
  let skipped = 0

  for (const page of response.results) {
    const name = page.properties['Name']?.title?.[0]?.plain_text ||
                 page.properties['Place']?.title?.[0]?.plain_text || 'Unknown'
    const westernName = page.properties['Western Name']?.rich_text?.[0]?.plain_text
    const currentCoords = page.properties['Coordinates']?.rich_text?.[0]?.plain_text

    // Skip if already has coordinates
    if (currentCoords && currentCoords.match(/^-?\d+/)) {
      console.log(`⏭️  ${name}: Already has coordinates`)
      skipped++
      continue
    }

    // Find coordinates
    let coords = COORDS[name] || COORDS[westernName]

    // Try partial match
    if (!coords) {
      for (const [key, value] of Object.entries(COORDS)) {
        if (name.includes(key) || westernName?.includes(key)) {
          coords = value
          break
        }
      }
    }

    if (coords) {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          'Coordinates': {
            rich_text: [{ type: 'text', text: { content: coords } }]
          }
        }
      })
      console.log(`✅ ${name} (${westernName || 'no western name'}): ${coords}`)
      updated++
      await new Promise(r => setTimeout(r, 350)) // Rate limit
    } else {
      console.log(`⚠️  ${name} (${westernName || ''}): No coordinates found`)
      skipped++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Updated: ${updated}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log('='.repeat(60))

  if (updated > 0) {
    console.log('\n🎉 Success! Restart your backend to see the map:')
    console.log('   pkill -f "node server.js" && npm run dev')
  }

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
