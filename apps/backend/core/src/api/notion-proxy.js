/**
 * Notion Proxy API - Bridge between frontend and Notion
 * Handles CORS and provides clean partner data endpoints
 */

import express from 'express';
import { Client } from '@notionhq/client';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Initialize Notion client
function getNotion() {
  const token = process.env.NOTION_TOKEN 
    || process.env.NOTION_INTEGRATION_TOKEN 
    || process.env.NOTION_API_TOKEN 
    || process.env.NOTION_SECRET;
  if (!token) return null;
  return new Client({ auth: token });
}

// Helper function to extract plain text from Notion rich text
const extractPlainText = (richTextArray) => {
  if (!Array.isArray(richTextArray)) return '';
  return richTextArray.map(item => item.plain_text || '').join('');
};

// Helper function to extract select value
const extractSelect = (selectObj) => {
  return selectObj?.name || '';
};

// Helper function to extract multi-select values
const extractMultiSelect = (multiSelectArray) => {
  if (!Array.isArray(multiSelectArray)) return [];
  return multiSelectArray.map(item => ({ name: item.name }));
};

// Helper function to extract title
const extractTitle = (titleArray) => {
  if (!Array.isArray(titleArray)) return '';
  return titleArray.map(item => item.plain_text || '').join('');
};

// Helper function to format partner data from Notion
const formatPartnerData = (notionPages) => {
  return notionPages.map(page => ({
    id: page.id,
    properties: {
      Name: { title: [{ plain_text: extractTitle(page.properties.Name?.title || []) }] },
      Type: { select: { name: extractSelect(page.properties.Type?.select) } },
      Category: { select: { name: extractSelect(page.properties.Category?.select) } },
      Description: { 
        rich_text: [{ 
          plain_text: extractPlainText(page.properties.Description?.rich_text || [])
        }] 
      },
      'Contribution Type': { 
        rich_text: [{ plain_text: extractPlainText(page.properties['Contribution Type']?.rich_text || []) }] 
      },
      'Relationship Strength': { select: { name: extractSelect(page.properties['Relationship Strength']?.select) } },
      'Collaboration Focus': { 
        multi_select: extractMultiSelect(page.properties['Collaboration Focus']?.multi_select || [])
      },
      'Impact Story': { 
        rich_text: [{ 
          plain_text: extractPlainText(page.properties['Impact Story']?.rich_text || [])
        }] 
      },
      Featured: { checkbox: page.properties.Featured?.checkbox || false },
      'Logo URL': { url: page.properties['Logo URL']?.url || null },
      Location: { rich_text: [{ plain_text: extractPlainText(page.properties.Location?.rich_text || []) }] },
      'Established Date': { date: page.properties['Established Date']?.date || null }
    }
  }));
};

// Partner data endpoint - proxy to Notion
router.get('/partners', asyncHandler(async (req, res) => {
  let notionData = null;
  const notion = getNotion();
  
  // Try to fetch from Notion using SDK
  try {
    if (notion && process.env.NOTION_PARTNERS_DATABASE_ID) {
      console.log('🔍 Attempting to fetch partners from Notion database...');
      
      // Use the Notion SDK to query the partners database
      const notionResult = await notion.databases.query({
        database_id: process.env.NOTION_PARTNERS_DATABASE_ID,
        filter: {
          property: 'Status',
          select: { equals: 'Active' }
        },
        sorts: [{
          property: 'Name',
          direction: 'ascending'
        }]
      });
      
      if (notionResult?.results && Array.isArray(notionResult.results)) {
        notionData = formatPartnerData(notionResult.results);
        console.log(`✅ Successfully fetched ${notionData.length} partners from Notion`);
      }
    } else {
      console.log('⚠️ Notion client not initialized or database ID not configured');
    }
  } catch (notionError) {
    console.warn('⚠️ Failed to fetch from Notion, falling back to mock data:', notionError.message);
  }
  
  // If Notion data was successfully fetched, return it
  if (notionData && notionData.length > 0) {
    res.json(notionData);
    return;
  }
  
  // Fallback to structured mock data if Notion is unavailable
  console.log('📄 Using fallback partner data (Notion unavailable or no data)');
  const fallbackPartners = [
      {
        id: 'childrens-ground',
        properties: {
          Name: { title: [{ plain_text: "Children's Ground" }] },
          Type: { select: { name: 'Community' } },
          Category: { select: { name: 'Indigenous-led' } },
          Description: { 
            rich_text: [{ 
              plain_text: 'Indigenous-led organization pioneering community-controlled development across remote Australia.' 
            }] 
          },
          'Contribution Type': { 
            rich_text: [{ plain_text: 'Community Wisdom & Co-design' }] 
          },
          'Relationship Strength': { select: { name: 'Cornerstone' } },
          'Collaboration Focus': { 
            multi_select: [
              { name: 'Community-led design' },
              { name: 'Cultural guidance' },
              { name: 'Lived experience' }
            ] 
          },
          'Impact Story': { 
            rich_text: [{ 
              plain_text: 'Teaching us that true innovation comes from listening circles, not boardrooms.' 
            }] 
          },
          Featured: { checkbox: true },
          'Logo URL': { url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=200&h=200&fit=crop' },
          Location: { rich_text: [{ plain_text: 'Remote Australia' }] },
          'Established Date': { date: { start: '2023-01-01' } }
        }
      },
      {
        id: 'snow-foundation',
        properties: {
          Name: { title: [{ plain_text: "Snow Foundation" }] },
          Type: { select: { name: 'Funder' } },
          Category: { select: { name: 'Impact-focused' } },
          Description: { 
            rich_text: [{ 
              plain_text: 'Visionary foundation backing bold approaches to social justice through trust-based funding.' 
            }] 
          },
          'Contribution Type': { 
            rich_text: [{ plain_text: 'Trust-based Funding & Strategic Support' }] 
          },
          'Relationship Strength': { select: { name: 'Active' } },
          'Collaboration Focus': { 
            multi_select: [
              { name: 'Financial backing' },
              { name: 'Strategic mentorship' },
              { name: 'Network connections' }
            ] 
          },
          'Impact Story': { 
            rich_text: [{ 
              plain_text: 'Believing in community-led solutions before they become mainstream.' 
            }] 
          },
          Featured: { checkbox: true },
          'Logo URL': { url: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=200&h=200&fit=crop' },
          Location: { rich_text: [{ plain_text: 'Australia' }] },
          'Established Date': { date: { start: '2023-01-01' } }
        }
      },
      {
        id: 'first-nations-youth-justice-alliance',
        properties: {
          Name: { title: [{ plain_text: "First Nations Youth Justice Alliance" }] },
          Type: { select: { name: 'Community' } },
          Category: { select: { name: 'Indigenous-led' } },
          Description: { 
            rich_text: [{ 
              plain_text: 'Leading Indigenous-led organization working on culturally responsive youth justice approaches.' 
            }] 
          },
          'Contribution Type': { 
            rich_text: [{ plain_text: 'Cultural Knowledge & Advocacy Leadership' }] 
          },
          'Relationship Strength': { select: { name: 'Cornerstone' } },
          'Collaboration Focus': { 
            multi_select: [
              { name: 'Cultural protocols' },
              { name: 'Youth engagement' },
              { name: 'Justice system reform' }
            ] 
          },
          'Impact Story': { 
            rich_text: [{ 
              plain_text: 'Showing us what justice looks like when communities lead the way.' 
            }] 
          },
          Featured: { checkbox: true },
          'Logo URL': { url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200&h=200&fit=crop' },
          Location: { rich_text: [{ plain_text: 'National' }] },
          'Established Date': { date: { start: '2022-01-01' } }
        }
      },
      {
        id: 'elder-advisory-circle',
        properties: {
          Name: { title: [{ plain_text: "Elder Advisory Circle" }] },
          Type: { select: { name: 'Community' } },
          Category: { select: { name: 'Wisdom keepers' } },
          Description: { 
            rich_text: [{ 
              plain_text: 'Circle of Elders from participating communities who guide our approach and hold us accountable.' 
            }] 
          },
          'Contribution Type': { 
            rich_text: [{ plain_text: 'Wisdom, Guidance & Accountability' }] 
          },
          'Relationship Strength': { select: { name: 'Cornerstone' } },
          'Collaboration Focus': { 
            multi_select: [
              { name: 'Cultural guidance' },
              { name: 'Project oversight' },
              { name: 'Community accountability' }
            ] 
          },
          'Impact Story': { 
            rich_text: [{ 
              plain_text: 'The compass that keeps us oriented toward genuine community benefit.' 
            }] 
          },
          Featured: { checkbox: true },
          'Logo URL': { url: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=200&h=200&fit=crop' },
          Location: { rich_text: [{ plain_text: 'Community-based' }] },
          'Established Date': { date: { start: '2023-01-01' } }
        }
      }
    ];

  res.json(fallbackPartners);
}));

// Health check for Notion connectivity
router.get('/health', asyncHandler(async (req, res) => {
  const notion = getNotion();
  let notionStatus = {
    connection: 'not_configured',
    database_access: false,
    partners_available: false
  };
  
  // Test Notion SDK connection
  try {
    if (notion && process.env.NOTION_PARTNERS_DATABASE_ID) {
      console.log('🏥 Testing Notion database connection...');
      
      // Try a minimal query to test connection
      const testResult = await notion.databases.query({
        database_id: process.env.NOTION_PARTNERS_DATABASE_ID,
        page_size: 1
      });
      
      if (testResult?.results) {
        notionStatus = {
          connection: 'connected',
          database_access: true,
          partners_available: testResult.results.length > 0,
          total_partners: testResult.results.length
        };
        console.log('✅ Notion connection test successful');
      }
    } else {
      console.log('⚙️ Notion client not initialized or database ID not configured');
    }
  } catch (error) {
    console.warn('⚠️ Notion connection test failed:', error.message);
    notionStatus = {
      connection: 'failed',
      database_access: false,
      partners_available: false,
      error: error.message
    };
  }
  
  res.json({
    status: notionStatus.connection === 'connected' ? 'healthy' : 'degraded',
    notion_status: notionStatus,
    fallback_available: true,
    message: notionStatus.connection === 'connected' 
      ? 'Notion MCP integration active with live data'
      : 'Using fallback data - Notion unavailable or not configured'
  });
}));

// Projects with Place property (robust, property-type agnostic)
router.get('/projects-with-place', asyncHandler(async (req, res) => {
  const notion = getNotion();
  try {
    const databaseId = (req.query.databaseId || process.env.NOTION_PROJECTS_DATABASE_ID || '').toString();
    const titleProp = (req.query.titleProp || 'Name').toString();
    const placeProp = (req.query.placeProp || 'Place').toString();

    if (!notion) {
      return res.status(401).json({ error: 'notion_unauthorized', message: 'NOTION_TOKEN missing or invalid. Share the database with your integration and set NOTION_TOKEN.' });
    }
    if (!databaseId) {
      return res.status(400).json({ error: 'database_id_required', message: 'Provide ?databaseId=... or set NOTION_PROJECTS_DATABASE_ID' });
    }

    // Fetch pages (pull then filter to avoid guessing Notion filter operator by type)
    const pageSize = Math.min(parseInt(req.query.pageSize || '100', 10), 200);
    const query = await notion.databases.query({ database_id: databaseId, page_size: pageSize });
    const pages = query?.results || [];

    const extractText = (prop) => {
      if (!prop) return '';
      if (prop.type === 'title') return (prop.title || []).map(t => t.plain_text || '').join('');
      if (prop.type === 'rich_text') return (prop.rich_text || []).map(t => t.plain_text || '').join('');
      if (prop.type === 'select') return prop.select?.name || '';
      if (prop.type === 'multi_select') return (prop.multi_select || []).map(s => s.name).join(', ');
      if (prop.type === 'url') return prop.url || '';
      if (prop.type === 'people') return (prop.people || []).map(p => p.name || p.id).join(', ');
      if (prop.type === 'relation') return (prop.relation || []).map(r => r.id).join(', ');
      if (prop.type === 'number') return String(prop.number ?? '');
      if (prop.type === 'checkbox') return prop.checkbox ? 'true' : 'false';
      if (prop.type === 'date') return prop.date?.start || '';
      return '';
    };

    const items = pages.map((p) => {
      const props = p.properties || {};
      const title = extractText(props[titleProp]);
      const place = extractText(props[placeProp]);
      const lat = props['Latitude']?.number ?? null;
      const lng = props['Longitude']?.number ?? null;
      return {
        id: p.id,
        url: p.url,
        title,
        place,
        latitude: lat,
        longitude: lng
      };
    }).filter(i => (i.place && i.place.trim().length > 0) || (i.latitude !== null && i.longitude !== null));

    return res.json({ ok: true, count: items.length, projects: items });
  } catch (error) {
    const status = error?.status || error?.statusCode || 500;
    if (status === 401) {
      return res.status(401).json({ error: 'notion_unauthorized', message: 'Failed to fetch from Notion: 401 Unauthorized. Confirm NOTION_TOKEN and share the database with the integration.' });
    }
    return res.status(500).json({ error: 'notion_projects_failed', message: error?.message || String(error) });
  }
}));

// Generic Notion query endpoint
router.post('/query', asyncHandler(async (req, res) => {
  const notion = getNotion();
  const { databaseId, filters, sorts, pageSize } = req.body;
  
  if (!databaseId) {
    return res.status(400).json({
      error: 'Database ID required',
      message: 'Please provide a databaseId in the request body'
    });
  }
  
  try {
    console.log('🔍 Querying Notion database:', databaseId);
    console.log('📋 Filters:', JSON.stringify(filters, null, 2));
    console.log('📊 Sorts:', JSON.stringify(sorts, null, 2));
    
    if (!notion) {
      throw new Error('Notion client not initialized - check NOTION_TOKEN environment variable');
    }
    
    // Use the Notion SDK to query the specified database
    const queryParams = {
      database_id: databaseId,
      page_size: pageSize || 100
    };
    
    // Add filters if provided
    if (filters && Object.keys(filters).length > 0) {
      queryParams.filter = filters;
    }
    
    // Add sorts if provided
    if (sorts && sorts.length > 0) {
      queryParams.sorts = sorts;
    }
    
    const result = await notion.databases.query(queryParams);
    
    if (result && result.results) {
      console.log(`✅ Successfully queried Notion database - found ${result.results.length} results`);
      res.json(result);
    } else {
      console.log('⚠️ No results from Notion query');
      res.json({
        results: [],
        has_more: false,
        next_cursor: null
      });
    }
    
  } catch (error) {
    console.error('❌ Error querying Notion database:', error);
    
    // Return structured error response
    res.status(500).json({
      error: 'Notion query failed',
      message: error.message,
      details: 'Check Notion token and database ID configuration',
      fallback_available: true
    });
  }
}));

// Projects endpoint
router.get('/projects', asyncHandler(async (req, res) => {
  const notion = getNotion();
  
  if (!notion) {
    return res.status(500).json({
      error: 'Notion not configured',
      message: 'Notion client not available - check NOTION_TOKEN'
    });
  }

  try {
    console.log('🔍 Fetching projects from Notion...');
    
    // Try to get projects from the notionService if available
    try {
      const { notionService } = await import('../services/notionService.js');
      if (notionService && notionService.getProjects) {
        const projects = await notionService.getProjects({
          useCache: true,
          filter: {
            Status: ['Active 🔥', 'Preparation 📋']
          }
        });
        console.log(`📊 Fetched ${projects.length} projects from Notion service`);
        return res.json(projects);
      }
    } catch (serviceError) {
      console.warn('⚠️ NotionService not available, using direct API');
    }
    
    // Fallback to empty array if service unavailable
    res.json([]);
    
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
}));

// People endpoint
router.get('/people', asyncHandler(async (req, res) => {
  const notion = getNotion();
  
  if (!notion) {
    return res.status(500).json({
      error: 'Notion not configured',
      message: 'Notion client not available - check NOTION_TOKEN'
    });
  }

  try {
    console.log('🔍 Fetching people from Notion...');
    
    try {
      const { notionService } = await import('../services/notionService.js');
      if (notionService && notionService.getPeople) {
        const people = await notionService.getPeople(true);
        console.log(`👥 Fetched ${people.length} people from Notion service`);
        return res.json(people);
      }
    } catch (serviceError) {
      console.warn('⚠️ NotionService not available for people');
    }
    
    res.json([]);
    
  } catch (error) {
    console.error('❌ Error fetching people:', error);
    res.status(500).json({
      error: 'Failed to fetch people',
      message: error.message
    });
  }
}));

// Artifacts endpoint
router.get('/artifacts', asyncHandler(async (req, res) => {
  const notion = getNotion();
  
  if (!notion) {
    return res.status(500).json({
      error: 'Notion not configured',
      message: 'Notion client not available - check NOTION_TOKEN'
    });
  }

  try {
    console.log('🔍 Fetching artifacts from Notion...');
    
    try {
      const { notionService } = await import('../services/notionService.js');
      if (notionService && notionService.getArtifacts) {
        const artifacts = await notionService.getArtifacts(true);
        console.log(`🎨 Fetched ${artifacts.length} artifacts from Notion service`);
        return res.json(artifacts);
      }
    } catch (serviceError) {
      console.warn('⚠️ NotionService not available for artifacts');
    }
    
    res.json([]);
    
  } catch (error) {
    console.error('❌ Error fetching artifacts:', error);
    res.status(500).json({
      error: 'Failed to fetch artifacts',
      message: error.message
    });
  }
}));

// Actions endpoint
router.get('/actions', asyncHandler(async (req, res) => {
  const notion = getNotion();
  
  if (!notion) {
    return res.status(500).json({
      error: 'Notion not configured',
      message: 'Notion client not available - check NOTION_TOKEN'
    });
  }

  try {
    console.log('🔍 Fetching actions from Notion...');
    
    try {
      const { notionService } = await import('../services/notionService.js');
      if (notionService && notionService.getActions) {
        const actions = await notionService.getActions(true);
        console.log(`⚡ Fetched ${actions.length} actions from Notion service`);
        return res.json(actions);
      }
    } catch (serviceError) {
      console.warn('⚠️ NotionService not available for actions');
    }
    
    res.json([]);
    
  } catch (error) {
    console.error('❌ Error fetching actions:', error);
    res.status(500).json({
      error: 'Failed to fetch actions',
      message: error.message
    });
  }
}));

export default router;
