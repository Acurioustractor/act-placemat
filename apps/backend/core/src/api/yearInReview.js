/**
 * Year in Review API Routes
 *
 * Endpoints for the 2025 (and future years) Year in Review page
 */

import express from 'express';
import multer from 'multer';
import YearInReviewService from '../services/yearInReviewService.js';
import { createSupabaseClient } from '../config/supabase.js';

const router = express.Router();

/**
 * Helper to get Supabase client
 */
function getSupabase() {
  return createSupabaseClient();
}

/**
 * Fetch linked media (hero + gallery) for timeline entries from Supabase
 */
async function fetchTimelineEntryMedia(entryIds) {
  if (!entryIds || entryIds.length === 0) return {};

  try {
    const supabase = getSupabase();

    const { data: links, error: linksError } = await supabase
      .from('review_media_links')
      .select('id, link_id, media_id, is_hero, display_order, caption, alt_text')
      .eq('link_type', 'timeline_entry')
      .in('link_id', entryIds);

    if (linksError || !links || links.length === 0) return {};

    const mediaIds = Array.from(new Set(links.map(l => l.media_id).filter(Boolean)));
    if (mediaIds.length === 0) return {};

    const { data: mediaItems, error: mediaError } = await supabase
      .from('media_items')
      .select('id, file_url, thumbnail_url, file_type, title, description, alt_text')
      .in('id', mediaIds);

    if (mediaError || !mediaItems) return {};

    const mediaById = new Map(mediaItems.map(m => [m.id, m]));
    const byEntry = {};

    for (const link of links) {
      const entryId = link.link_id;
      const media = mediaById.get(link.media_id);
      if (!entryId || !media) continue;

      if (!byEntry[entryId]) {
        byEntry[entryId] = {
          hero: null,
          gallery: []
        };
      }

      const item = {
        linkId: link.id,
        isHero: !!link.is_hero,
        displayOrder: link.display_order ?? 0,
        caption: link.caption ?? null,
        altText: link.alt_text ?? media.alt_text ?? null,
        media: {
          id: media.id,
          fileUrl: media.file_url,
          thumbnailUrl: media.thumbnail_url,
          fileType: media.file_type,
          title: media.title ?? null,
          description: media.description ?? null
        }
      };

      if (item.isHero) {
        byEntry[entryId].hero = item;
      } else {
        byEntry[entryId].gallery.push(item);
      }
    }

    // Stable ordering for gallery
    for (const entryId of Object.keys(byEntry)) {
      byEntry[entryId].gallery.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }

    return byEntry;
  } catch (error) {
    console.error('Error fetching timeline entry media:', error);
    return {};
  }
}

/**
 * Fetch linked videos for timeline entries from Supabase
 */
async function fetchTimelineEntryVideos(year, entryIds) {
  if (!entryIds || entryIds.length === 0) return {};

  try {
    const supabase = getSupabase();

    const { data: videos, error } = await supabase
      .from('review_videos')
      .select('id, platform, embed_url, title, link_id, display_order')
      .eq('year', year)
      .eq('link_type', 'timeline_entry')
      .in('link_id', entryIds)
      .order('display_order', { ascending: true });

    if (error || !videos || videos.length === 0) return {};

    const byEntry = {};
    for (const v of videos) {
      if (!v.link_id) continue;
      if (!byEntry[v.link_id]) byEntry[v.link_id] = [];
      byEntry[v.link_id].push(v);
    }

    return byEntry;
  } catch (error) {
    console.error('Error fetching timeline entry videos:', error);
    return {};
  }
}
const upload = multer({ storage: multer.memoryStorage() });

// Service instance (initialized with dependencies in server.js)
let yearInReviewService = null;

/**
 * Initialize the Year in Review service
 */
export function initYearInReviewService(notionMCP, gmailService) {
  yearInReviewService = new YearInReviewService(notionMCP, gmailService);
  console.log('✅ Year in Review service initialized');
}

/**
 * Middleware to ensure service is initialized
 */
function ensureService(req, res, next) {
  if (!yearInReviewService) {
    return res.status(503).json({
      error: 'Year in Review service not initialized',
      message: 'Please ensure the backend is properly configured'
    });
  }
  next();
}

/**
 * GET /api/year-in-review/places
 * Get all places from Notion Places database with coordinates
 * NOTE: This route MUST come before /:year to avoid being caught by the year parameter
 */
router.get('/places', async (req, res) => {
  try {
    const { Client } = await import('@notionhq/client');
    const notionClient = new Client({
      auth: process.env.NOTION_TOKEN || process.env.NOTION_INTEGRATION_TOKEN
    });

    const PLACES_DB = process.env.NOTION_PLACES_DATABASE_ID || '25debcf9-81cf-808e-a632-cbc6ae78d582';

    const response = await notionClient.databases.query({
      database_id: PLACES_DB,
      page_size: 100
    });

    const places = [];

    for (const page of response.results || []) {
      const props = page.properties || {};

      // Extract place name (traditional name from "Place" title field)
      const traditionalName = props.Place?.title?.[0]?.plain_text?.trim();
      const westernName = props['Western Name']?.rich_text?.map(r => r.plain_text).join('').trim();
      const name = traditionalName || westernName;
      if (!name) continue;

      // Extract coordinates from rich_text field (e.g., "-27.4698, 153.0251")
      let lat = null;
      let lng = null;

      const coordsText = props.Coordinates?.rich_text?.map(r => r.plain_text).join('').trim() || '';
      if (coordsText) {
        // Parse coordinates in format "lat, lng" or "lat,lng"
        const coordMatch = coordsText.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
        if (coordMatch) {
          lat = parseFloat(coordMatch[1]);
          lng = parseFloat(coordMatch[2]);
        }
      }

      // Also check the Map property (Notion place type) which may contain location
      if (!lat && !lng && props.Map?.place) {
        // Notion place type has lat/lng in the place object
        lat = props.Map.place.latitude;
        lng = props.Map.place.longitude;
      }

      // Extract other properties
      const region = props.State?.select?.name;
      const firstPeople = props['First People']?.rich_text?.map(r => r.plain_text).join('').trim();
      const protocols = props.Protocols?.rich_text?.map(r => r.plain_text).join('').trim();
      const country = region === 'Overseas' ? 'Overseas' : 'Australia';
      const type = 'Location';

      // Get related projects if there's a relation
      const relatedProjects = (props.Projects?.relation || []).map(r => r.id);

      places.push({
        id: page.id,
        name,
        traditionalName,
        westernName,
        lat: lat || null,
        lng: lng || null,
        region,
        country,
        firstPeople,
        protocols,
        type,
        relatedProjects,
        notionUrl: page.url
      });
    }

    // Filter places with coordinates for the map
    const mappablePlaces = places.filter(p => p.lat && p.lng);
    const unmappablePlaces = places.filter(p => !p.lat || !p.lng);

    console.log(`📍 Places: ${mappablePlaces.length} with coords, ${unmappablePlaces.length} without`);

    res.json({
      success: true,
      places: mappablePlaces,
      placesWithoutCoords: unmappablePlaces.map(p => p.name),
      total: places.length
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year
 * Get complete year-in-review data
 */
router.get('/:year', ensureService, async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    if (isNaN(year) || year < 2020 || year > 2030) {
      return res.status(400).json({ error: 'Invalid year. Must be between 2020 and 2030.' });
    }

    const data = await yearInReviewService.getYearData(year);
    res.json(data);
  } catch (error) {
    console.error('Error fetching year in review data:', error);
    res.status(500).json({ error: 'Failed to fetch year in review data', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/timeline
 * Get just the timeline entries
 */
router.get('/:year/timeline', ensureService, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const data = await yearInReviewService.getYearData(year);
    res.json({ year, timeline: data.timeline });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/metrics
 * Get computed metrics for the year
 */
router.get('/:year/metrics', ensureService, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const data = await yearInReviewService.getYearData(year);
    res.json({ year, metrics: data.metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/curated
 * Get admin-curated entries and merge linked media (hero + gallery + videos)
 */
router.get('/:year/curated', ensureService, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const curated = await yearInReviewService.getCuratedEntries(year);

    if (curated.entries && curated.entries.length > 0) {
      const entryIds = curated.entries.map(e => e.id);
      const mediaByEntry = await fetchTimelineEntryMedia(entryIds);
      const videosByEntry = await fetchTimelineEntryVideos(year, entryIds);

      curated.entries = curated.entries.map(entry => ({
        ...entry,
        heroImageId: mediaByEntry?.[entry.id]?.hero?.media?.id || entry.heroImageId || null,
        heroImageUrl: mediaByEntry?.[entry.id]?.hero?.media?.fileUrl || entry.heroImageUrl || null,
        heroImageAlt: mediaByEntry?.[entry.id]?.hero?.altText || entry.heroImageAlt || null,
        photos: (() => {
          const existing = Array.isArray(entry.photos) ? entry.photos : [];
          const linked = (mediaByEntry?.[entry.id]?.gallery || [])
            .filter(i => i?.media?.fileType === 'photo' && i?.media?.fileUrl)
            .map(i => i.media.fileUrl);
          const merged = [...existing, ...linked];
          if (merged.length === 0) return entry.photos || [];
          return Array.from(new Set(merged));
        })(),
        heroVideoUrl: videosByEntry?.[entry.id]?.[0]?.embed_url || entry.heroVideoUrl || null,
        heroVideoPlatform: videosByEntry?.[entry.id]?.[0]?.platform || entry.heroVideoPlatform || null,
        heroVideoTitle: videosByEntry?.[entry.id]?.[0]?.title || entry.heroVideoTitle || null
      }));
    }

    res.json({ year, ...curated });
  } catch (error) {
    console.error('Error fetching curated entries:', error);
    res.status(500).json({ error: 'Failed to fetch curated entries', details: error.message });
  }
});

/**
 * POST /api/year-in-review/:year/curated
 * Save admin-curated entries
 */
router.post('/:year/curated', ensureService, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { entries, seasons, settings } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    const saved = await yearInReviewService.saveCuratedEntries(year, {
      entries,
      seasons,
      settings
    });

    res.json({ success: true, ...saved });
  } catch (error) {
    console.error('Error saving curated entries:', error);
    res.status(500).json({ error: 'Failed to save curated entries', details: error.message });
  }
});

/**
 * POST /api/year-in-review/linkedin/upload
 * Upload LinkedIn CSV/JSON export
 */
router.post('/linkedin/upload', ensureService, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const year = parseInt(req.body.year) || new Date().getFullYear();
    const author = req.body.author || 'Unknown';
    const content = req.file.buffer.toString('utf-8');

    const result = await yearInReviewService.processLinkedInUpload(year, content, author);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error processing LinkedIn upload:', error);
    res.status(500).json({ error: 'Failed to process LinkedIn upload', details: error.message });
  }
});

/**
 * POST /api/year-in-review/linkedin/manual
 * Manually add LinkedIn posts (for copy-paste approach)
 */
router.post('/linkedin/manual', ensureService, async (req, res) => {
  try {
    const { year, author, posts } = req.body;

    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ error: 'posts array is required' });
    }

    const yearNum = parseInt(year) || new Date().getFullYear();

    // Convert manual posts to CSV-like format and process
    const formattedPosts = posts.map(p => ({
      date: p.date,
      content: p.content,
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: p.shares || 0,
      author: author || p.author || 'Unknown'
    }));

    // Save directly as JSON
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const linkedInDir = path.join(__dirname, '../../../../data/year-in-review', `${yearNum}`, 'linkedin');
    await fs.mkdir(linkedInDir, { recursive: true });

    const filename = `manual-${author?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}-${Date.now()}.json`;
    const filePath = path.join(linkedInDir, filename);

    await fs.writeFile(filePath, JSON.stringify(formattedPosts, null, 2));

    res.json({
      success: true,
      count: formattedPosts.length,
      filename,
      author
    });
  } catch (error) {
    console.error('Error saving manual LinkedIn posts:', error);
    res.status(500).json({ error: 'Failed to save posts', details: error.message });
  }
});

/**
 * POST /api/year-in-review/:year/entries/manual
 * Create a manual timeline entry
 */
router.post('/:year/entries/manual', ensureService, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { title, description, date, type, tags, projectId, photos } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    // Generate unique ID
    const entryId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entry = {
      id: entryId,
      date: date,
      title: title,
      description: description || '',
      source: 'manual',
      type: type || 'milestone',
      tags: tags || [],
      photos: photos || [],
      included: true,
      metadata: {
        projectId: projectId || null,
        createdAt: new Date().toISOString()
      }
    };

    // Save to manual entries file
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const manualDir = path.join(__dirname, '../../../../data/year-in-review', `${year}`, 'manual');
    await fs.mkdir(manualDir, { recursive: true });

    const entriesFile = path.join(manualDir, 'entries.json');

    let existingEntries = [];
    try {
      const content = await fs.readFile(entriesFile, 'utf-8');
      existingEntries = JSON.parse(content);
    } catch (e) {
      // File doesn't exist yet
    }

    existingEntries.push(entry);
    await fs.writeFile(entriesFile, JSON.stringify(existingEntries, null, 2));

    res.json({ success: true, entry });
  } catch (error) {
    console.error('Error creating manual entry:', error);
    res.status(500).json({ error: 'Failed to create entry', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/entries/manual
 * Get all manual entries
 */
router.get('/:year/entries/manual', async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const entriesFile = path.join(__dirname, '../../../../data/year-in-review', `${year}`, 'manual', 'entries.json');

    let entries = [];
    try {
      const content = await fs.readFile(entriesFile, 'utf-8');
      entries = JSON.parse(content);
    } catch (e) {
      // File doesn't exist
    }

    res.json({ success: true, entries });
  } catch (error) {
    console.error('Error fetching manual entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries', details: error.message });
  }
});

/**
 * PUT /api/year-in-review/:year/entries/manual/:entryId
 * Update a manual entry
 */
router.put('/:year/entries/manual/:entryId', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { entryId } = req.params;
    const updates = req.body;

    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const entriesFile = path.join(__dirname, '../../../../data/year-in-review', `${year}`, 'manual', 'entries.json');

    let entries = [];
    try {
      const content = await fs.readFile(entriesFile, 'utf-8');
      entries = JSON.parse(content);
    } catch (e) {
      return res.status(404).json({ error: 'No manual entries found' });
    }

    const index = entries.findIndex(e => e.id === entryId);
    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    entries[index] = { ...entries[index], ...updates, id: entryId };
    await fs.writeFile(entriesFile, JSON.stringify(entries, null, 2));

    res.json({ success: true, entry: entries[index] });
  } catch (error) {
    console.error('Error updating manual entry:', error);
    res.status(500).json({ error: 'Failed to update entry', details: error.message });
  }
});

/**
 * DELETE /api/year-in-review/:year/entries/manual/:entryId
 * Delete a manual entry
 */
router.delete('/:year/entries/manual/:entryId', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { entryId } = req.params;

    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const entriesFile = path.join(__dirname, '../../../../data/year-in-review', `${year}`, 'manual', 'entries.json');

    let entries = [];
    try {
      const content = await fs.readFile(entriesFile, 'utf-8');
      entries = JSON.parse(content);
    } catch (e) {
      return res.status(404).json({ error: 'No manual entries found' });
    }

    const filtered = entries.filter(e => e.id !== entryId);
    if (filtered.length === entries.length) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await fs.writeFile(entriesFile, JSON.stringify(filtered, null, 2));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting manual entry:', error);
    res.status(500).json({ error: 'Failed to delete entry', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/export
 * Export year in review data as JSON (for backup/sharing)
 */
router.get('/:year/export', ensureService, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const [fullData, curated] = await Promise.all([
      yearInReviewService.getYearData(year),
      yearInReviewService.getCuratedEntries(year)
    ]);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="year-in-review-${year}.json"`);

    res.json({
      exportedAt: new Date().toISOString(),
      year,
      data: fullData,
      curated
    });
  } catch (error) {
    console.error('Error exporting year in review:', error);
    res.status(500).json({ error: 'Failed to export', details: error.message });
  }
});

export default router;
