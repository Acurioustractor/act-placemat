#!/usr/bin/env node
import { config } from 'dotenv'
import { Client } from '@notionhq/client'

config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PLACES_DATABASE_ID = '25debcf9-81cf-808e-a632-cbc6ae78d582'

async function checkPlaces() {
  console.log('📍 Scanning Notion Places database for location data...\n')

  const response = await notion.databases.query({
    database_id: PLACES_DATABASE_ID,
    page_size: 100
  })

  let withLocation = 0
  let withoutLocation = 0
  const placesWithData = []

  response.results.forEach((page) => {
    const name = page.properties['Name']?.title?.[0]?.plain_text ||
                 page.properties['Place']?.title?.[0]?.plain_text || 'Unknown'
    const placeData = page.properties['Map']?.place

    if (placeData) {
      withLocation++
      placesWithData.push({ name, data: placeData })
      console.log('✅', name)
      console.log('   ', JSON.stringify(placeData, null, 2))
    } else {
      withoutLocation++
    }
  })

  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary:')
  console.log(`   ✅ Places WITH location data: ${withLocation}`)
  console.log(`   ❌ Places WITHOUT location data: ${withoutLocation}`)
  console.log('='.repeat(60))

  if (withLocation === 0) {
    console.log('\n💡 How to add location data in Notion:')
    console.log('   1. Open your Places database in Notion')
    console.log('   2. Click on any place record')
    console.log('   3. Find the "Map" property')
    console.log('   4. Click it and search for the location or drop a pin')
    console.log('   5. Save the page')
    console.log('\n📝 The Notion API will then return:')
    console.log('   {')
    console.log('     "type": "place",')
    console.log('     "place": {')
    console.log('       "location": {')
    console.log('         "latitude": -18.7544,')
    console.log('         "longitude": 146.5811')
    console.log('       },')
    console.log('       "name": "Palm Island, Queensland"')
    console.log('     }')
    console.log('   }')
  } else {
    console.log('\n🎉 Great! Location data found. Structure:')
    console.log(JSON.stringify(placesWithData[0], null, 2))
  }
}

checkPlaces().catch(console.error)
