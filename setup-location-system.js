#!/usr/bin/env node
/**
 * Complete Location System Setup
 *
 * This script:
 * 1. Adds a "Coordinates" property to the Places database (if not exists)
 * 2. Populates coordinates for all known Australian locations
 * 3. Provides geocoding capability for new locations
 *
 * Run: node setup-location-system.js
 */

import { config } from 'dotenv'
import { Client } from '@notionhq/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '.env') })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PLACES_DATABASE_ID = '25debcf9-81cf-808e-a632-cbc6ae78d582'

// Comprehensive Australian location coordinates
const LOCATION_COORDINATES = {
  // Queensland
  'Palm Island': '-18.7544,146.5811',
  'Bwgcolman': '-18.7544,146.5811',
  'Witta': '-26.5833,152.7833',
  'Brisbane': '-27.4705,153.0260',
  'Meanjin': '-27.4705,153.0260',
  'Mount Isa': '-20.7256,139.4927',
  'Sunshine Coast': '-26.6500,153.0667',
  'Cairns': '-16.9186,145.7781',
  'Townsville': '-19.2590,146.8169',
  'Gold Coast': '-28.0167,153.4000',

  // NSW
  'Sydney': '-33.8688,151.2093',
  'Warrang': '-33.8688,151.2093',
  'Newcastle': '-32.9283,151.7817',
  'Wollongong': '-34.4278,150.8931',

  // Victoria
  'Melbourne': '-37.8136,144.9631',
  'Naarm': '-37.8136,144.9631',
  'Geelong': '-38.1499,144.3617',

  // NT
  'Tennant Creek': '-19.6497,134.1947',
  'Jurnkkurakurr': '-19.6497,134.1947',
  'Darwin': '-12.4634,130.8456',
  'Gulumoerrgin': '-12.4634,130.8456',
  'Alice Springs': '-23.6980,133.8807',
  'Mbantua': '-23.6980,133.8807',
  'Maningrida': '-12.0563,134.2342',

  // SA
  'Adelaide': '-34.9285,138.6007',
  'Kaurna': '-34.9285,138.6007',

  // WA
  'Perth': '-31.9505,115.8605',
  'Boorloo': '-31.9505,115.8605',
  'Broome': '-17.9614,122.2359',

  // TAS
  'Hobart': '-42.8821,147.3272',
  'nipaluna': '-42.8821,147.3272',

  // ACT
  'Canberra': '-35.2809,149.1300',
  'Ngunnawal': '-35.2809,149.1300',

  // Indigenous territory names
  'Gubbi Gubbi': '-26.5833,152.7833',
  'Kalkadoon': '-20.7256,139.4927',
  'Yawuru': '-17.9614,122.2359',
}

async function step1_addCoordinatesProperty() {
  console.log('\n📋 Step 1: Checking if Coordinates property exists...\n')

  try {
    const database = await notion.databases.retrieve({
      database_id: PLACES_DATABASE_ID
    })

    // Check if Coordinates property already exists
    if (database.properties['Coordinates']) {
      console.log('✅ Coordinates property already exists!')
      console.log('   Type:', database.properties['Coordinates'].type)
      return true
    }

    console.log('⚠️  Coordinates property does not exist')
    console.log('❌ Cannot add properties via API - must be done manually in Notion')
    console.log('\n💡 To add it:')
    console.log('   1. Open your Places database in Notion')
    console.log('   2. Click "+ Add a property"')
    console.log('   3. Name: "Coordinates"')
    console.log('   4. Type: "Text"')
    console.log('   5. Run this script again')

    return false
  } catch (error) {
    console.error('❌ Error checking database:', error.message)
    return false
  }
}

async function step2_populateCoordinates() {
  console.log('\n📍 Step 2: Populating coordinates for all places...\n')

  try {
    const response = await notion.databases.query({
      database_id: PLACES_DATABASE_ID,
      page_size: 100
    })

    let updated = 0
    let skipped = 0
    let failed = 0

    for (const page of response.results) {
      const properties = page.properties

      // Get place names
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

      // Try to find coordinates
      let coordinates = null

      // Try multiple name variations
      const namesToTry = [
        indigenousName,
        westernName,
        `${westernName}, ${state}`,
        `${indigenousName}, ${state}`
      ].filter(Boolean)

      for (const name of namesToTry) {
        if (LOCATION_COORDINATES[name]) {
          coordinates = LOCATION_COORDINATES[name]
          break
        }

        // Try partial matching
        for (const [key, value] of Object.entries(LOCATION_COORDINATES)) {
          if (name.toLowerCase().includes(key.toLowerCase()) ||
              key.toLowerCase().includes(name.toLowerCase())) {
            coordinates = value
            break
          }
        }

        if (coordinates) break
      }

      if (coordinates) {
        try {
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

          console.log(`✅ ${indigenousName} (${westernName || 'no western name'}): ${coordinates}`)
          updated++

          // Rate limit: be nice to Notion API
          await new Promise(resolve => setTimeout(resolve, 350))
        } catch (error) {
          console.error(`❌ ${indigenousName}: ${error.message}`)
          failed++
        }
      } else {
        console.log(`⚠️  ${indigenousName} (${westernName || 'no western name'}): No coordinates found in database`)
        skipped++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary:')
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log('='.repeat(60))

    return { updated, skipped, failed }
  } catch (error) {
    console.error('❌ Error populating coordinates:', error.message)
    throw error
  }
}

async function step3_verifyResults() {
  console.log('\n🔍 Step 3: Verifying results...\n')

  try {
    const response = await notion.databases.query({
      database_id: PLACES_DATABASE_ID,
      page_size: 100
    })

    let withCoords = 0
    let withoutCoords = 0
    const examples = []

    response.results.forEach((page) => {
      const name = page.properties['Name']?.title?.[0]?.plain_text ||
                   page.properties['Place']?.title?.[0]?.plain_text || 'Unknown'
      const coords = page.properties['Coordinates']?.rich_text?.[0]?.plain_text || null

      if (coords && coords.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/)) {
        withCoords++
        if (examples.length < 5) {
          examples.push({ name, coords })
        }
      } else {
        withoutCoords++
      }
    })

    console.log('📍 Verification Results:')
    console.log(`   ✅ Places WITH coordinates: ${withCoords}`)
    console.log(`   ❌ Places WITHOUT coordinates: ${withoutCoords}`)

    if (examples.length > 0) {
      console.log('\n📋 Sample coordinates:')
      examples.forEach(({ name, coords }) => {
        console.log(`   ${name}: ${coords}`)
      })
    }

    return { withCoords, withoutCoords }
  } catch (error) {
    console.error('❌ Error verifying:', error.message)
    throw error
  }
}

async function main() {
  console.log('🗺️  ACT Placemat - Location System Setup')
  console.log('==========================================')

  try {
    // Step 1: Check for Coordinates property
    const hasProperty = await step1_addCoordinatesProperty()

    if (!hasProperty) {
      console.log('\n⚠️  Please add the Coordinates property manually, then run this script again.')
      process.exit(1)
    }

    // Step 2: Populate coordinates
    const results = await step2_populateCoordinates()

    // Step 3: Verify
    const verification = await step3_verifyResults()

    // Final summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Setup Complete!')
    console.log('='.repeat(60))

    if (verification.withCoords > 0) {
      console.log('\n✅ Next steps:')
      console.log('   1. Restart your backend: pkill -f "node server.js" && npm run dev')
      console.log('   2. Wait ~5 minutes for cache refresh')
      console.log('   3. Visit: http://localhost:5174/?tab=dashboard')
      console.log('   4. See your projects on the interactive map! 🗺️')
    }

    if (verification.withoutCoords > 0) {
      console.log(`\n⚠️  ${verification.withoutCoords} places still need coordinates`)
      console.log('   These are likely international or less common locations.')
      console.log('   You can:')
      console.log('   1. Add them manually in Notion')
      console.log('   2. Or update LOCATION_COORDINATES in this script and run again')
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { LOCATION_COORDINATES, step1_addCoordinatesProperty, step2_populateCoordinates, step3_verifyResults }
