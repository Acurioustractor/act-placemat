/**
 * Mock Factories for ACT Placemat Testing
 * 
 * Provides factory functions to create mock data for testing
 * with realistic Australian data and relationships
 */

import { generateAustralianUser, generateAustralianBusiness, generateABN } from './australian-data';

export interface MockProject {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  organizationId?: string;
  tags: string[];
  location?: {
    state: string;
    suburb: string;
    postcode: string;
  };
}

export interface MockOrganization {
  id: string;
  name: string;
  description: string;
  type: 'nonprofit' | 'business' | 'government' | 'community';
  abn?: string;
  website?: string;
  email: string;
  phone: string;
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOpportunity {
  id: string;
  title: string;
  description: string;
  type: 'grant' | 'partnership' | 'volunteer' | 'funding' | 'collaboration';
  status: 'open' | 'closing_soon' | 'closed' | 'awarded';
  amount?: number;
  currency: string;
  deadline?: Date;
  organizationId: string;
  requirements: string[];
  tags: string[];
  location: {
    state: string;
    remote: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MockStory {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'archived';
  authorId: string;
  projectId?: string;
  organizationId?: string;
  tags: string[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metrics: {
    views: number;
    likes: number;
    shares: number;
  };
}

// Project factory
export function createMockProject(overrides: Partial<MockProject> = {}): MockProject {
  const projectTitles = [
    'Community Garden Initiative',
    'Youth Mentorship Program',
    'Digital Literacy Workshop',
    'Environmental Sustainability Project',
    'Indigenous Cultural Exchange',
    'Mental Health Awareness Campaign',
    'Food Security Network',
    'Renewable Energy Cooperative',
    'Arts and Culture Festival',
    'Social Enterprise Incubator',
  ];

  const australianSuburbs = [
    { suburb: 'Bondi', state: 'NSW', postcode: '2026' },
    { suburb: 'Fitzroy', state: 'VIC', postcode: '3065' },
    { suburb: 'Fortitude Valley', state: 'QLD', postcode: '4006' },
    { suburb: 'Fremantle', state: 'WA', postcode: '6160' },
    { suburb: 'Glenelg', state: 'SA', postcode: '5045' },
    { suburb: 'Battery Point', state: 'TAS', postcode: '7004' },
    { suburb: 'Braddon', state: 'ACT', postcode: '2612' },
    { suburb: 'The Gardens', state: 'NT', postcode: '0820' },
  ];

  const location = getRandomElement(australianSuburbs);
  const tags = getRandomSubset(['community', 'education', 'environment', 'health', 'technology', 'arts', 'youth', 'seniors'], 2, 4);

  return {
    id: generateId(),
    title: getRandomElement(projectTitles),
    description: `A community-driven initiative focused on creating positive social impact in ${location.suburb}, ${location.state}.`,
    status: getRandomElement(['draft', 'active', 'completed', 'archived']),
    priority: getRandomElement(['low', 'medium', 'high', 'urgent']),
    createdAt: randomPastDate(365), // Within last year
    updatedAt: randomPastDate(30),  // Within last month
    tags,
    location,
    ...overrides,
  };
}

// Organization factory
export function createMockOrganization(overrides: Partial<MockOrganization> = {}): MockOrganization {
  const user = generateAustralianUser();
  const business = generateAustralianBusiness();

  const orgTypes: Array<'nonprofit' | 'business' | 'government' | 'community'> = [
    'nonprofit', 'business', 'government', 'community'
  ];

  return {
    id: generateId(),
    name: business.name,
    description: `${business.name} is committed to creating positive change in the Australian community.`,
    type: getRandomElement(orgTypes),
    abn: business.abn,
    website: `https://www.${generateId()}.org.au`,
    email: business.email,
    phone: business.phone,
    address: business.address,
    createdAt: randomPastDate(730), // Within last 2 years
    updatedAt: randomPastDate(60),  // Within last 2 months
    ...overrides,
  };
}

// Opportunity factory
export function createMockOpportunity(overrides: Partial<MockOpportunity> = {}): MockOpportunity {
  const opportunityTitles = [
    'Community Development Grant',
    'Innovation Partnership Program',
    'Volunteer Coordinator Position',
    'Sustainable Future Fund',
    'Youth Leadership Initiative',
    'Arts and Culture Collaboration',
    'Research Partnership Opportunity',
    'Social Impact Investment',
    'Technology for Good Grant',
    'Environmental Action Fund',
  ];

  const requirements = [
    'Registered Australian organization',
    'Demonstrated community impact',
    'Financial reporting capability',
    'Project management experience',
    'Community partnerships',
    'Sustainability focus',
  ];

  const tags = getRandomSubset(['funding', 'partnership', 'community', 'innovation', 'sustainability', 'youth', 'technology'], 2, 4);
  const selectedReqs = getRandomSubset(requirements, 2, 4);

  return {
    id: generateId(),
    title: getRandomElement(opportunityTitles),
    description: 'An opportunity to create meaningful impact in Australian communities through collaborative partnerships and innovative solutions.',
    type: getRandomElement(['grant', 'partnership', 'volunteer', 'funding', 'collaboration']),
    status: getRandomElement(['open', 'closing_soon', 'closed', 'awarded']),
    amount: Math.random() > 0.3 ? Math.floor(Math.random() * 500000) + 10000 : undefined,
    currency: 'AUD',
    deadline: Math.random() > 0.2 ? randomFutureDate(90) : undefined,
    organizationId: generateId(),
    requirements: selectedReqs,
    tags,
    location: {
      state: getRandomElement(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
      remote: Math.random() > 0.4,
    },
    createdAt: randomPastDate(180),
    updatedAt: randomPastDate(14),
    ...overrides,
  };
}

// Story factory
export function createMockStory(overrides: Partial<MockStory> = {}): MockStory {
  const storyTitles = [
    'Building Bridges: A Community Success Story',
    'Innovation in Action: How Technology Changed Lives',
    'From Vision to Reality: Our Journey Together',
    'Empowering Change: The Power of Partnership',
    'Growing Together: Community Garden Transforms Neighbourhood',
    'Digital Divide No More: Connecting Rural Communities',
    'Sustainability in Practice: Our Environmental Journey',
    'Youth Voices: The Next Generation of Leaders',
    'Cultural Connections: Celebrating Diversity',
    'Mental Health Matters: Breaking Down Barriers',
  ];

  const title = getRandomElement(storyTitles);
  const content = generateStoryContent(title);
  const tags = getRandomSubset(['impact', 'community', 'innovation', 'partnership', 'success', 'transformation', 'inspiration'], 3, 5);

  return {
    id: generateId(),
    title,
    content,
    excerpt: content.substring(0, 200) + '...',
    status: getRandomElement(['draft', 'published', 'archived']),
    authorId: generateId(),
    projectId: Math.random() > 0.3 ? generateId() : undefined,
    organizationId: Math.random() > 0.4 ? generateId() : undefined,
    tags,
    publishedAt: Math.random() > 0.2 ? randomPastDate(30) : undefined,
    createdAt: randomPastDate(90),
    updatedAt: randomPastDate(7),
    metrics: {
      views: Math.floor(Math.random() * 1000) + 50,
      likes: Math.floor(Math.random() * 100) + 5,
      shares: Math.floor(Math.random() * 50) + 1,
    },
    ...overrides,
  };
}

// User factory (extends Australian user data)
export function createMockUser(overrides = {}) {
  const baseUser = generateAustralianUser();
  
  return {
    ...baseUser,
    profile: {
      bio: 'Passionate about creating positive change in Australian communities.',
      interests: getRandomSubset(['community development', 'sustainability', 'technology', 'education', 'arts', 'health'], 2, 4),
      skills: getRandomSubset(['project management', 'communication', 'leadership', 'grant writing', 'community engagement', 'digital literacy'], 2, 5),
    },
    preferences: {
      emailNotifications: true,
      newsletter: true,
      publicProfile: Math.random() > 0.3,
    },
    ...overrides,
  };
}

// API Response factories
export function createMockApiResponse<T>(data: T, meta = {}) {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...meta,
    },
    success: true,
  };
}

export function createMockApiError(message: string, code = 400, details = {}) {
  return {
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    success: false,
  };
}

export function createMockPaginatedResponse<T>(items: T[], page = 1, limit = 20, total?: number) {
  const actualTotal = total || items.length;
  const totalPages = Math.ceil(actualTotal / limit);
  
  return createMockApiResponse(items, {
    pagination: {
      page,
      limit,
      total: actualTotal,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomSubset<T>(array: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomPastDate(daysAgo: number): Date {
  const now = new Date();
  const pastTime = now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return new Date(pastTime);
}

function randomFutureDate(daysAhead: number): Date {
  const now = new Date();
  const futureTime = now.getTime() + (Math.random() * daysAhead * 24 * 60 * 60 * 1000);
  return new Date(futureTime);
}

function generateStoryContent(title: string): string {
  return `
# ${title}

In the heart of Australia's vibrant communities, remarkable stories unfold every day. This is one such story that demonstrates the power of collaboration, innovation, and unwavering commitment to positive change.

## The Challenge

Every community faces unique challenges, and ours was no different. We identified key areas where intervention could make a meaningful difference in people's lives.

## Our Approach

Through careful planning and community consultation, we developed a comprehensive strategy that addressed the core issues while building on existing strengths within our community.

## The Journey

Implementation wasn't without its challenges, but with dedicated volunteers, supportive partners, and clear objectives, we began to see real progress.

## Results and Impact

The outcomes exceeded our expectations. Not only did we achieve our primary goals, but we also created lasting connections and established a foundation for future initiatives.

## Looking Forward

This success story is just the beginning. We're committed to continuing this work and inspiring other communities across Australia to take similar action.

*Join us in creating positive change. Together, we can build stronger, more resilient communities.*
  `.trim();
}