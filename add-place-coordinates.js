#!/usr/bin/env node
/**
 * Add coordinates to Notion Place records
 * This script updates the Map property in the Places database with lat,lng coordinates
 */

import { config } from 'dotenv'
import { Client } from '@notionhq/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '.env') })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PLACES_DATABASE_ID = '25debcf9-81cf-808e-a632-cbc6ae78d582'

// Known coordinates for Australian locations
const LOCATION_COORDINATES = {
  // Queensland
  'Palm Island': '-18.7544,146.5811',
  'Witta': '-26.5833,152.7833',
  'Brisbane': '-27.4705,153.0260',
  'Mount Isa': '-20.7256,139.4927',
  'Sunshine Coast': '-26.6500,153.0667',
  'Cairns': '-16.9186,145.7781',
  'Townsville': '-19.2590,146.8169',

  // NSW
  'Sydney': '-33.8688,151.2093',
  'Newcastle': '-32.9283,151.7817',
  'Wollongong': '-34.4278,150.8931',

  // Victoria
  'Melbourne': '-37.8136,144.9631',
  'Geelong': '-38.1499,144.3617',

  // NT
  'Tennant Creek': '-19.6497,134.1947',
  'Darwin': '-12.4634,130.8456',
  'Alice Springs': '-23.6980,133.8807',
  'Maningrida': '-12.0563,134.2342',

  // SA
  'Adelaide': '-34.9285,138.6007',

  // WA
  'Perth': '-31.9505,115.8605',
  'Broome': '-17.9614,122.2359',

  // TAS
  'Hobart': '-42.8821,147.3272',

  // ACT
  'Canberra': '-35.2809,149.1300',
}

async function getAllPlaces() {
  console.log('📍 Fetching all places from Notion...')

  const response = await notion.databases.query({
    database_id: PLACES_DATABASE_ID,
  })

  console.log(`✅ Found ${response.results.length} places`)
  return response.results
}

async function updatePlaceCoordinates(pageId, placeName, coordinates, westernName) {
  try {
    // Parse lat,lng
    const [lat, lng] = coordinates.split(',').map(s => parseFloat(s.trim()))

    // Use Notion place type with location object
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Map': {
          type: 'place',
          place: {
            location: {
              latitude: lat,
              longitude: lng
            },
            // Optionally include a name/address
            ...(westernName && {
              name: westernName
            })
          }
        }
      }
    })
    console.log(`  ✅ ${placeName}: ${coordinates}`)
    return true
  } catch (error) {
    console.error(`  ❌ ${placeName}: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🗺️  Adding Coordinates to Notion Places')
  console.log('========================================\n')

  const places = await getAllPlaces()

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const place of places) {
    const properties = place.properties

    // Get the place name from title
    const nameProperty = properties['Name'] || properties['Indigenous Name']
    const placeName = nameProperty?.title?.[0]?.plain_text || 'Unknown'

    // Get western name if available
    const westernProperty = properties['Western Name']
    const westernName = westernProperty?.rich_text?.[0]?.plain_text || null

    // Get current map value
    const mapProperty = properties['Map']
    const currentMap = mapProperty?.rich_text?.[0]?.plain_text || null

    // Skip if already has coordinates
    if (currentMap && currentMap.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/)) {
      console.log(`  ⏭️  ${placeName}: Already has coordinates (${currentMap})`)
      skipped++
      continue
    }

    // Try to find coordinates
    let coordinates = null

    // Try western name first (more specific)
    if (westernName && LOCATION_COORDINATES[westernName]) {
      coordinates = LOCATION_COORDINATES[westernName]
    }
    // Then try indigenous name
    else if (LOCATION_COORDINATES[placeName]) {
      coordinates = LOCATION_COORDINATES[placeName]
    }
    // Check if western name is in our list
    else if (westernName) {
      for (const [key, value] of Object.entries(LOCATION_COORDINATES)) {
        if (westernName.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(westernName.toLowerCase())) {
          coordinates = value
          break
        }
      }
    }

    if (coordinates) {
      const success = await updatePlaceCoordinates(place.id, placeName, coordinates, westernName)
      if (success) {
        updated++
      } else {
        failed++
      }
      // Rate limit: wait a bit between updates
      await new Promise(resolve => setTimeout(resolve, 300))
    } else {
      console.log(`  ⚠️  ${placeName} (${westernName || 'no western name'}): No coordinates found`)
      skipped++
    }
  }

  console.log('\n========================================')
  console.log('📊 Summary:')
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log('========================================\n')

  if (updated > 0) {
    console.log('🎉 Coordinates added! The map should now show project locations.')
    console.log('   Refresh your browser to see the updated map.')
  }
}

main().catch(console.error)
