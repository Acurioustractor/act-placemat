import { supabase, BlogPost } from '../lib/supabase'

export const blogService = {
  /**
   * Get published blog posts with optional filtering
   */
  async getPosts(limit = 10, category?: string, featured_only = false): Promise<BlogPost[]> {
    try {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit)

      if (category && category !== 'all') {
        query = query.eq('blog_category', category)
      }

      if (featured_only) {
        query = query.eq('featured', true)
      }

      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching blog posts:', error)
        return this.getFallbackPosts().slice(0, limit)
      }
      
      return data as BlogPost[]
    } catch (error) {
      console.error('Error in getPosts:', error)
      return this.getFallbackPosts().slice(0, limit)
    }
  },

  /**
   * Get a single blog post by slug
   */
  async getPost(slug: string): Promise<BlogPost | null> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (error) {
        console.error('Error fetching blog post:', error)
        return this.getFallbackPosts().find(post => post.slug === slug) || null
      }
      
      return data as BlogPost
    } catch (error) {
      console.error('Error in getPost:', error)
      return null
    }
  },

  /**
   * Increment view count for a blog post
   */
  async incrementViewCount(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_view_count', { post_id: id })
      if (error) {
        console.error('Error incrementing view count:', error)
      }
    } catch (error) {
      console.error('Error in incrementViewCount:', error)
    }
  },

  /**
   * Search blog posts
   */
  async searchPosts(searchTerm: string, limit = 10): Promise<BlogPost[]> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .or(`title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('published_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error searching blog posts:', error)
        return this.getFallbackPosts().filter(post => 
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, limit)
      }
      
      return data as BlogPost[]
    } catch (error) {
      console.error('Error in searchPosts:', error)
      return []
    }
  },

  /**
   * Get blog categories with post counts
   */
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('blog_category')
        .eq('status', 'published')

      if (error) {
        console.error('Error fetching categories:', error)
        return [
          { category: 'empathy-ledger', count: 3 },
          { category: 'community-voices', count: 2 },
          { category: 'case-studies', count: 1 }
        ]
      }

      // Count posts by category
      const categoryCounts = data.reduce((acc: Record<string, number>, post) => {
        acc[post.blog_category] = (acc[post.blog_category] || 0) + 1
        return acc
      }, {})

      return Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count: count as number
      }))
    } catch (error) {
      console.error('Error in getCategories:', error)
      return []
    }
  },

  /**
   * Fallback data for development/offline mode
   */
  getFallbackPosts(): BlogPost[] {
    return [
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
        blog_category: 'empathy-ledger',
        tags: ['community-led', 'empathy-ledger', 'grassroots', 'transformation'],
        status: 'published',
        published_at: new Date().toISOString(),
        featured: true,
        author_name: 'A Curious Tractor',
        author_role: 'Empathy Ledger Team',
        view_count: 234,
        reading_time_minutes: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
        blog_category: 'empathy-ledger',
        tags: ['technology', 'values', 'meta-circularity', 'innovation'],
        status: 'published',
        published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
        author_name: 'A Curious Tractor',
        author_role: 'Platform Architects',
        view_count: 456,
        reading_time_minutes: 12,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        title: 'From Stories to Change: How Community Voices Drive Real Impact',
        slug: 'stories-to-change-community-voices-impact',
        excerpt: 'Every story in the Empathy Ledger represents a choice: to centre community wisdom over institutional convenience.',
        content: `# From Stories to Change

Every story matters. Every voice creates change. Every authentic relationship builds the future we need.

## The Power of Community-Centred Storytelling

When communities control their own narratives, magic happens. Technology becomes a tool of empowerment rather than extraction.`,
        blog_category: 'community-voices',
        tags: ['storytelling', 'community', 'impact', 'wisdom'],
        status: 'published',
        published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        featured: false,
        author_name: 'Community Contributors',
        author_role: 'Empathy Ledger Network',
        view_count: 189,
        reading_time_minutes: 6,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
}

export default blogService