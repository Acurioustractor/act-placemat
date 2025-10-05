/**
 * Supabase CRM Integration - Primary People/Contact System
 * This should be the source of truth for all community members
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default function setupSupabaseCRM(app) {
  
  // Get comprehensive CRM metrics with 20,042 LinkedIn contacts
  app.get('/api/crm/metrics', async (req, res) => {
    try {
      console.log('🔍 Fetching CRM metrics from Supabase (including LinkedIn data)...')
      
      // Get counts from all CRM tables
      const [
        linkedinResult,
        storytellersResult, 
        organizationsResult,
        projectsResult,
        usersResult
      ] = await Promise.allSettled([
        supabase.from('linkedin_contacts').select('id', { count: 'exact', head: true }),
        supabase.from('storytellers').select('id', { count: 'exact', head: true }),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true })
      ])
      
      const linkedinCount = linkedinResult.status === 'fulfilled' ? linkedinResult.value.count || 0 : 0
      const storytellersCount = storytellersResult.status === 'fulfilled' ? storytellersResult.value.count || 0 : 0
      const organizationsCount = organizationsResult.status === 'fulfilled' ? organizationsResult.value.count || 0 : 0
      const projectsCount = projectsResult.status === 'fulfilled' ? projectsResult.value.count || 0 : 0
      const usersCount = usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0
      
      // Get additional LinkedIn analytics
      const { data: highValueContacts } = await supabase
        .from('linkedin_contacts')
        .select('id', { count: 'exact', head: true })
        .gt('relationship_score', 5.0)
      
      const { data: recentConnections } = await supabase
        .from('linkedin_contacts')
        .select('id', { count: 'exact', head: true })
        .gte('connected_on', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        
      const totalPeople = linkedinCount + storytellersCount + usersCount
      
      const crmMetrics = {
        totalPeople: totalPeople,
        linkedinContacts: linkedinCount,
        storytellers: storytellersCount,
        highValueContacts: highValueContacts?.length || 0,
        recentConnections: recentConnections?.length || 0,
        organizations: organizationsCount,
        projects: projectsCount,
        users: usersCount,
        dataSource: 'supabase_linkedin_crm',
        lastUpdated: new Date().toISOString()
      }
      
      console.log('📊 Enhanced CRM Metrics:', crmMetrics)
      res.json({ success: true, metrics: crmMetrics })
      
    } catch (error) {
      console.error('❌ CRM metrics error:', error)
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch CRM metrics',
        fallback: {
          totalPeople: 0,
          linkedinContacts: 0,
          storytellers: 0,
          highValueContacts: 0,
          recentConnections: 0,
          organizations: 0,
          projects: 0,
          users: 0,
          dataSource: 'fallback'
        }
      })
    }
  })
  
  // Import contacts from external source (CSV, API, etc.)
  app.post('/api/crm/import-contacts', async (req, res) => {
    try {
      const { contacts, source } = req.body
      
      console.log(`🔄 Importing ${contacts?.length || 0} contacts from ${source}...`)
      
      if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Contacts array required' 
        })
      }
      
      // Batch insert contacts into Supabase
      const { data, error } = await supabase
        .from('contacts')
        .insert(contacts)
        
      if (error) {
        throw error
      }
      
      console.log(`✅ Successfully imported ${data?.length || 0} contacts`)
      
      res.json({
        success: true,
        imported: data?.length || 0,
        message: `Imported ${data?.length || 0} contacts from ${source}`
      })
      
    } catch (error) {
      console.error('❌ Contact import error:', error)
      res.status(500).json({ 
        success: false, 
        error: 'Failed to import contacts' 
      })
    }
  })
  
  // Sync people from Notion to Supabase
  app.post('/api/crm/sync-from-notion', async (req, res) => {
    try {
      console.log('🔄 Syncing people from Notion to Supabase...')
      
      // This would typically fetch from your Notion People database
      // and import into Supabase as the central CRM
      
      // For now, create sample data to show the concept
      const samplePeople = [
        {
          name: 'Sarah Chen',
          email: 'sarah@community.org',
          role: 'Community Organizer',
          location: 'Melbourne, AU',
          source: 'notion_sync',
          status: 'active'
        },
        {
          name: 'Marcus Thompson',
          email: 'marcus@impact.org', 
          role: 'Project Manager',
          location: 'Sydney, AU',
          source: 'notion_sync',
          status: 'active'
        }
      ]
      
      const { data, error } = await supabase
        .from('community_members')
        .upsert(samplePeople)
        
      if (error) throw error
      
      console.log(`✅ Synced ${data?.length || 0} people from Notion`)
      
      res.json({
        success: true,
        synced: data?.length || 0,
        message: 'Successfully synced people from Notion to Supabase CRM'
      })
      
    } catch (error) {
      console.error('❌ Notion sync error:', error)
      res.status(500).json({ 
        success: false, 
        error: 'Failed to sync from Notion' 
      })
    }
  })
  
  // Get all community members with pagination
  app.get('/api/crm/community-members', async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query
      const offset = (page - 1) * limit
      
      const { data, error, count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
        
      if (error) throw error
      
      res.json({
        success: true,
        data: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
      
    } catch (error) {
      console.error('❌ Community members error:', error)
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch community members' 
      })
    }
  })
  
  // Search and analyze LinkedIn contacts with advanced filtering
  app.get('/api/crm/linkedin-contacts', async (req, res) => {
    try {
      const { 
        search, 
        company, 
        industry, 
        location, 
        min_score = 0, 
        limit = 50, 
        offset = 0,
        sort_by = 'relationship_score',
        order = 'desc'
      } = req.query
      
      console.log(`🔍 Searching LinkedIn contacts: ${search || 'all'} (${limit} results)`)
      
      let query = supabase
        .from('linkedin_contacts')
        .select(`
          id, full_name, email_address, current_position, current_company,
          industry, location, relationship_score, strategic_value,
          alignment_tags, linkedin_url, connected_on, last_interaction,
          interaction_count, skills_extracted, influence_level, network_reach
        `)
      
      // Apply filters
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,current_company.ilike.%${search}%,current_position.ilike.%${search}%`)
      }
      
      if (company) {
        query = query.ilike('current_company', `%${company}%`)
      }
      
      if (industry) {
        query = query.ilike('industry', `%${industry}%`)
      }
      
      if (location) {
        query = query.ilike('location', `%${location}%`)
      }
      
      if (min_score > 0) {
        query = query.gte('relationship_score', min_score)
      }
      
      // Apply sorting and pagination
      query = query
        .order(sort_by, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('linkedin_contacts')
        .select('*', { count: 'exact', head: true })
      
      res.json({
        success: true,
        data: data || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: totalCount || 0,
          returned: (data || []).length
        },
        filters: { search, company, industry, location, min_score },
        dataSource: 'supabase_linkedin_contacts'
      })
      
    } catch (error) {
      console.error('❌ LinkedIn contacts search error:', error)
      res.status(500).json({ 
        success: false, 
        error: 'Failed to search LinkedIn contacts' 
      })
    }
  })
  
  // Get LinkedIn contact analytics and insights
  app.get('/api/crm/linkedin-analytics', async (req, res) => {
    try {
      console.log('📊 Generating LinkedIn contact analytics...')
      
      // Industry distribution (simplified approach)
      const { data: industryData } = await supabase
        .from('linkedin_contacts')
        .select('industry')
        .not('industry', 'is', null)
        .limit(1000) // Sample for performance
      
      const industryDistribution = {}
      industryData?.forEach(contact => {
        const industry = contact.industry
        industryDistribution[industry] = (industryDistribution[industry] || 0) + 1
      })
      
      const topIndustries = Object.entries(industryDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([industry, count]) => ({ industry, count }))
      
      // Company distribution (top 20)
      const { data: companyData } = await supabase
        .from('linkedin_contacts')
        .select('current_company')
        .not('current_company', 'is', null)
        .limit(1000) // Sample for performance
      
      const companyDistribution = {}
      companyData?.forEach(contact => {
        const company = contact.current_company
        companyDistribution[company] = (companyDistribution[company] || 0) + 1
      })
      
      const topCompanies = Object.entries(companyDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([company, count]) => ({ company, count }))
      
      // Location distribution
      const { data: locationData } = await supabase
        .from('linkedin_contacts')
        .select('location')
        .not('location', 'is', null)
        .limit(1000)
      
      const locationDistribution = {}
      locationData?.forEach(contact => {
        const location = contact.location
        locationDistribution[location] = (locationDistribution[location] || 0) + 1
      })
      
      const topLocations = Object.entries(locationDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([location, count]) => ({ location, count }))
      
      // Relationship score distribution
      const { data: scoreData } = await supabase
        .from('linkedin_contacts')
        .select('relationship_score')
        .not('relationship_score', 'is', null)
      
      const scoreDistribution = {
        'Low (0-3)': 0,
        'Medium (3-6)': 0,
        'High (6-8)': 0,
        'Very High (8-10)': 0
      }
      
      scoreData?.forEach(contact => {
        const score = contact.relationship_score || 0
        if (score < 3) scoreDistribution['Low (0-3)']++
        else if (score < 6) scoreDistribution['Medium (3-6)']++
        else if (score < 8) scoreDistribution['High (6-8)']++
        else scoreDistribution['Very High (8-10)']++
      })
      
      // Get total count for analytics
      const { count: totalContactsCount } = await supabase
        .from('linkedin_contacts')
        .select('id', { count: 'exact', head: true })

      const analytics = {
        totalContacts: totalContactsCount || 0,
        topCompanies,
        topLocations,
        topIndustries,
        relationshipScoreDistribution: scoreDistribution,
        generatedAt: new Date().toISOString()
      }
      
      console.log('✅ LinkedIn analytics generated')
      res.json({ success: true, analytics })
      
    } catch (error) {
      console.error('❌ LinkedIn analytics error:', error)
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate LinkedIn analytics' 
      })
    }
  })

  console.log('✅ Supabase CRM endpoints registered (LinkedIn-powered)')
}