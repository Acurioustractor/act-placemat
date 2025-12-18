import type { FeaturedSeasonProject } from '../types/yearInReview';

// Default featured projects shown on `/2025-review` when no admin overrides exist.
// Admin can override these via `curated.settings.featuredProjects`.
export const DEFAULT_FEATURED_PROJECTS: Record<number, FeaturedSeasonProject> = {
  0: {
    id: 'empathy-ledger',
    slug: 'empathy-ledger-1',
    title: 'Empathy Ledger',
    subtitle: 'Every Story Matters',
    description:
      'Share Your Story, Preserve Your Voice. Empathy Ledger is a consent-first storytelling platform built on Indigenous data sovereignty principles and OCAP protocols. In 2025, we captured 251 interviews with 231 storytellers including 7 respected Elders—preserving 588,143 words of wisdom across 65 hours of conversation. Your stories, your control.',
    accentColor: '#59c3c3',
    layout: 'left',
    heroImage: '/images/year-review/empathy-ledger-hero.svg',
    tags: ['Cultural Storytelling', 'Data Sovereignty', 'OCAP Protocols', 'Consent-First'],
    stats: [
      { value: '231', label: 'Storytellers' },
      { value: '251', label: 'Interviews Recorded' },
      { value: '65hrs', label: 'Of Wisdom' },
      { value: '15', label: 'Partner Organizations' }
    ],
    quote: {
      text: 'Every story matters. When we preserve our voices, we preserve our culture for generations yet to come.',
      author: 'Community Elder',
      role: 'Palm Island Storyteller'
    }
  },
  1: {
    id: 'justicehub',
    slug: 'justicehub-1',
    title: 'JusticeHub',
    subtitle: 'TRUTH • ACTION • JUSTICE',
    description:
      "Australia locks up children. Communities have the cure. We connect them. JusticeHub documents 150+ grassroots programs achieving 78% success rates—compared to 15.5% for detention. Indigenous youth are locked up 24x more frequently, costing $1.1M per youth versus $58K for community programs. We're building the infrastructure to redirect resources where they actually work.",
    accentColor: '#ffa857',
    layout: 'right',
    heroImage: '/images/year-review/justicehub-hero.svg',
    tags: ['Youth Justice', 'First Nations', 'Community Programs', 'Systems Change'],
    stats: [
      { value: '150+', label: 'Programs Documented' },
      { value: '2,400', label: 'Youth Connected' },
      { value: '$45M', label: 'Cost Savings' },
      { value: '78%', label: 'Community Success Rate' }
    ],
    quote: {
      text: 'Communities have always had the solutions. JusticeHub makes them visible, connected, and impossible to ignore.',
      author: 'JusticeHub Platform',
      role: 'Mission Statement'
    }
  },
  2: {
    id: 'goods',
    slug: 'goods-1',
    title: 'Goods.',
    subtitle: 'Quality Furniture for Every Home on Country',
    description:
      'Every Australian deserves access to quality household essentials, regardless of where they live. Goods on Country partners with Aboriginal Elders and Traditional Owners to deliver durable beds, indestructible washing machines, and essential furniture to remote communities across the NT, WA, and Queensland. 389 assets deployed. Real solutions for real challenges.',
    accentColor: '#f7a399',
    layout: 'left',
    heroImage: '/images/year-review/goods-hero.svg',
    tags: ['Remote Communities', 'Essential Goods', 'Community Partnership', 'Place-Based Design'],
    stats: [
      { value: '389', label: 'Assets Deployed' },
      { value: '363', label: 'Beds Delivered' },
      { value: '8', label: 'Communities Served' },
      { value: '500+', label: 'Minutes of Feedback' }
    ],
    quote: {
      text: "It took just five minutes to put together, and it's properly comfortable... fellas who'd want something like this.",
      author: 'Mark',
      role: 'Community Member'
    }
  },
  3: {
    id: 'contained',
    slug: 'contained-1',
    title: 'CONTAINED',
    subtitle: 'This costs less. Works better. Already exists.',
    description:
      'A 30-minute experiential installation across 3 rooms that examines youth justice realities. CONTAINED juxtaposes detention ($2,355/day, 84% reoffend) against community programs ($75/day, 88% success). On October 22, 2025, we launch CON|X—infrastructure connecting young people with mentors, employers, and services. Evidence-based alternatives to detention. The data is clear.',
    accentColor: '#d8d8f6',
    layout: 'right',
    heroImage: '/images/year-review/contained-hero.svg',
    tags: ['Youth Justice', 'Experiential Installation', 'Policy Change', 'CON|X'],
    stats: [
      { value: '$75', label: 'Community Cost/Day' },
      { value: '88%', label: 'Community Success' },
      { value: '3%', label: 'Reoffend Rate' },
      { value: '€5.64', label: 'Return per €1' }
    ],
    quote: {
      text: "Every surface designed to eliminate variables that might become hope. We're building something different.",
      author: 'CONTAINED',
      role: 'Installation Experience'
    }
  }
};

