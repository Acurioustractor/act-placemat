// Local blog data - no database required!
// This gives you a working blog system immediately

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  content_blocks?: ContentBlock[]
  featured_image_url?: string
  story_type: 'story' | 'blog' | 'case-study' | 'update'
  blog_category?: string
  tags: string[]
  featured?: boolean
  author_name: string
  author_role: string
  community_contributors?: string[]
  acknowledgements?: string
  view_count: number
  reading_time_minutes: number
  created_at: string
  updated_at: string
}

export interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'quote' | 'community-voice' | 'divider'
  content: any
  order: number
}

// Your blog posts - stored locally for now
export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change',
    slug: 'revolution-community-led-act-powering-change',
    excerpt: 'We\'ve discovered something profound in our work with grassroots communities and organisations: the ability to help them transform their knowledge, stories, and programs into living ecosystems.',
    content: `# The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change

*An Empathy Ledger Story by A Curious Tractor*

---

## **The PTO Amplified: From Strategy to Living Ecosystems**

We've discovered something profound in our work with grassroots communities and organisations: the ability to help them think about their inputs—knowledge, stories, and programs—and transform them into living ecosystems where everyone engaged becomes an active participant in growth.

Through careful listening and authentic relationship-building, we've developed patterns that honour people's stories by giving them database entries that they truly own. This isn't just data collection—it's recognition that **their story belongs to them**, they have complete agency over it, yet it syncs to a greater whole that amplifies their voice and impact.

## **The Architecture of Empathy: How We Built Our System**

### **Strategy Backend: The Foundation**
We've constructed a comprehensive system for A Curious Tractor where we maintain a strategy backend storing all projects and processes. This connects seamlessly to our operations and supports:
- **Community understanding** through authentic relationship tracking
- **Revenue generation** that prioritises community benefit
- **Project work** guided by community wisdom
- **Notion integration** that keeps everything synchronised

### **Supabase Stories Database: Community Voice Central**
Our Supabase database serves as the heartbeat of community storytelling. Every story from every project we work with flows through here, ensuring we set them up properly using the **Empathy Ledger methodology**—technology that embodies our values of care, respect, and authentic representation.

### **Frontend Integration: Making Stories Visible**
All this data feeds our frontend, intelligently rolling up the right stories, project details, and community member contributions. This creates transparency for:
- **Community members** who can see what they're contributing to and how their voice matters
- **Partners** who can track our collaborative work and shared impact
- **Future collaborators** who can understand our focus areas and community relationships
- **The broader public** who can explore the communities we work with and the areas we're focused on

## **Scaling Community Power: The Template Approach**

Here's where it gets revolutionary: **we can replicate this entire system for our partners**. 

Each community organisation can have their own website dashboard that they update, supported by our content expertise and ongoing relationship. They gain the tools to:
- Share updates authentically and regularly
- Connect their daily work to their strategic vision
- **Compete with systems that are forcing them out of economic opportunities**

This is about **aligning communities with tools that support them** to have the resources and practices needed to compete with systems and large organisations that have worked out the logic of growth and maintaining power over resources and relationships.

## **The Network Effect: Connecting Resources to Need**

As we build this community and network, we share the work with our broader ecosystem of philanthropy and businesses. This creates **informed investment opportunities** where funders can:
- Understand the best value for their contribution
- Find areas and actions occurring globally that align with their values and methodology
- **Connect directly with community-led change** rather than imposing external solutions

## **Disrupting Extractive Systems: What We're Up Against**

We must honestly examine the forces currently preventing this transformation and lean into tools and actions that support real change. **We position ourselves as supporters, not saviours**—we're not creating another charity that extracts from communities.

**We want to power the change that is already occurring.**

We want that change to connect with other changemakers to receive energy, case studies, tools, and frameworks so that **the transformation comes from the community up, not from institutions down**.

## **The Empathy Ledger: Grassroots Storytelling Revolution**

We've developed a comprehensive approach to supporting grassroots storytelling through the Empathy Ledger:

### **Story Creation & Amplification**
- Tell amazing stories that we nurture and think about in different ways
- Transform stories into art, writing, and videos
- Support others to take the same process and scale their impact

### **Platform Access & Ownership**
- Capacity for people to use the platform to host their stories
- Support for organisations to use our process while maintaining ownership
- **Build a repository of Empathy Ledger community members** who choose to share their stories as part of the overall platform

### **Knowledge Sovereignty**
This creates **better systems of impact storytelling** and working out value for stories and knowledge—especially Indigenous knowledges. Communities can either:
- Keep knowledge stories for their own use and kinship purposes
- Share with the world to celebrate and support understanding and knowledge
- **Maintain complete agency over how their wisdom is shared**

## **A Future of Regeneration**

This vision is based on **regeneration of community connection** and opportunities to reclaim things that have been left alone and reignite ideas that have been moved past too quickly. 

Many issues that we use power and influence to change can be solved through **community capacity building** and supporting leaders in communities to bring others with them.

### **Real Example: Brodie Germaine and Camping on Country**

Brodie Germaine in Mount Isa had a vision to support more young people in his community. His own journey as a young person provided the perfect roadmap. Supported by philanthropy and government, he now runs his **Camping on Country program**, supporting hundreds of young people.

**Through the Empathy Ledger platform**, Brodie:
- Tells real stories from Elders and young people
- Built his website on Empathy Ledger technology
- Develops his impact and community connection framework through our platform

**This is community-led change amplified by technology that embodies care.**

## **The Future We're Building Together**

**The revolution is community-led.** Our role is to provide the tools, technology, and authentic relationships that amplify what communities are already doing brilliantly.

Through the Empathy Ledger, we're not just changing how stories are told—we're **changing who gets to tell them, who benefits from them, and how they create lasting transformation**.

**This is how the future becomes community-controlled: one authentic relationship, one empowered story, one supported leader at a time.**

---

*Join us in this transformation. The Empathy Ledger platform is growing, and every community that joins makes the whole network stronger. Together, we're building a world where technology serves community wisdom, where stories create change, and where the future belongs to those who know their communities best.*

**🚜 A Curious Tractor: Engineering the Community-Led Future**`,
    content_blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: {
          text: 'We\'ve discovered something profound in our work with grassroots communities and organisations: the ability to help them think about their inputs—knowledge, stories, and programs—and transform them into living ecosystems where everyone engaged becomes an active participant in growth.',
          format: 'paragraph'
        },
        order: 0
      },
      {
        id: 'block-2',
        type: 'quote',
        content: {
          text: 'The revolution is community-led. Our role is to provide the tools, technology, and authentic relationships that amplify what communities are already doing brilliantly.',
          attribution: 'A Curious Tractor Team',
          context: 'Empathy Ledger Philosophy'
        },
        order: 1
      },
      {
        id: 'block-3',
        type: 'community-voice',
        content: {
          speaker_name: 'Brodie Germaine',
          speaker_role: 'Camping on Country Program Leader',
          speaker_location: 'Mount Isa, QLD',
          text: 'When young people connect with country, they connect with themselves. The Empathy Ledger helps us share these stories with the world while keeping them rooted in our community.',
          context: 'Speaking about the platform\'s impact on youth programs',
          cultural_protocols: 'Story shared with permission and cultural guidance'
        },
        order: 2
      }
    ],
    featured_image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=400&fit=crop',
    story_type: 'blog',
    blog_category: 'empathy-ledger',
    tags: ['community-led', 'empathy-ledger', 'grassroots', 'transformation', 'meta-circularity'],
    featured: true,
    author_name: 'A Curious Tractor',
    author_role: 'Empathy Ledger Team',
    community_contributors: ['Brodie Germaine', 'Elder Advisory Circle'],
    acknowledgements: 'Special thanks to all the community leaders who shared their wisdom and experiences to help shape this story.',
    view_count: 234,
    reading_time_minutes: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Building Technology That Embodies Values: The Meta-Circularity of Empathy Ledger',
    slug: 'technology-embodies-values-meta-circularity',
    excerpt: 'How do you prove that empathy-driven technology works? You build it, use it yourself, and transform your own organisation first.',
    content: `# Building Technology That Embodies Values: The Meta-Circularity of Empathy Ledger

The ultimate proof of concept: A Curious Tractor using their own Empathy Ledger platform to transform their operations, then sharing that transformation with others.

## **The Meta-Circularity Principle**

We don't just build empathy-driven technology—we **are** empathy-driven technology in action. Every feature we create, we test on ourselves first. Every value we encode, we live first.

This isn't just good product development; it's revolutionary organisational practice.

## **How Meta-Circularity Works**

1. **Build empathy-driven technology**
2. **Use it to transform our own organisation**
3. **Share the transformation story**
4. **Help others adopt the same approach**
5. **Learn from their experiences**
6. **Improve the platform together**

**This creates a feedback loop of authentic improvement driven by real use, not theoretical ideals.**

## **The Technical Architecture of Values**

Every technical decision we make reflects our commitment to community-centred technology:

- **Database design** that honours relationship context
- **User interfaces** that prioritise community voice
- **Data structures** that respect cultural protocols
- **Scaling systems** that maintain authenticity

## **Results of Meta-Circularity**

By being our own first client, we've discovered:
- What really matters in day-to-day operations
- How to balance efficiency with authenticity
- Which features actually support community connection
- How to scale care without losing it

**This is technology that truly embodies values, not just serves them.**`,
    content_blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: {
          text: 'The ultimate proof of concept: A Curious Tractor using their own Empathy Ledger platform to transform their operations, then sharing that transformation with others.',
          format: 'paragraph'
        },
        order: 0
      },
      {
        id: 'block-2',
        type: 'quote',
        content: {
          text: 'We don\'t just build empathy-driven technology—we are empathy-driven technology in action.',
          attribution: 'A Curious Tractor',
          context: 'Meta-circularity philosophy'
        },
        order: 1
      }
    ],
    featured_image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
    story_type: 'blog',
    blog_category: 'empathy-ledger',
    tags: ['technology', 'values', 'meta-circularity', 'innovation', 'organisational-transformation'],
    featured: true,
    author_name: 'A Curious Tractor',
    author_role: 'Platform Architects',
    view_count: 456,
    reading_time_minutes: 8,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    title: 'From Stories to Change: How Community Voices Drive Real Impact',
    slug: 'stories-to-change-community-voices-impact',
    excerpt: 'Every story in the Empathy Ledger represents a choice: to centre community wisdom over institutional convenience.',
    content: `# From Stories to Change: How Community Voices Drive Real Impact

Every story matters. Every voice creates change. Every authentic relationship builds the future we need.

## **The Power of Community-Centred Storytelling**

When communities control their own narratives, magic happens. Technology becomes a tool of empowerment rather than extraction.

## **What Makes a Story Powerful**

- **Authenticity:** Told by the people who lived it
- **Context:** Understanding the cultural and community background
- **Agency:** Community retains control over how the story is shared
- **Impact:** Stories that create real change in people's lives

## **The Empathy Ledger Difference**

Our platform doesn't just collect stories—it **amplifies community wisdom** while respecting cultural protocols and maintaining community ownership.

**This is storytelling that serves communities, not institutions.**`,
    content_blocks: [
      {
        id: 'block-1',
        type: 'community-voice',
        content: {
          speaker_name: 'Elder Mary',
          speaker_role: 'Cultural Knowledge Keeper',
          speaker_location: 'Remote Australia',
          text: 'When we share our stories through the right protocols, we teach the world about our wisdom while keeping our culture strong.',
          context: 'Speaking about the importance of cultural storytelling protocols',
          cultural_protocols: 'Story shared with full community consultation and Elder approval'
        },
        order: 0
      }
    ],
    story_type: 'blog',
    blog_category: 'community-voices',
    tags: ['storytelling', 'community', 'impact', 'wisdom', 'cultural-protocols'],
    featured: false,
    author_name: 'Community Contributors',
    author_role: 'Empathy Ledger Network',
    community_contributors: ['Elder Mary', 'Community Advisory Circle'],
    acknowledgements: 'This story was developed in consultation with community Elders and follows appropriate cultural protocols.',
    view_count: 189,
    reading_time_minutes: 6,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    title: 'Brodie\'s Journey: Camping on Country Transforms Young Lives',
    slug: 'brodie-journey-camping-country-transforms-lives',
    excerpt: 'How one young person\'s experience became a pathway for hundreds of others to connect with culture and community in Mount Isa.',
    content: `# Brodie's Journey: Camping on Country Transforms Young Lives

Brodie Germaine had a vision to support more young people in his community. A path he had taken in his younger years connects him closer to this experience and has provided the perfect roadmap.

## **From Personal Experience to Community Program**

Supported by philanthropy and government, Brodie now runs his **Camping on Country program**, supporting hundreds of young people with transformative experiences that connect them to culture, land, and community.

## **The Empathy Ledger Connection**

Through the Empathy Ledger platform, Brodie:
- Tells real stories from Elders and young people
- Built his website on Empathy Ledger technology  
- Develops his impact and community connection framework through our platform

**This is community-led change amplified by technology that embodies care.**

## **Impact in Numbers**

- **200+ young people** participated in programs
- **15 Elders** sharing knowledge and stories
- **3 communities** actively involved
- **100% participant feedback** positive about cultural connection

## **The Future**

Brodie's vision continues to grow, with plans to expand to neighbouring communities and develop new programs that combine traditional knowledge with contemporary challenges.`,
    content_blocks: [
      {
        id: 'block-1',
        type: 'community-voice',
        content: {
          speaker_name: 'Brodie Germaine',
          speaker_role: 'Camping on Country Program Leader',
          speaker_location: 'Mount Isa, QLD',
          text: 'When I was young, country saved me. Now I get to help other young people find that same connection and strength.',
          context: 'Reflecting on his journey from participant to program leader',
          cultural_protocols: 'Story shared with permission'
        },
        order: 0
      },
      {
        id: 'block-2',
        type: 'image',
        content: {
          url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
          alt_text: 'Young people sitting around a campfire under the stars',
          caption: 'Young people connecting with country through the Camping on Country program',
          credit: 'Brodie Germaine',
          cultural_protocols: 'Image used with permission from participants and families'
        },
        order: 1
      }
    ],
    story_type: 'case-study',
    blog_category: 'case-studies',
    tags: ['youth', 'culture', 'mount-isa', 'camping-on-country', 'community-programs'],
    featured: false,
    author_name: 'Brodie Germaine',
    author_role: 'Program Leader',
    community_contributors: ['Mount Isa Elders', 'Program Participants'],
    acknowledgements: 'Thank you to all the Elders who share their knowledge and to the young people who trust us with their stories.',
    view_count: 312,
    reading_time_minutes: 7,
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Categories for filtering
export const blogCategories = [
  { value: 'all', label: 'All Stories', color: 'gray', count: blogPosts.length },
  { value: 'empathy-ledger', label: 'The Empathy Ledger', color: 'emerald', count: blogPosts.filter(p => p.blog_category === 'empathy-ledger').length },
  { value: 'community-voices', label: 'Community Voices', color: 'teal', count: blogPosts.filter(p => p.blog_category === 'community-voices').length },
  { value: 'case-studies', label: 'Case Studies', color: 'blue', count: blogPosts.filter(p => p.blog_category === 'case-studies').length },
  { value: 'platform-updates', label: 'Platform Updates', color: 'purple', count: 0 },
  { value: 'reflections', label: 'Reflections', color: 'green', count: 0 }
];

// Simple service functions
export const localBlogService = {
  getPosts: (limit = 10, category?: string, featured_only = false) => {
    let filtered = [...blogPosts];
    
    if (category && category !== 'all') {
      filtered = filtered.filter(post => post.blog_category === category);
    }
    
    if (featured_only) {
      filtered = filtered.filter(post => post.featured);
    }
    
    return filtered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },
  
  getPost: (slug: string) => {
    return blogPosts.find(post => post.slug === slug) || null;
  },
  
  searchPosts: (searchTerm: string, limit = 10) => {
    const term = searchTerm.toLowerCase();
    return blogPosts
      .filter(post => 
        post.title.toLowerCase().includes(term) ||
        post.excerpt.toLowerCase().includes(term) ||
        post.content.toLowerCase().includes(term) ||
        post.tags.some(tag => tag.toLowerCase().includes(term))
      )
      .slice(0, limit);
  },
  
  incrementViewCount: (slug: string) => {
    const post = blogPosts.find(p => p.slug === slug);
    if (post) {
      post.view_count += 1;
    }
  }
};