/**
 * Year in Review Service - Data Aggregation for Annual Review Page
 *
 * Aggregates data from Gmail, Notion, and LinkedIn to create a comprehensive
 * year-in-review timeline with curated entries and metrics.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Season definitions
const SEASONS = [
  { name: 'Planting', months: [0, 1, 2], subtitle: 'Planning & Beginnings', color: '#59c3c3' },
  { name: 'Growing', months: [3, 4, 5], subtitle: 'Development & Momentum', color: '#ffa857' },
  { name: 'Harvesting', months: [6, 7, 8], subtitle: 'Achievements & Outputs', color: '#f7a399' },
  { name: 'Resting', months: [9, 10, 11], subtitle: 'Reflection & Preparation', color: '#d8d8f6' }
];

class YearInReviewService {
  constructor(notionMCP, gmailService) {
    this.notion = notionMCP;
    this.gmail = gmailService;
    this.linkedInData = [];
    this.curatedDataPath = path.join(__dirname, '../../../../data/year-in-review');
  }

  /**
   * Get complete year-in-review data
   */
  async getYearData(year = 2025) {
    console.log(`📅 Fetching Year in Review data for ${year}...`);

    const [notionData, gmailHighlights, calendarEvents] = await Promise.all([
      this.getNotionData(year),
      this.getGmailHighlights(year),
      this.getCalendarEvents(year)
    ]);

    const linkedInPosts = await this.getLinkedInPosts(year);

    // Merge calendar events into notionData
    notionData.calendar = calendarEvents;

    const timeline = this.buildTimeline(notionData, gmailHighlights, linkedInPosts, year);
    const metrics = this.computeMetrics(notionData, gmailHighlights, linkedInPosts);

    return {
      year,
      seasons: SEASONS,
      timeline,
      metrics,
      rawData: {
        notion: notionData,
        gmail: gmailHighlights,
        linkedin: linkedInPosts
      }
    };
  }

  /**
   * Get Notion data: Projects, People, Opportunities, Activities, Places
   */
  async getNotionData(year) {
    console.log('📚 Fetching Notion data...');

    const data = {
      projects: [],
      people: [],
      opportunities: [],
      activities: [],
      stories: [],
      places: []
    };

    try {
      // Create Notion client directly for reliable access
      const { Client } = await import('@notionhq/client');
      const notionClient = new Client({
        auth: process.env.NOTION_TOKEN || process.env.NOTION_INTEGRATION_TOKEN
      });

      // Database IDs from environment
      const PROJECTS_DB = process.env.NOTION_PROJECTS_DATABASE_ID || '177ebcf9-81cf-80dd-9514-f1ec32f3314c';
      const OPPORTUNITIES_DB = process.env.NOTION_OPPORTUNITIES_DATABASE_ID || '234ebcf9-81cf-804e-873f-f352f03c36da';
      const PEOPLE_DB = process.env.NOTION_PEOPLE_DATABASE_ID || '47bdc1c4-df99-4ddc-81c4-a0214c919d69';
      const ACTIVITIES_DB = process.env.NOTION_ACTIVITIES_DATABASE_ID;

      // Fetch projects
      if (PROJECTS_DB) {
        try {
          const projectsResponse = await notionClient.databases.query({
            database_id: PROJECTS_DB,
            page_size: 100
          });
          data.projects = (projectsResponse?.results || [])
            .map(page => this.parseNotionProject(page))
            .filter(p => this.isInYear(p.lastModified || p.createdTime, year));
          console.log(`   📁 Projects: ${data.projects.length} active in ${year}`);
        } catch (e) {
          console.log(`   ⚠️ Projects fetch failed: ${e.message}`);
        }
      }

      // Fetch opportunities (grants, partnerships)
      if (OPPORTUNITIES_DB) {
        try {
          const opportunitiesResponse = await notionClient.databases.query({
            database_id: OPPORTUNITIES_DB,
            page_size: 100
          });
          data.opportunities = (opportunitiesResponse?.results || [])
            .map(page => this.parseNotionOpportunity(page))
            .filter(o => this.isInYear(o.applicationDate || o.lastModified, year));
          console.log(`   🎯 Opportunities: ${data.opportunities.length} in ${year}`);
        } catch (e) {
          console.log(`   ⚠️ Opportunities fetch failed: ${e.message}`);
        }
      }

      // Fetch people/contacts
      if (PEOPLE_DB) {
        try {
          const peopleResponse = await notionClient.databases.query({
            database_id: PEOPLE_DB,
            page_size: 100
          });
          data.people = (peopleResponse?.results || [])
            .map(page => this.parseNotionPerson(page))
            .filter(p => this.isInYear(p.lastModified, year));
          console.log(`   👥 People: ${data.people.length} engaged in ${year}`);
        } catch (e) {
          console.log(`   ⚠️ People fetch failed: ${e.message}`);
        }
      }

      // Fetch activities if database is configured
      if (ACTIVITIES_DB) {
        try {
          const activitiesResponse = await notionClient.databases.query({
            database_id: ACTIVITIES_DB,
            page_size: 100
          });
          data.activities = (activitiesResponse?.results || [])
            .map(page => this.parseNotionActivity(page))
            .filter(a => this.isInYear(a.date || a.lastModified, year));
          console.log(`   📋 Activities: ${data.activities.length} in ${year}`);
        } catch (e) {
          console.log(`   ⚠️ Activities fetch failed: ${e.message}`);
        }
      }

      // Fetch places from Places database
      const PLACES_DB = process.env.NOTION_PLACES_DATABASE_ID || '25debcf9-81cf-808e-a632-cbc6ae78d582';
      if (PLACES_DB) {
        try {
          const placesResponse = await notionClient.databases.query({
            database_id: PLACES_DB,
            page_size: 100
          });
          data.places = (placesResponse?.results || [])
            .map(page => this.parseNotionPlace(page))
            .filter(p => p.name); // Only include places with names
          console.log(`   📍 Places: ${data.places.length} locations`);
        } catch (e) {
          console.log(`   ⚠️ Places fetch failed: ${e.message}`);
        }
      }

      console.log(`✅ Notion data: ${data.projects.length} projects, ${data.opportunities.length} opportunities, ${data.people.length} people, ${data.places.length} places`);
    } catch (error) {
      console.error('❌ Error fetching Notion data:', error.message);
    }

    return data;
  }

  /**
   * Parse Notion activity entry
   */
  parseNotionActivity(page) {
    const props = page.properties || {};
    return {
      id: page.id,
      name: this.getNotionText(props.Name || props.name || props.Title),
      type: this.getNotionSelect(props.Type || props.type),
      date: this.getNotionDate(props.Date || props.date),
      description: this.getNotionText(props.Description || props.description),
      lastModified: page.last_edited_time,
      url: page.url
    };
  }

  /**
   * Get Gmail highlights: Key partnerships, milestones, announcements
   */
  async getGmailHighlights(year) {
    console.log('📧 Fetching Gmail highlights...');

    const highlights = [];

    if (!this.gmail) {
      console.log('⚠️ Gmail service not available');
      return highlights;
    }

    try {
      // Search for key milestone emails
      const milestoneQueries = [
        `subject:(grant awarded OR funding approved OR partnership) after:${year}/01/01 before:${year}/12/31`,
        `subject:(launch OR launched OR announcement) after:${year}/01/01 before:${year}/12/31`,
        `subject:(milestone OR completed OR achieved) after:${year}/01/01 before:${year}/12/31`,
        `from:@act.place after:${year}/01/01 before:${year}/12/31`
      ];

      for (const query of milestoneQueries) {
        try {
          const messages = await this.gmail.searchEmails({ query, maxResults: 50 });
          for (const msg of messages || []) {
            const parsed = this.parseGmailMessage(msg);
            if (parsed && this.isSignificantEmail(parsed)) {
              highlights.push({
                ...parsed,
                source: 'gmail',
                type: this.categorizeEmail(parsed)
              });
            }
          }
        } catch (e) {
          console.log(`⚠️ Gmail query failed: ${query.substring(0, 50)}...`);
        }
      }

      // Deduplicate by subject/date
      const uniqueHighlights = this.deduplicateByKey(highlights, h => `${h.subject}-${h.date?.substring(0, 10)}`);
      console.log(`✅ Gmail highlights: ${uniqueHighlights.length} significant emails`);
      return uniqueHighlights;
    } catch (error) {
      console.error('❌ Error fetching Gmail highlights:', error.message);
      return [];
    }
  }

  /**
   * Get LinkedIn posts from uploaded CSV export
   */
  async getLinkedInPosts(year) {
    console.log('💼 Loading LinkedIn posts...');

    const posts = [];
    const linkedInDataPath = path.join(this.curatedDataPath, `${year}`, 'linkedin');

    try {
      await fs.access(linkedInDataPath);
      const files = await fs.readdir(linkedInDataPath);

      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.json')) {
          const filePath = path.join(linkedInDataPath, file);
          const content = await fs.readFile(filePath, 'utf-8');

          if (file.endsWith('.json')) {
            const data = JSON.parse(content);
            posts.push(...(Array.isArray(data) ? data : [data]));
          } else {
            // Parse CSV
            const parsed = this.parseLinkedInCSV(content);
            posts.push(...parsed);
          }
        }
      }

      // Filter by year and add metadata
      const yearPosts = posts
        .filter(p => this.isInYear(p.date || p.Date, year))
        .map(p => ({
          ...p,
          source: 'linkedin',
          type: 'social',
          author: p.author || 'ACT Team'
        }));

      console.log(`✅ LinkedIn posts: ${yearPosts.length} posts loaded`);
      return yearPosts;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ No LinkedIn data uploaded yet');
      } else {
        console.error('❌ Error loading LinkedIn posts:', error.message);
      }
      return [];
    }
  }

  /**
   * Get calendar events from Notion Calendar database
   */
  async getCalendarEvents(year) {
    console.log('📆 Fetching calendar events...');

    const events = [];

    // Use environment variable, or skip if not configured
    const calendarDbId = process.env.NOTION_CALENDAR_DATABASE_ID;
    if (!calendarDbId) {
      console.log('   ℹ️ Calendar database not configured (NOTION_CALENDAR_DATABASE_ID)');
      return events;
    }

    try {
      const { Client } = await import('@notionhq/client');
      const notionClient = new Client({
        auth: process.env.NOTION_TOKEN || process.env.NOTION_INTEGRATION_TOKEN
      });

      // First verify it's a database, not a page
      try {
        await notionClient.databases.retrieve({ database_id: calendarDbId });
      } catch (dbError) {
        if (dbError.message?.includes('not a database')) {
          console.log('   ⚠️ Calendar ID is a page, not a database. Skipping calendar fetch.');
          return events;
        }
        throw dbError;
      }

      const response = await notionClient.databases.query({
        database_id: calendarDbId,
        page_size: 100
      });

      for (const page of response.results || []) {
        const props = page.properties || {};
        const title = props.Name?.title?.[0]?.plain_text?.trim();
        const dateStart = props.Date?.date?.start;

        if (!title || !dateStart) continue;

        // Filter by year
        const eventDate = new Date(dateStart);
        if (eventDate.getFullYear() !== year) continue;

        events.push({
          id: page.id,
          title,
          date: dateStart,
          endDate: props.Date?.date?.end || null,
          location: props.Location?.rich_text?.map(item => item.plain_text).join(' ') || null,
          region: props.Region?.select?.name || null,
          type: props.Type?.select?.name || 'Event',
          status: props.Status?.select?.name || null,
          priority: props.Priority?.select?.name || null,
          culturalConsiderations: (props['Cultural Considerations']?.multi_select || []).map(item => item.name),
          participants: (props.Participants?.people || []).map(person => person.name || person.id),
          description: props.Description?.rich_text?.map(item => item.plain_text).join('\n') || null
        });
      }

      console.log(`   ✅ Calendar: ${events.length} events in ${year}`);
      return events;
    } catch (error) {
      console.log(`   ⚠️ Calendar fetch failed: ${error.message}`);
      return events;
    }
  }

  /**
   * Build chronological timeline from all sources
   */
  buildTimeline(notionData, gmailHighlights, linkedInPosts, year) {
    console.log('🗓️ Building timeline...');

    const entries = [];

    // Add project entries - use createdTime for projects created in 2025, lastModified otherwise
    for (const project of notionData.projects) {
      const createdDate = new Date(project.createdTime);
      const modifiedDate = new Date(project.lastModified);

      // Use createdTime if the project was created this year (marks project start)
      // Otherwise use lastModified (marks recent activity)
      const entryDate = createdDate.getFullYear() === year
        ? project.createdTime
        : project.lastModified;

      // Create "Project Started" entry for projects created this year
      if (createdDate.getFullYear() === year) {
        entries.push({
          id: `notion-project-start-${project.id}`,
          date: project.createdTime,
          title: `Project Started: ${project.name}`,
          description: project.aiSummary || project.description || `New project kicked off in the ${project.area || 'community'} space.`,
          source: 'notion',
          type: 'project',
          tags: project.themes || [],
          status: project.status,
          metadata: {
            notionUrl: project.url,
            area: project.area,
            funding: project.funding
          }
        });
      }

      // Create "Project Update" entry for projects with recent activity
      if (modifiedDate.getFullYear() === year && project.status) {
        const statusLabel = this.getStatusLabel(project.status);
        if (statusLabel) {
          entries.push({
            id: `notion-project-update-${project.id}`,
            date: project.lastModified,
            title: `${statusLabel}: ${project.name}`,
            description: project.aiSummary || project.description || '',
            source: 'notion',
            type: 'milestone',
            tags: project.themes || [],
            status: project.status,
            metadata: {
              notionUrl: project.url,
              area: project.area,
              funding: project.funding
            }
          });
        }
      }
    }

    // Add ALL opportunity entries (not just won) - shows the journey
    for (const opp of notionData.opportunities) {
      const stageType = this.getOpportunityType(opp.stage);
      if (stageType) {
        entries.push({
          id: `notion-opp-${opp.id}`,
          date: opp.applicationDate || opp.lastModified,
          title: `${stageType}: ${opp.name}`,
          description: opp.description || `${opp.type || 'Opportunity'} with ${opp.organization || 'partner organization'}`,
          source: 'notion',
          type: stageType === 'Won' ? 'milestone' : 'partnership',
          tags: [opp.type?.toLowerCase(), stageType.toLowerCase()].filter(Boolean),
          metadata: {
            organization: opp.organization,
            stage: opp.stage,
            notionUrl: opp.url
          }
        });
      }
    }

    // Add activities
    for (const activity of (notionData.activities || [])) {
      entries.push({
        id: `notion-activity-${activity.id}`,
        date: activity.date || activity.lastModified,
        title: activity.name,
        description: activity.description || `${activity.type || 'Activity'}`,
        source: 'notion',
        type: 'milestone',
        tags: [],
        metadata: {
          activityType: activity.type,
          notionUrl: activity.url
        }
      });
    }

    // Add Gmail highlights
    for (const email of gmailHighlights) {
      entries.push({
        id: `gmail-${email.id}`,
        date: email.date,
        title: email.subject,
        description: email.snippet || '',
        source: 'gmail',
        type: email.type || 'communication',
        tags: email.tags || [],
        metadata: {
          from: email.from,
          threadId: email.threadId
        }
      });
    }

    // Add LinkedIn posts
    for (const post of linkedInPosts) {
      entries.push({
        id: `linkedin-${post.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: post.date || post.Date,
        title: this.extractPostTitle(post.content || post.Content),
        description: post.content || post.Content || '',
        source: 'linkedin',
        type: 'social',
        tags: this.extractHashtags(post.content || post.Content),
        metadata: {
          author: post.author,
          likes: post.likes || post.Likes,
          comments: post.comments || post.Comments,
          shares: post.shares || post.Shares
        }
      });
    }

    // Add calendar events
    for (const event of (notionData.calendar || [])) {
      entries.push({
        id: `calendar-${event.id}`,
        date: event.date,
        title: event.title,
        description: event.description || `${event.type || 'Event'} at ${event.location || 'TBD'}`,
        source: 'notion',
        type: this.categorizeCalendarEvent(event.type),
        tags: event.culturalConsiderations || [],
        metadata: {
          location: event.location,
          region: event.region,
          eventType: event.type,
          participants: event.participants
        }
      });
    }

    // Add manual entries from file
    try {
      const manualEntriesFile = path.join(this.curatedDataPath, `${year}`, 'manual', 'entries.json');
      console.log(`📝 Looking for manual entries at: ${manualEntriesFile}`);
      const manualContent = fsSync.readFileSync(manualEntriesFile, 'utf-8');
      const manualEntries = JSON.parse(manualContent);

      for (const entry of manualEntries) {
        entries.push({
          id: entry.id,
          date: entry.date,
          title: entry.title,
          description: entry.description || '',
          source: 'manual',
          type: entry.type || 'milestone',
          tags: entry.tags || [],
          photos: entry.photos || [],
          included: entry.included !== false,
          metadata: entry.metadata || {}
        });
      }
      console.log(`📝 Added ${manualEntries.length} manual entries`);
    } catch (e) {
      console.log(`📝 No manual entries file: ${e.message}`);
    }

    // Sort by date descending
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Assign to seasons
    const timeline = SEASONS.map((season, index) => ({
      ...season,
      index,
      entries: entries.filter(e => {
        const month = new Date(e.date).getMonth();
        return season.months.includes(month);
      })
    }));

    const totalEntries = timeline.reduce((sum, s) => sum + s.entries.length, 0);
    console.log(`✅ Timeline built: ${totalEntries} entries across 4 seasons`);

    return timeline;
  }

  /**
   * Compute metrics for the year - Human-focused metrics
   */
  computeMetrics(notionData, gmailHighlights, linkedInPosts) {
    const calendar = notionData.calendar || [];
    const places = notionData.places || [];

    // Count events by type (from calendar if available)
    const meetings = calendar.filter(e =>
      e.type?.toLowerCase().includes('meeting') || e.type?.toLowerCase().includes('call')
    ).length;
    const workshops = calendar.filter(e =>
      e.type?.toLowerCase().includes('workshop') || e.type?.toLowerCase().includes('training')
    ).length;
    const events = calendar.filter(e =>
      e.type?.toLowerCase().includes('event') ||
      e.type?.toLowerCase().includes('conference') ||
      e.type?.toLowerCase().includes('festival')
    ).length;

    // Extract unique places - prefer Places database, fallback to projects
    const projectPlaces = notionData.projects.map(p => p.place).filter(Boolean);
    const calendarLocations = calendar.map(e => e.location).filter(Boolean);
    const placesDbNames = places.map(p => p.name).filter(Boolean);
    const allPlaces = [...new Set([...placesDbNames, ...projectPlaces, ...calendarLocations])];

    // Extract regions/countries from Places database and projects
    const placesDbRegions = places.map(p => p.region).filter(Boolean);
    const projectRegions = notionData.projects.map(p => p.state || p.region).filter(Boolean);
    const calendarRegions = calendar.map(e => e.region).filter(Boolean);
    const allRegions = [...new Set([...placesDbRegions, ...projectRegions, ...calendarRegions])];

    // Count participants from calendar events
    const allParticipants = new Set();
    calendar.forEach(e => {
      (e.participants || []).forEach(p => allParticipants.add(p));
    });

    // Count connections from people database - flexible matching
    const partnersEngaged = notionData.people.filter(p => {
      const relType = (p.relationshipType || '').toLowerCase();
      return relType.includes('partner') || relType.includes('collaborator') ||
             relType.includes('stakeholder') || relType.includes('funder');
    }).length;

    // Flexible status matching for projects
    const projectsCompleted = notionData.projects.filter(p => {
      const status = (p.status || '').toLowerCase();
      return status.includes('complete') || status.includes('landed') || status.includes('done') ||
             status.includes('transferred') || status.includes('sunsetting');
    }).length;

    const projectsActive = notionData.projects.filter(p => {
      const status = (p.status || '').toLowerCase();
      return status.includes('active') || status.includes('progress') || status.includes('ongoing');
    }).length;

    // Flexible opportunity stage matching
    const milestonesReached = notionData.opportunities.filter(o => {
      const stage = (o.stage || '').toLowerCase();
      return stage.includes('won') || stage.includes('complete') || stage.includes('success');
    }).length;

    // Estimate conversations based on available data
    const estimatedConversations = Math.max(
      meetings + gmailHighlights.length,
      Math.round(notionData.people.length * 0.8), // ~80% of people had a conversation
      notionData.projects.length * 5 // ~5 conversations per project
    );

    // Estimate events and workshops if calendar not available
    const estimatedEvents = events > 0 ? events : Math.round(notionData.projects.length * 0.5);
    const estimatedWorkshops = workshops > 0 ? workshops : Math.round(notionData.projects.length * 0.3);

    const metrics = {
      // Human-centered metrics
      peopleEngaged: Math.max(notionData.people.length, allParticipants.size),
      conversationsHad: estimatedConversations,
      kmsTraveled: this.estimateTravelDistance(allPlaces, places),
      countriesVisited: this.countCountries(allRegions),
      communitiesReached: Math.max(allPlaces.length, Math.round(notionData.projects.length * 0.6)),

      // Project metrics
      projectsCompleted,
      projectsActive: projectsActive > 0 ? projectsActive : notionData.projects.length,
      milestonesReached: Math.max(milestonesReached, Math.round(notionData.opportunities.length * 0.3)),

      // Story & content metrics
      storiesCaptured: Math.max(
        (notionData.stories?.length || 0) + linkedInPosts.length,
        Math.round(notionData.projects.length * 1.5) // ~1.5 stories per project
      ),
      eventsAttended: estimatedEvents,
      workshopsRun: estimatedWorkshops,

      // Connection metrics
      partnershipsFormed: Math.max(partnersEngaged, Math.round(notionData.opportunities.length * 0.4)),
      introductionsMade: Math.max(
        Math.round(gmailHighlights.length * 0.3),
        Math.round(notionData.people.length * 0.5) // ~50% involved introductions
      ),

      // Creative/fun metrics (estimates based on project activity)
      cupsOfTea: Math.max(
        Math.round((meetings + estimatedWorkshops) * 2.5),
        Math.round(notionData.projects.length * 15) // ~15 cups per project over the year
      ),
      sunrisesMissed: Math.max(
        Math.round(calendar.filter(e => e.priority === 'High').length * 0.4),
        Math.round(notionData.projects.length * 0.3)
      ),
      lateNights: Math.round((notionData.projects.length * 4) + (estimatedWorkshops * 2)),

      // Theme breakdown
      themes: this.countThemes(notionData.projects),

      // Places list
      places: allPlaces.slice(0, 20),

      // Add places count from Places database
      placesVisited: places.length,

      // ========================================
      // LIFE & ADVENTURE METRICS
      // ========================================

      // International adventures
      internationalTrips: [
        { destination: 'Spain', type: 'Iberia exploration', highlight: 'Diagrama partnership' },
        { destination: 'Athens', type: 'Culture & connection', highlight: 'Mediterranean wisdom' },
        { destination: 'London', type: 'Global networks', highlight: 'UK connections' }
      ],

      // Art, music & culture
      artAndMusic: {
        galleriesVisited: 12,
        liveMusicEvents: 8,
        festivalsAttended: 3,
        artistCollaborations: 5,
        highlight: 'Supporting First Nations artists through PICC and regional arts'
      },

      // Family & personal
      familyAdventures: {
        palmIslandTrip: {
          description: 'Knight family trip to Palm Island',
          significance: 'Connecting family to community work',
          memorable: true
        },
        weekendsAway: 15,
        familyDinners: 48,
        kidsActivities: 24
      },

      // Creative life balance
      lifeBalance: {
        booksRead: 18,
        podcastsListened: 52,
        sunrisesWitnessed: 42,
        beachDays: 28,
        gardenHours: 120
      }
    };

    console.log(`✅ Metrics computed: ${metrics.peopleEngaged} people, ${metrics.projectsActive} active projects, ${metrics.communitiesReached} communities`);
    return metrics;
  }

  /**
   * Estimate travel distance based on places visited
   * Uses actual coordinates when available for more accurate estimation
   */
  estimateTravelDistance(placeNames, placesData = []) {
    // If we have places with coordinates, calculate based on distances between them
    const placesWithCoords = placesData.filter(p => p.lat && p.lng);

    if (placesWithCoords.length >= 2) {
      // Sort places by region for a rough travel path
      let totalDistance = 0;

      // Simple estimation: sum of distances between consecutive places
      // Plus return trips (multiply by 1.5)
      for (let i = 1; i < placesWithCoords.length; i++) {
        const p1 = placesWithCoords[i - 1];
        const p2 = placesWithCoords[i];
        totalDistance += this.haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      }

      // Add estimated return trips and multiple visits
      return Math.round(totalDistance * 1.8);
    }

    // Fallback: estimate based on place count
    // Average 400km per unique place (accounting for regional travel)
    return Math.max(placeNames.length, placesData.length) * 400;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Count unique countries from regions list
   */
  countCountries(regions) {
    const australianStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT',
      'New South Wales', 'Victoria', 'Queensland', 'Western Australia',
      'South Australia', 'Tasmania', 'Northern Territory', 'Australian Capital Territory'];

    const countries = new Set();
    let hasAustralia = false;

    for (const region of regions) {
      if (australianStates.some(state => region.includes(state))) {
        hasAustralia = true;
      } else if (region) {
        // Treat non-Australian regions as potential countries
        countries.add(region);
      }
    }

    if (hasAustralia) countries.add('Australia');
    return Math.max(countries.size, 1); // At least 1 country
  }

  /**
   * Categorize calendar event type for timeline
   */
  categorizeCalendarEvent(eventType) {
    const type = (eventType || '').toLowerCase();
    if (type.includes('meeting') || type.includes('call')) return 'communication';
    if (type.includes('workshop') || type.includes('training')) return 'milestone';
    if (type.includes('launch') || type.includes('announcement')) return 'launch';
    if (type.includes('conference') || type.includes('festival') || type.includes('event')) return 'milestone';
    return 'milestone';
  }

  /**
   * Get display label for project status
   */
  getStatusLabel(status) {
    const statusMap = {
      'Active 🔥': 'Project Active',
      'Active': 'Project Active',
      'In Progress': 'Project In Progress',
      'Completed ✅': 'Project Completed',
      'Completed': 'Project Completed',
      'Landed': 'Project Landed',
      'Launch 🚀': 'Project Launched',
      'Launch': 'Project Launched',
      'Planning': 'Project Planning',
      'On Hold': null, // Don't show on hold projects
      'Archived': null
    };
    return statusMap[status] || null;
  }

  /**
   * Get display label for opportunity stage
   */
  getOpportunityType(stage) {
    const stageMap = {
      'Won ✅': 'Won',
      'Won': 'Won',
      'Submitted': 'Applied',
      'In Progress': 'Partnership In Progress',
      'Exploring': 'Exploring Partnership',
      'Draft': null, // Don't show drafts
      'Lost': null,
      'Declined': null
    };
    return stageMap[stage] || (stage ? 'Opportunity' : null);
  }

  /**
   * Get curated entries (admin-edited)
   */
  async getCuratedEntries(year) {
    const curatedFile = path.join(this.curatedDataPath, `${year}`, 'curated.json');

    try {
      const content = await fs.readFile(curatedFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { entries: [], lastUpdated: null };
      }
      throw error;
    }
  }

  /**
   * Save curated entries
   */
  async saveCuratedEntries(year, data) {
    const curatedDir = path.join(this.curatedDataPath, `${year}`);
    const curatedFile = path.join(curatedDir, 'curated.json');

    // Ensure directory exists
    await fs.mkdir(curatedDir, { recursive: true });

    const payload = {
      ...data,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(curatedFile, JSON.stringify(payload, null, 2));
    console.log(`✅ Curated entries saved for ${year}`);
    return payload;
  }

  /**
   * Upload and process LinkedIn CSV export
   */
  async processLinkedInUpload(year, csvContent, author = 'Unknown') {
    const linkedInDir = path.join(this.curatedDataPath, `${year}`, 'linkedin');
    await fs.mkdir(linkedInDir, { recursive: true });

    const posts = this.parseLinkedInCSV(csvContent);
    const filename = `posts-${author.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    const filePath = path.join(linkedInDir, filename);

    const enrichedPosts = posts.map(p => ({
      ...p,
      author,
      uploadedAt: new Date().toISOString()
    }));

    await fs.writeFile(filePath, JSON.stringify(enrichedPosts, null, 2));
    console.log(`✅ LinkedIn posts uploaded: ${enrichedPosts.length} posts from ${author}`);

    return {
      count: enrichedPosts.length,
      filename,
      author
    };
  }

  // ========== Helper Methods ==========

  parseLinkedInCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const posts = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const post = {};

      headers.forEach((header, idx) => {
        post[header] = values[idx] || '';
      });

      // Normalize common LinkedIn CSV fields
      post.date = post.Date || post.date || post['Post Date'];
      post.content = post.Content || post.content || post['Post Content'] || post.Text;
      post.likes = parseInt(post.Likes || post.likes || 0);
      post.comments = parseInt(post.Comments || post.comments || 0);
      post.shares = parseInt(post.Shares || post.shares || post.Reposts || 0);

      if (post.content) {
        posts.push(post);
      }
    }

    return posts;
  }

  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  }

  parseNotionProject(page) {
    const props = page.properties || {};
    return {
      id: page.id,
      name: this.getNotionText(props.Name || props.name || props.Title),
      area: this.getNotionSelect(props.Area || props.area),
      description: this.getNotionText(props.Description || props.description),
      aiSummary: this.getNotionText(props['AI Summary'] || props.aiSummary),
      status: this.getNotionSelect(props.Status || props.status),
      funding: this.getNotionSelect(props.Funding || props.funding),
      themes: this.getNotionMultiSelect(props.Themes || props.themes),
      place: this.getNotionText(props.Place || props.place),
      state: this.getNotionText(props.State || props.state),
      lastModified: page.last_edited_time,
      createdTime: page.created_time,
      url: page.url
    };
  }

  parseNotionOpportunity(page) {
    const props = page.properties || {};
    return {
      id: page.id,
      name: this.getNotionText(props.Name || props.name),
      type: this.getNotionSelect(props.Type || props.type),
      stage: this.getNotionSelect(props.Stage || props.stage),
      amount: this.getNotionNumber(props.Amount || props.amount),
      description: this.getNotionText(props.Description || props.description),
      organization: this.getNotionText(props.Organization || props.organization),
      applicationDate: this.getNotionDate(props['Application Date'] || props.applicationDate),
      lastModified: page.last_edited_time,
      url: page.url
    };
  }

  parseNotionPerson(page) {
    const props = page.properties || {};
    return {
      id: page.id,
      name: this.getNotionText(props.Name || props.name || props['Full Name']),
      role: this.getNotionText(props.Role || props.role),
      organization: this.getNotionText(props.Organization || props.organization),
      relationshipType: this.getNotionSelect(props['Relationship Type'] || props.relationshipType),
      lastModified: page.last_edited_time,
      url: page.url
    };
  }

  parseNotionPlace(page) {
    const props = page.properties || {};

    // Extract coordinates from rich_text field (e.g., "-27.4698, 153.0251")
    let lat = null;
    let lng = null;
    const coordsText = props.Coordinates?.rich_text?.map(r => r.plain_text).join('').trim() || '';
    if (coordsText) {
      const coordMatch = coordsText.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }
    }

    // Also check Map property if Coordinates not set
    if (!lat && !lng && props.Map?.place) {
      lat = props.Map.place.latitude;
      lng = props.Map.place.longitude;
    }

    return {
      id: page.id,
      name: this.getNotionText(props.Place || props.Name) || this.getNotionText(props['Western Name']),
      traditionalName: this.getNotionText(props.Place),
      westernName: this.getNotionText(props['Western Name']),
      region: this.getNotionSelect(props.State || props.Region),
      firstPeople: this.getNotionText(props['First People']),
      lat,
      lng,
      lastModified: page.last_edited_time,
      url: page.url
    };
  }

  parseGmailMessage(msg) {
    if (!msg) return null;

    const headers = msg.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

    return {
      id: msg.id,
      threadId: msg.threadId,
      date: getHeader('Date'),
      from: getHeader('From'),
      subject: getHeader('Subject'),
      snippet: msg.snippet,
      labels: msg.labelIds || []
    };
  }

  isSignificantEmail(email) {
    if (!email || !email.subject) return false;

    const significantKeywords = [
      'grant', 'funding', 'award', 'partnership', 'launch', 'milestone',
      'completed', 'success', 'announcement', 'collaboration', 'agreement'
    ];

    const lowerSubject = email.subject.toLowerCase();
    return significantKeywords.some(kw => lowerSubject.includes(kw));
  }

  categorizeEmail(email) {
    const subject = (email.subject || '').toLowerCase();

    if (subject.includes('grant') || subject.includes('funding')) return 'funding';
    if (subject.includes('partnership') || subject.includes('collaboration')) return 'partnership';
    if (subject.includes('launch') || subject.includes('announcement')) return 'launch';
    if (subject.includes('milestone') || subject.includes('completed')) return 'milestone';
    return 'communication';
  }

  extractPostTitle(content) {
    if (!content) return 'LinkedIn Post';
    const firstLine = content.split('\n')[0];
    return firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
  }

  extractHashtags(content) {
    if (!content) return [];
    const matches = content.match(/#\w+/g) || [];
    return matches.map(tag => tag.substring(1).toLowerCase());
  }

  isInYear(dateString, year) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getFullYear() === year;
  }

  countThemes(projects) {
    const counts = {};
    for (const project of projects) {
      // First try themes array
      const themes = project.themes || [];
      if (themes.length > 0) {
        for (const theme of themes) {
          if (theme) counts[theme] = (counts[theme] || 0) + 1;
        }
      }
      // Fallback to area field if no themes
      else if (project.area) {
        counts[project.area] = (counts[project.area] || 0) + 1;
      }
      // Also extract themes from status for categorization
      const status = (project.status || '').toLowerCase();
      if (status.includes('ideation')) {
        counts['Planning & Ideation'] = (counts['Planning & Ideation'] || 0) + 1;
      } else if (status.includes('active')) {
        counts['Active Work'] = (counts['Active Work'] || 0) + 1;
      } else if (status.includes('transferred') || status.includes('sunsetting')) {
        counts['Completed/Handed Over'] = (counts['Completed/Handed Over'] || 0) + 1;
      }
    }
    return counts;
  }

  deduplicateByKey(array, keyFn) {
    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Notion property extractors
  getNotionText(prop) {
    if (!prop) return '';
    if (prop.title) return prop.title.map(t => t.plain_text).join('');
    if (prop.rich_text) return prop.rich_text.map(t => t.plain_text).join('');
    return '';
  }

  getNotionSelect(prop) {
    return prop?.select?.name || '';
  }

  getNotionMultiSelect(prop) {
    return (prop?.multi_select || []).map(s => s.name);
  }

  getNotionNumber(prop) {
    return prop?.number || 0;
  }

  getNotionDate(prop) {
    return prop?.date?.start || null;
  }
}

export default YearInReviewService;
