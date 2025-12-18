/**
 * Enhanced Timeline Generator API
 *
 * Generates intelligent timeline entries from calendar, Gmail, and Notion
 * Saves to file system (like existing year-in-review curated data)
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateEnhancedTimeline,
  generateFromCalendar,
  ENTRY_SIZES,
  suggestVideoBreaks
} from '../services/timelineGeneratorService.js';

const router = express.Router();

// Get data directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data/timeline-generator');

// Ensure data directory exists
async function ensureDataDir(year) {
  const yearDir = path.join(DATA_DIR, String(year));
  await fs.mkdir(yearDir, { recursive: true });
  return yearDir;
}

/**
 * GET /api/timeline-generator/:year
 * Generate enhanced timeline for a year
 */
router.get('/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { regenerate } = req.query;

    const yearDir = await ensureDataDir(year);
    const cacheFile = path.join(yearDir, 'generated.json');
    const editedFile = path.join(yearDir, 'edited.json');

    // Check for saved/edited timeline first (unless regenerating)
    if (!regenerate) {
      try {
        const edited = await fs.readFile(editedFile, 'utf-8');
        const data = JSON.parse(edited);
        return res.json({
          success: true,
          cached: true,
          source: 'edited',
          ...data
        });
      } catch (e) {
        // No edited file, check for cached generated
      }

      try {
        const cached = await fs.readFile(cacheFile, 'utf-8');
        const data = JSON.parse(cached);
        return res.json({
          success: true,
          cached: true,
          source: 'generated',
          ...data
        });
      } catch (e) {
        // Cache doesn't exist, generate fresh
      }
    }

    // Generate fresh timeline
    const timeline = await generateEnhancedTimeline(year);

    // Suggest video break points
    const videoBreaks = suggestVideoBreaks(timeline.entries);

    const result = {
      ...timeline,
      videoBreaks,
      generatedAt: new Date().toISOString()
    };

    // Cache the result
    await fs.writeFile(cacheFile, JSON.stringify(result, null, 2));

    res.json({
      success: true,
      cached: false,
      ...result
    });

  } catch (error) {
    console.error('Error generating timeline:', error);
    res.status(500).json({
      error: 'Failed to generate timeline',
      message: error.message
    });
  }
});

/**
 * GET /api/timeline-generator/:year/calendar
 * Generate timeline entries from calendar only
 */
router.get('/:year/calendar', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const entries = await generateFromCalendar(year);

    res.json({
      success: true,
      year,
      count: entries.length,
      entries,
      stats: {
        byCategory: entries.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + 1;
          return acc;
        }, {}),
        bySize: entries.reduce((acc, e) => {
          acc[e.size] = (acc[e.size] || 0) + 1;
          return acc;
        }, {}),
        included: entries.filter(e => e.included).length
      }
    });

  } catch (error) {
    console.error('Error generating from calendar:', error);
    res.status(500).json({
      error: 'Failed to generate from calendar',
      message: error.message
    });
  }
});

/**
 * POST /api/timeline-generator/:year/save
 * Save edited timeline entries
 */
router.post('/:year/save', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { entries, videoBreaks } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    const yearDir = await ensureDataDir(year);
    const saveFile = path.join(yearDir, 'edited.json');

    const data = {
      entries,
      videoBreaks: videoBreaks || [],
      savedAt: new Date().toISOString()
    };

    await fs.writeFile(saveFile, JSON.stringify(data, null, 2));

    res.json({
      success: true,
      message: 'Timeline saved',
      count: entries.length,
      savedAt: data.savedAt
    });

  } catch (error) {
    console.error('Error saving timeline:', error);
    res.status(500).json({
      error: 'Failed to save timeline',
      message: error.message
    });
  }
});

/**
 * GET /api/timeline-generator/:year/saved
 * Get saved edited timeline
 */
router.get('/:year/saved', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const yearDir = await ensureDataDir(year);
    const saveFile = path.join(yearDir, 'edited.json');

    try {
      const content = await fs.readFile(saveFile, 'utf-8');
      const data = JSON.parse(content);
      res.json({
        success: true,
        ...data
      });
    } catch (e) {
      if (e.code === 'ENOENT') {
        return res.status(404).json({
          error: 'No saved timeline found',
          year
        });
      }
      throw e;
    }

  } catch (error) {
    console.error('Error loading saved timeline:', error);
    res.status(500).json({
      error: 'Failed to load saved timeline',
      message: error.message
    });
  }
});

/**
 * PUT /api/timeline-generator/:year/entry/:entryId
 * Update a single timeline entry
 */
router.put('/:year/entry/:entryId', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { entryId } = req.params;
    const updates = req.body;

    const yearDir = await ensureDataDir(year);
    const saveFile = path.join(yearDir, 'edited.json');

    // Load existing timeline
    let existing;
    try {
      const content = await fs.readFile(saveFile, 'utf-8');
      existing = JSON.parse(content);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return res.status(404).json({
          error: 'No saved timeline found to update'
        });
      }
      throw e;
    }

    if (!existing?.entries) {
      return res.status(404).json({
        error: 'No saved timeline found to update'
      });
    }

    // Update the specific entry
    const entries = existing.entries.map(entry => {
      if (entry.id === entryId) {
        return { ...entry, ...updates };
      }
      return entry;
    });

    // Save back
    const data = {
      ...existing,
      entries,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(saveFile, JSON.stringify(data, null, 2));

    res.json({
      success: true,
      entry: entries.find(e => e.id === entryId)
    });

  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({
      error: 'Failed to update entry',
      message: error.message
    });
  }
});

/**
 * GET /api/timeline-generator/config/sizes
 * Get available entry sizes
 */
router.get('/config/sizes', (req, res) => {
  res.json({
    sizes: ENTRY_SIZES,
    descriptions: {
      [ENTRY_SIZES.HERO]: 'Full-width hero with large image/video and detailed story',
      [ENTRY_SIZES.FEATURED]: 'Large card with image, description, and read more button',
      [ENTRY_SIZES.STANDARD]: 'Medium card with brief information',
      [ENTRY_SIZES.COMPACT]: 'Small entry with title and date',
      [ENTRY_SIZES.MARKER]: 'Timeline marker with minimal info'
    }
  });
});

export default router;
