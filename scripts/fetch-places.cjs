const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_TOKEN || process.env.NOTION_INTEGRATION_TOKEN });
const PLACES_DB = '25debcf9-81cf-808e-a632-cbc6ae78d582';

async function getPlaces() {
  const response = await notion.databases.query({ database_id: PLACES_DB, page_size: 100 });
  const places = [];

  for (const page of response.results || []) {
    const props = page.properties || {};
    const traditionalName = props.Place?.title?.[0]?.plain_text?.trim();
    const westernName = props['Western Name']?.rich_text?.map(r => r.plain_text).join('').trim();
    const name = traditionalName || westernName;
    if (!name) continue;

    let lat = null, lng = null;
    const coordsText = props.Coordinates?.rich_text?.map(r => r.plain_text).join('').trim() || '';
    if (coordsText) {
      const coordMatch = coordsText.match(/(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }
    }

    const region = props.State?.select?.name;
    const firstPeople = props['First People']?.rich_text?.map(r => r.plain_text).join('').trim();
    if (lat && lng) {
      places.push({
        id: page.id,
        name,
        traditionalName,
        westernName,
        lat,
        lng,
        region,
        country: region === 'Overseas' ? 'Overseas' : 'Australia',
        firstPeople,
        relatedProjects: []
      });
    }
  }
  console.log(JSON.stringify(places, null, 2));
}
getPlaces().catch(e => console.error(e.message));
