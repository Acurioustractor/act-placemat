/**
 * Notion Proxy API - Bridge between frontend and Notion
 * Handles CORS and provides clean partner data endpoints
 */

import express from 'express';

const router = express.Router();

// Partner data endpoint - proxy to Notion
router.get('/partners', async (req, res) => {
  try {
    // TODO: Once Notion MCP is working, this will fetch from Notion
    // For now, return structured fallback data
    
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

    console.log('📄 Serving partner data (fallback structure ready for Notion)');
    res.json(fallbackPartners);
    
  } catch (error) {
    console.error('Notion proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch partner data',
      message: error.message 
    });
  }
});

// Health check for Notion connectivity
router.get('/health', async (req, res) => {
  try {
    // TODO: Test Notion connection once MCP is working
    res.json({
      status: 'ready',
      notion_connection: 'fallback_mode',
      message: 'Notion proxy ready - using structured fallback until MCP connection is established'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      notion_connection: 'failed',
      message: error.message
    });
  }
});

export default router;