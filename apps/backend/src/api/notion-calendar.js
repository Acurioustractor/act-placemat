/**
 * Notion Calendar API - Integration with ACT Calendar Database
 * Provides calendar-specific endpoints for the Calendar & Roadmap Planning component
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { Client } from '@notionhq/client';

const router = express.Router();

// Initialize Notion client
let notion = null;
if (process.env.NOTION_TOKEN) {
  notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });
}

// ACT Calendar Database ID (from the URL provided by user)
const ACT_CALENDAR_DB = '229ebcf981cf80058edfdc391fe21a62';

/**
 * Query the ACT Calendar database
 * POST /api/notion/calendar
 */
router.post('/calendar', optionalAuth, asyncHandler(async (req, res) => {
  if (!notion) {
    return res.status(503).json({
      error: 'Notion integration not configured',
      message: 'NOTION_TOKEN environment variable is required'
    });
  }

  try {
    const { filter = {}, sorts = [], page_size = 100 } = req.body;
    
    // Query the calendar database
    const response = await notion.databases.query({
      database_id: ACT_CALENDAR_DB,
      filter: filter,
      sorts: sorts.length > 0 ? sorts : [
        {
          property: 'Date',
          direction: 'ascending'
        }
      ],
      page_size: Math.min(page_size, 100) // Limit to 100 items
    });

    // Enhanced response with calendar-specific metadata
    const calendarEvents = response.results.map(page => ({
      id: page.id,
      properties: page.properties,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      // Extract commonly used calendar fields
      title: page.properties?.Name?.title?.[0]?.plain_text || 'Untitled Event',
      date: page.properties?.Date?.date?.start,
      endDate: page.properties?.Date?.date?.end,
      location: page.properties?.Location?.rich_text?.[0]?.plain_text,
      region: page.properties?.Region?.select?.name,
      type: page.properties?.Type?.select?.name,
      status: page.properties?.Status?.select?.name,
      priority: page.properties?.Priority?.select?.name,
      culturalConsiderations: page.properties?.['Cultural Considerations']?.multi_select?.map(c => c.name) || [],
      participants: page.properties?.Participants?.people?.map(p => p.name) || [],
      description: page.properties?.Description?.rich_text?.[0]?.plain_text
    }));

    res.json({
      success: true,
      results: calendarEvents,
      has_more: response.has_more,
      next_cursor: response.next_cursor,
      total_events: calendarEvents.length,
      database_id: ACT_CALENDAR_DB,
      calendar_insights: {
        upcoming_events: calendarEvents.filter(event => {
          if (!event.date) return false;
          return new Date(event.date) > new Date();
        }).length,
        regions_covered: [...new Set(calendarEvents.map(e => e.region).filter(Boolean))],
        event_types: [...new Set(calendarEvents.map(e => e.type).filter(Boolean))],
        cultural_events: calendarEvents.filter(event => 
          event.culturalConsiderations && event.culturalConsiderations.length > 0
        ).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error querying calendar database:', error);
    res.status(500).json({
      error: 'Failed to query calendar',
      message: error.message,
      database_id: ACT_CALENDAR_DB
    });
  }
}));

/**
 * Create a new calendar event
 * POST /api/notion/calendar/event
 */
router.post('/calendar/event', optionalAuth, asyncHandler(async (req, res) => {
  if (!notion) {
    return res.status(503).json({
      error: 'Notion integration not configured',
      message: 'NOTION_TOKEN environment variable is required'
    });
  }

  try {
    const {
      title,
      date,
      endDate,
      location,
      region,
      type = 'Meeting',
      status = 'Tentative',
      priority = 'Medium',
      culturalConsiderations = [],
      participants = [],
      description
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and date are required'
      });
    }

    // Create the calendar event in Notion
    const newEvent = await notion.pages.create({
      parent: {
        database_id: ACT_CALENDAR_DB
      },
      properties: {
        // Title
        Name: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        
        // Date
        Date: {
          date: {
            start: date,
            end: endDate || null
          }
        },
        
        // Location (Rich Text)
        ...(location && {
          Location: {
            rich_text: [
              {
                text: {
                  content: location
                }
              }
            ]
          }
        }),
        
        // Region (Select)
        ...(region && {
          Region: {
            select: {
              name: region
            }
          }
        }),
        
        // Type (Select)
        Type: {
          select: {
            name: type
          }
        },
        
        // Status (Select)
        Status: {
          select: {
            name: status
          }
        },
        
        // Priority (Select)
        Priority: {
          select: {
            name: priority
          }
        },
        
        // Cultural Considerations (Multi-select)
        ...(culturalConsiderations.length > 0 && {
          'Cultural Considerations': {
            multi_select: culturalConsiderations.map(consideration => ({
              name: consideration
            }))
          }
        }),
        
        // Description (Rich Text)
        ...(description && {
          Description: {
            rich_text: [
              {
                text: {
                  content: description
                }
              }
            ]
          }
        })
      }
    });

    res.status(201).json({
      success: true,
      event: {
        id: newEvent.id,
        title: title,
        date: date,
        endDate: endDate,
        location: location,
        region: region,
        type: type,
        status: status,
        priority: priority,
        culturalConsiderations: culturalConsiderations,
        description: description,
        notion_url: newEvent.url
      },
      message: 'Calendar event created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({
      error: 'Failed to create calendar event',
      message: error.message
    });
  }
}));

/**
 * Update a calendar event
 * PATCH /api/notion/calendar/event/:eventId
 */
router.patch('/calendar/event/:eventId', optionalAuth, asyncHandler(async (req, res) => {
  if (!notion) {
    return res.status(503).json({
      error: 'Notion integration not configured',
      message: 'NOTION_TOKEN environment variable is required'
    });
  }

  try {
    const { eventId } = req.params;
    const updateData = req.body;
    
    // Build properties update object
    const properties = {};
    
    if (updateData.title) {
      properties.Name = {
        title: [{ text: { content: updateData.title } }]
      };
    }
    
    if (updateData.date) {
      properties.Date = {
        date: {
          start: updateData.date,
          end: updateData.endDate || null
        }
      };
    }
    
    if (updateData.status) {
      properties.Status = {
        select: { name: updateData.status }
      };
    }
    
    if (updateData.priority) {
      properties.Priority = {
        select: { name: updateData.priority }
      };
    }
    
    if (updateData.location) {
      properties.Location = {
        rich_text: [{ text: { content: updateData.location } }]
      };
    }
    
    if (updateData.description) {
      properties.Description = {
        rich_text: [{ text: { content: updateData.description } }]
      };
    }

    // Update the event
    const updatedEvent = await notion.pages.update({
      page_id: eventId,
      properties: properties
    });

    res.json({
      success: true,
      event: updatedEvent,
      message: 'Calendar event updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({
      error: 'Failed to update calendar event',
      message: error.message
    });
  }
}));

/**
 * Get calendar analytics and insights
 * GET /api/notion/calendar/analytics
 */
router.get('/calendar/analytics', optionalAuth, asyncHandler(async (req, res) => {
  if (!notion) {
    return res.status(503).json({
      error: 'Notion integration not configured',
      message: 'NOTION_TOKEN environment variable is required'
    });
  }

  try {
    // Query all calendar events for analytics
    const response = await notion.databases.query({
      database_id: ACT_CALENDAR_DB,
      page_size: 100
    });

    const events = response.results;
    const now = new Date();
    
    // Calculate analytics
    const analytics = {
      total_events: events.length,
      upcoming_events: events.filter(event => {
        const eventDate = event.properties?.Date?.date?.start;
        return eventDate && new Date(eventDate) > now;
      }).length,
      
      past_events: events.filter(event => {
        const eventDate = event.properties?.Date?.date?.start;
        return eventDate && new Date(eventDate) < now;
      }).length,
      
      // Event types distribution
      event_types: events.reduce((acc, event) => {
        const type = event.properties?.Type?.select?.name || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      
      // Status distribution
      status_distribution: events.reduce((acc, event) => {
        const status = event.properties?.Status?.select?.name || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      
      // Regional coverage
      regions_covered: [...new Set(
        events.map(event => event.properties?.Region?.select?.name)
          .filter(Boolean)
      )],
      
      // Cultural considerations count
      cultural_events: events.filter(event => {
        const culturalConsiderations = event.properties?.['Cultural Considerations']?.multi_select;
        return culturalConsiderations && culturalConsiderations.length > 0;
      }).length,
      
      // Priority distribution
      priority_distribution: events.reduce((acc, event) => {
        const priority = event.properties?.Priority?.select?.name || 'Medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {}),
      
      // Monthly event count for the next 6 months
      monthly_upcoming: (() => {
        const monthCounts = {};
        const upcomingEvents = events.filter(event => {
          const eventDate = event.properties?.Date?.date?.start;
          return eventDate && new Date(eventDate) > now;
        });
        
        upcomingEvents.forEach(event => {
          const eventDate = new Date(event.properties.Date.date.start);
          const monthKey = eventDate.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' });
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });
        
        return monthCounts;
      })()
    };

    res.json({
      success: true,
      analytics: analytics,
      database_id: ACT_CALENDAR_DB,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating calendar analytics:', error);
    res.status(500).json({
      error: 'Failed to generate analytics',
      message: error.message
    });
  }
}));

/**
 * Search calendar events
 * GET /api/notion/calendar/search
 */
router.get('/calendar/search', optionalAuth, asyncHandler(async (req, res) => {
  if (!notion) {
    return res.status(503).json({
      error: 'Notion integration not configured',
      message: 'NOTION_TOKEN environment variable is required'
    });
  }

  try {
    const { q, region, type, status, from_date, to_date } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (region) {
      filter.property = 'Region';
      filter.select = { equals: region };
    }
    
    if (type) {
      filter.property = 'Type';
      filter.select = { equals: type };
    }
    
    if (status) {
      filter.property = 'Status';
      filter.select = { equals: status };
    }
    
    if (from_date && to_date) {
      filter.property = 'Date';
      filter.date = {
        on_or_after: from_date,
        on_or_before: to_date
      };
    }
    
    // Query the database
    const response = await notion.databases.query({
      database_id: ACT_CALENDAR_DB,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sorts: [
        {
          property: 'Date',
          direction: 'ascending'
        }
      ],
      page_size: 50
    });

    // If there's a text query, filter results client-side
    let results = response.results;
    if (q) {
      const searchTerm = q.toLowerCase();
      results = results.filter(event => {
        const title = event.properties?.Name?.title?.[0]?.plain_text?.toLowerCase() || '';
        const location = event.properties?.Location?.rich_text?.[0]?.plain_text?.toLowerCase() || '';
        const description = event.properties?.Description?.rich_text?.[0]?.plain_text?.toLowerCase() || '';
        
        return title.includes(searchTerm) || 
               location.includes(searchTerm) || 
               description.includes(searchTerm);
      });
    }

    res.json({
      success: true,
      results: results,
      total_matches: results.length,
      search_params: { q, region, type, status, from_date, to_date },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error searching calendar:', error);
    res.status(500).json({
      error: 'Failed to search calendar',
      message: error.message
    });
  }
}));

export default router;