/**
 * NOTION SERVICE FIX - Forces real data, kills fallback permanently
 */

import { Client } from '@notionhq/client';

class NotionServiceFixed {
  constructor() {
    console.log('🔧 INITIALIZING FIXED NOTION SERVICE - NO MORE FALLBACK BULLSHIT');

    // Force initialize with the token we KNOW exists
    const token = process.env.NOTION_TOKEN || process.env.NOTION_OAUTH_TOKEN;

    if (!token) {
      throw new Error('NOTION TOKEN NOT FOUND - FIX YOUR ENV FILE');
    }

    // Create the REAL client with proper initialization
    this.client = new Client({
      auth: token,
      notionVersion: '2022-06-28', // Use stable version
      timeoutMs: 60000,
      logLevel: 'debug'
    });

    // Database IDs from environment
    this.databases = {
      projects: process.env.NOTION_PROJECTS_DATABASE_ID,
      partners: process.env.NOTION_PARTNERS_DATABASE_ID,
      opportunities: process.env.NOTION_OPPORTUNITIES_DATABASE_ID,
      organizations: process.env.NOTION_ORGANIZATIONS_DATABASE_ID,
      activities: process.env.NOTION_ACTIVITIES_DATABASE_ID
    };

    console.log('✅ NOTION CLIENT INITIALIZED WITH DATABASES:', Object.keys(this.databases));
  }

  async testConnection() {
    try {
      const response = await this.client.users.me();
      console.log('✅ NOTION CONNECTION VERIFIED:', response);
      return true;
    } catch (error) {
      console.error('❌ NOTION CONNECTION FAILED:', error);
      return false;
    }
  }

  async getProjects(options = {}) {
    const databaseId = this.databases.projects;

    if (!databaseId) {
      console.error('❌ NO PROJECTS DATABASE ID - RETURNING EMPTY');
      return [];
    }

    try {
      console.log('🔍 QUERYING REAL NOTION DATABASE:', databaseId);

      const response = await this.client.databases.query({
        database_id: databaseId,
        page_size: options.limit || 100,
        sorts: [
          {
            property: 'Last edited time',
            direction: 'descending'
          }
        ]
      });

      console.log(`✅ GOT ${response.results.length} REAL PROJECTS FROM NOTION`);

      // Transform Notion data to our format
      const projects = response.results.map(page => ({
        id: page.id,
        name: page.properties.Name?.title?.[0]?.text?.content || 'Untitled',
        status: page.properties.Status?.select?.name || 'Unknown',
        description: page.properties.Description?.rich_text?.[0]?.text?.content || '',
        area: page.properties.Area?.select?.name || '',
        budget: page.properties.Budget?.number || 0,
        lead: page.properties.Lead?.rich_text?.[0]?.text?.content || '',
        lastModified: page.last_edited_time,
        url: page.url
      }));

      return projects;
    } catch (error) {
      console.error('❌ NOTION QUERY FAILED:', error);
      throw error; // Don't hide errors anymore!
    }
  }

  async getOpportunities(options = {}) {
    const databaseId = this.databases.opportunities;

    if (!databaseId) {
      console.error('❌ NO OPPORTUNITIES DATABASE ID');
      return [];
    }

    try {
      const response = await this.client.databases.query({
        database_id: databaseId,
        page_size: options.limit || 100
      });

      console.log(`✅ GOT ${response.results.length} REAL OPPORTUNITIES`);
      return response.results;
    } catch (error) {
      console.error('❌ OPPORTUNITIES QUERY FAILED:', error);
      throw error;
    }
  }

  async getOrganizations(options = {}) {
    const databaseId = this.databases.organizations;

    if (!databaseId) {
      console.error('❌ NO ORGANIZATIONS DATABASE ID');
      return [];
    }

    try {
      const response = await this.client.databases.query({
        database_id: databaseId,
        page_size: options.limit || 100
      });

      console.log(`✅ GOT ${response.results.length} REAL ORGANIZATIONS`);
      return response.results;
    } catch (error) {
      console.error('❌ ORGANIZATIONS QUERY FAILED:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notionServiceFixed = new NotionServiceFixed();
export default notionServiceFixed;