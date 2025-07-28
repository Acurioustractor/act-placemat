import { supabase } from '../lib/supabase'

// Enhanced Story interface that supports both regular stories and blog posts
export interface Story {
  id: string
  title: string
  slug?: string
  excerpt?: string
  content: string
  content_blocks?: ContentBlock[]
  featured_image_url?: string
  story_type: 'story' | 'blog' | 'case-study' | 'update'
  blog_category?: string
  tags: string[]
  featured?: boolean
  author_name?: string
  author_role?: string
  community_contributors?: string[]
  acknowledgements?: string
  view_count?: number
  reading_time_minutes?: number
  created_at: string
  updated_at: string
  user_id: string
  // Additional fields from function
  media_count?: number
  response_count?: number
}

export interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'quote' | 'community-voice' | 'divider'
  content: any
  order: number
}

export interface MediaAsset {
  id: string
  story_id: string
  file_name: string
  file_url: string
  file_type: 'image' | 'video' | 'audio' | 'document'
  alt_text?: string
  caption?: string
  credit?: string
  cultural_protocols?: string
  content_block_id?: string
  order_index: number
  processing_status: 'uploading' | 'processing' | 'ready' | 'error'
  thumbnail_url?: string
}

export interface StoryResponse {
  id: string
  story_id: string
  responder_name: string
  responder_email?: string
  responder_organisation?: string
  responder_location?: string
  response_text: string
  response_type: 'comment' | 'reflection' | 'connection' | 'question' | 'story-response'
  status: 'pending' | 'approved' | 'rejected' | 'featured'
  created_at: string
}

export const unifiedStoryService = {
  /**
   * Get stories with optional filtering for blogs, regular stories, etc.
   */
  async getStories(options: {
    limit?: number
    offset?: number
    story_type?: 'story' | 'blog' | 'case-study' | 'update'
    category?: string
    featured_only?: boolean
    search_term?: string
  } = {}): Promise<Story[]> {
    try {
      const { data, error } = await supabase.rpc('get_stories_with_filters', {
        limit_count: options.limit || 10,
        offset_count: options.offset || 0,
        story_type_filter: options.story_type || null,
        category_filter: options.category || null,
        featured_only: options.featured_only || false,
        search_term: options.search_term || null
      })

      if (error) {
        console.error('Error fetching stories:', error)
        return this.getFallbackStories(options)
      }

      return data as Story[]
    } catch (error) {
      console.error('Error in getStories:', error)
      return this.getFallbackStories(options)
    }
  },

  /**
   * Get a single story by ID or slug
   */
  async getStory(identifier: string, bySlug = false): Promise<Story | null> {
    try {
      let query = supabase
        .from('stories')
        .select('*')

      if (bySlug) {
        query = query.eq('slug', identifier)
      } else {
        query = query.eq('id', identifier)
      }

      const { data, error } = await query.single()

      if (error) {
        console.error('Error fetching story:', error)
        return this.getFallbackStories().find(story => 
          bySlug ? story.slug === identifier : story.id === identifier
        ) || null
      }

      return data as Story
    } catch (error) {
      console.error('Error in getStory:', error)
      return null
    }
  },

  /**
   * Create a new story/blog post
   */
  async createStory(story: Partial<Story>): Promise<Story | null> {
    try {
      // Generate slug if not provided
      if (!story.slug && story.title) {
        story.slug = this.generateSlug(story.title)
      }

      // Estimate reading time
      if (!story.reading_time_minutes && story.content) {
        story.reading_time_minutes = this.estimateReadingTime(story.content)
      }

      const { data, error } = await supabase
        .from('stories')
        .insert([{
          ...story,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating story:', error)
        throw error
      }

      return data as Story
    } catch (error) {
      console.error('Error in createStory:', error)
      throw error
    }
  },

  /**
   * Update an existing story
   */
  async updateStory(id: string, updates: Partial<Story>): Promise<Story | null> {
    try {
      // Update reading time if content changed
      if (updates.content && !updates.reading_time_minutes) {
        updates.reading_time_minutes = this.estimateReadingTime(updates.content)
      }

      const { data, error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating story:', error)
        throw error
      }

      return data as Story
    } catch (error) {
      console.error('Error in updateStory:', error)
      throw error
    }
  },

  /**
   * Delete a story
   */
  async deleteStory(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting story:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteStory:', error)
      return false
    }
  },

  /**
   * Upload media for a story
   */
  async uploadMedia(storyId: string, file: File, metadata: {
    alt_text?: string
    caption?: string
    credit?: string
    cultural_protocols?: string
    content_block_id?: string
  } = {}): Promise<MediaAsset | null> {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${storyId}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('story-media')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story-media')
        .getPublicUrl(fileName)

      // Save media record
      const { data, error } = await supabase
        .from('story_media_assets')
        .insert([{
          story_id: storyId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 
                     file.type.startsWith('audio/') ? 'audio' : 'document',
          file_size_bytes: file.size,
          mime_type: file.type,
          ...metadata,
          processing_status: 'ready'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error saving media record:', error)
        throw error
      }

      return data as MediaAsset
    } catch (error) {
      console.error('Error in uploadMedia:', error)
      throw error
    }
  },

  /**
   * Get media assets for a story
   */
  async getStoryMedia(storyId: string): Promise<MediaAsset[]> {
    try {
      const { data, error } = await supabase
        .from('story_media_assets')
        .select('*')
        .eq('story_id', storyId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching story media:', error)
        return []
      }

      return data as MediaAsset[]
    } catch (error) {
      console.error('Error in getStoryMedia:', error)
      return []
    }
  },

  /**
   * Add a response to a story
   */
  async addResponse(storyId: string, response: {
    responder_name: string
    responder_email?: string
    responder_organisation?: string
    responder_location?: string
    response_text: string
    response_type?: 'comment' | 'reflection' | 'connection' | 'question' | 'story-response'
  }): Promise<StoryResponse | null> {
    try {
      const { data, error } = await supabase
        .from('story_responses')
        .insert([{
          story_id: storyId,
          ...response,
          response_type: response.response_type || 'comment',
          status: 'pending'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error adding response:', error)
        throw error
      }

      return data as StoryResponse
    } catch (error) {
      console.error('Error in addResponse:', error)
      throw error
    }
  },

  /**
   * Get responses for a story
   */
  async getStoryResponses(storyId: string): Promise<StoryResponse[]> {
    try {
      const { data, error } = await supabase
        .from('story_responses')
        .select('*')
        .eq('story_id', storyId)
        .in('status', ['approved', 'featured'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching story responses:', error)
        return []
      }

      return data as StoryResponse[]
    } catch (error) {
      console.error('Error in getStoryResponses:', error)
      return []
    }
  },

  /**
   * Increment view count
   */
  async incrementViewCount(storyId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_story_view_count', { 
        story_id: storyId 
      })
      
      if (error) {
        console.error('Error incrementing view count:', error)
      }
    } catch (error) {
      console.error('Error in incrementViewCount:', error)
    }
  },

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  },

  /**
   * Estimate reading time based on content
   */
  estimateReadingTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  },

  /**
   * Get blog categories with counts
   */
  async getBlogCategories(): Promise<Array<{ category: string; count: number; label: string }>> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('blog_category')
        .in('story_type', ['blog', 'case-study', 'update'])
        .not('blog_category', 'is', null)

      if (error) {
        console.error('Error fetching categories:', error)
        return this.getDefaultCategories()
      }

      // Count posts by category
      const categoryCounts = data.reduce((acc: Record<string, number>, story) => {
        if (story.blog_category) {
          acc[story.blog_category] = (acc[story.blog_category] || 0) + 1
        }
        return acc
      }, {})

      return Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count: count as number,
        label: this.getCategoryLabel(category)
      }))
    } catch (error) {
      console.error('Error in getBlogCategories:', error)
      return this.getDefaultCategories()
    }
  },

  /**
   * Get category label from category key
   */
  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'empathy-ledger': 'The Empathy Ledger',
      'community-voices': 'Community Voices',
      'case-studies': 'Case Studies',
      'platform-updates': 'Platform Updates',
      'reflections': 'Reflections'
    }
    return labels[category] || category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
  },

  /**
   * Get default categories for fallback
   */
  getDefaultCategories(): Array<{ category: string; count: number; label: string }> {
    return [
      { category: 'empathy-ledger', count: 3, label: 'The Empathy Ledger' },
      { category: 'community-voices', count: 2, label: 'Community Voices' },
      { category: 'case-studies', count: 1, label: 'Case Studies' }
    ]
  },

  /**
   * Fallback data for development/offline mode
   */
  getFallbackStories(options: any = {}): Story[] {
    const allStories: Story[] = [
      {
        id: '1',
        title: 'The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change',
        slug: 'revolution-community-led-act-powering-change',
        excerpt: 'We\'ve discovered something profound in our work with grassroots communities and organisations: the ability to help them transform their knowledge, stories, and programs into living ecosystems.',
        content: `# The Revolution is Community-Led

*An Empathy Ledger Story by A Curious Tractor*

We've discovered something profound in our work with grassroots communities and organisations: the ability to help them think about their inputs—knowledge, stories, and programs—and transform them into living ecosystems where everyone engaged becomes an active participant in growth.

## The Architecture of Empathy

Through careful listening and authentic relationship-building, we've developed patterns that honour people's stories by giving them database entries that they truly own. This isn't just data collection—it's recognition that **their story belongs to them**, they have complete agency over it, yet it syncs to a greater whole that amplifies their voice and impact.

## Meta-Circularity in Action

Here's what makes this truly revolutionary: **we can replicate this entire system for our partners**. Each community organisation can have their own website dashboard that they update, supported by our content expertise and ongoing relationship.

**This is about aligning communities with tools that support them** to have the resources and practices needed to compete with systems and large organisations that have worked out the logic of growth and maintaining power over resources and relationships.

## The Future We're Building

**The revolution is community-led.** Our role is to provide the tools, technology, and authentic relationships that amplify what communities are already doing brilliantly.

Through the Empathy Ledger, we're not just changing how stories are told—we're **changing who gets to tell them, who benefits from them, and how they create lasting transformation**.

*🚜 A Curious Tractor: Engineering the Community-Led Future*`,
        featured_image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=400&fit=crop',
        story_type: 'blog',
        blog_category: 'empathy-ledger',
        tags: ['community-led', 'empathy-ledger', 'grassroots', 'transformation'],
        featured: true,
        author_name: 'A Curious Tractor',
        author_role: 'Empathy Ledger Team',
        view_count: 234,
        reading_time_minutes: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: '1'
      },
      {
        id: '2',
        title: 'Building Technology That Embodies Values: The Meta-Circularity of Empathy Ledger',
        slug: 'technology-embodies-values-meta-circularity',
        excerpt: 'How do you prove that empathy-driven technology works? You build it, use it yourself, and transform your own organisation first.',
        content: `# Building Technology That Embodies Values

The ultimate proof of concept: A Curious Tractor using their own Empathy Ledger platform to transform their operations, then sharing that transformation with others.

## The Meta-Circularity Principle

We don't just build empathy-driven technology—we **are** empathy-driven technology in action. Every feature we create, we test on ourselves first. Every value we encode, we live first.

This isn't just good product development; it's revolutionary organisational practice.`,
        featured_image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
        story_type: 'blog',
        blog_category: 'empathy-ledger',
        tags: ['technology', 'values', 'meta-circularity', 'innovation'],
        featured: true,
        author_name: 'A Curious Tractor',
        author_role: 'Platform Architects',
        view_count: 456,
        reading_time_minutes: 12,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        user_id: '1'
      },
      {
        id: '3',
        title: 'Brodie\'s Journey: Camping on Country Transforms Young Lives',
        slug: 'brodie-journey-camping-country-transforms-lives',
        excerpt: 'How one young person\'s experience became a pathway for hundreds of others to connect with culture and community in Mount Isa.',
        content: `# Brodie's Journey: Camping on Country Transforms Young Lives

Brodie Germaine had a vision to support more young people in his community. A path he had taken in his younger years connects him closer to this experience and has provided the perfect roadmap.

## From Personal Experience to Community Program

Supported by philanthropy and government, Brodie now runs his **Camping on Country program**, supporting hundreds of young people with transformative experiences that connect them to culture, land, and community.

## The Empathy Ledger Connection

Through the Empathy Ledger platform, Brodie:
- Tells real stories from Elders and young people
- Built his website on Empathy Ledger technology  
- Develops his impact and community connection framework through our platform

**This is community-led change amplified by technology that embodies care.**`,
        story_type: 'story',
        blog_category: 'community-voices',
        tags: ['youth', 'culture', 'mount-isa', 'camping-on-country'],
        featured: false,
        author_name: 'Community Contributors',
        author_role: 'Empathy Ledger Network',
        view_count: 189,
        reading_time_minutes: 6,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        user_id: '2'
      }
    ]

    // Apply filters
    let filtered = allStories

    if (options.story_type) {
      filtered = filtered.filter(story => story.story_type === options.story_type)
    }

    if (options.category) {
      filtered = filtered.filter(story => story.blog_category === options.category)
    }

    if (options.featured_only) {
      filtered = filtered.filter(story => story.featured)
    }

    if (options.search_term) {
      const term = options.search_term.toLowerCase()
      filtered = filtered.filter(story => 
        story.title.toLowerCase().includes(term) ||
        story.content.toLowerCase().includes(term) ||
        (story.excerpt && story.excerpt.toLowerCase().includes(term))
      )
    }

    return filtered.slice(options.offset || 0, (options.offset || 0) + (options.limit || 10))
  }
}

export default unifiedStoryService