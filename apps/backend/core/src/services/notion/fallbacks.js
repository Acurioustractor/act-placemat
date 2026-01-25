/**
 * Notion Fallbacks Module
 * Provides fallback data when Notion API is unavailable
 */

/**
 * Get fallback partners
 * @returns {Array} Fallback partners data
 */
export function getFallbackPartners() {
  return [];
}

/**
 * Get fallback projects
 * @returns {Array} Fallback projects data
 */
export function getFallbackProjects() {
  return [
    {
      id: 'fallback-1',
      name: 'Empathy Ledger Platform',
      description: 'Digital platform for community voice capture and storytelling',
      status: 'Active 🔥',
      area: 'Technology',
      lead: 'Ben Knight',
      funding: 'Funded',
      startDate: '2024-01-15',
      budget: 250000,
      tags: ['Digital Platform', 'Community Voice'],
      themes: ['Technology'],
      relationshipPillars: ['Digital Infrastructure'],
      projectLead: null,
      notionUrl: null,
      coverImage: null,
      notionId: 'fallback-1',
      notionIdShort: 'fallback1',
      notionCreatedAt: null,
      notionLastEditedAt: null,
      updatedAt: new Date().toISOString(),
      featured: true,
    },
    {
      id: 'fallback-2',
      name: 'Justice Hub Network',
      description:
        'Connecting justice stakeholders across Queensland for systemic reform',
      status: 'Active 🔥',
      area: 'Justice Reform',
      lead: 'Community Alliance',
      funding: 'Seeking',
      startDate: '2024-03-01',
      budget: 180000,
      tags: ['Justice', 'Network', 'Reform'],
      themes: ['Justice Reform'],
      relationshipPillars: ['Justice Reform Partnerships'],
      projectLead: null,
      notionUrl: null,
      coverImage: null,
      notionId: 'fallback-2',
      notionIdShort: 'fallback2',
      notionCreatedAt: null,
      notionLastEditedAt: null,
      updatedAt: new Date().toISOString(),
      featured: true,
    },
    {
      id: 'fallback-3',
      name: 'First Nations Youth Advocacy',
      description:
        'Supporting Indigenous youth through culturally responsive advocacy programs',
      status: 'Preparation 📋',
      area: 'Indigenous Rights',
      lead: 'First Nations Alliance',
      funding: 'Funded',
      startDate: '2024-06-01',
      budget: 320000,
      tags: ['Indigenous', 'Youth', 'Advocacy'],
      themes: ['Indigenous Rights'],
      relationshipPillars: ['Indigenous Partnerships'],
      projectLead: null,
      notionUrl: null,
      coverImage: null,
      notionId: 'fallback-3',
      notionIdShort: 'fallback3',
      notionCreatedAt: null,
      notionLastEditedAt: null,
      updatedAt: new Date().toISOString(),
      featured: false,
    },
    {
      id: 'fallback-4',
      name: 'Remote Communities Energy',
      description:
        'Sustainable energy solutions for remote Indigenous communities',
      status: 'Active 🔥',
      area: 'Environment',
      lead: 'Green Tech Solutions',
      funding: 'Funded',
      startDate: '2024-02-15',
      budget: 850000,
      tags: ['Energy', 'Sustainability', 'Remote'],
      themes: ['Environment', 'Economic Development'],
      relationshipPillars: ['Environmental Sustainability'],
      projectLead: null,
      notionUrl: null,
      coverImage: null,
      notionId: 'fallback-4',
      notionIdShort: 'fallback4',
      notionCreatedAt: null,
      notionLastEditedAt: null,
      updatedAt: new Date().toISOString(),
      featured: true,
    },
    {
      id: 'fallback-5',
      name: 'Community Health Initiative',
      description: 'Improving health outcomes through community-based programs',
      status: 'On Hold',
      area: 'Health',
      lead: 'Health Alliance',
      funding: 'Seeking',
      startDate: '2024-09-01',
      budget: 450000,
      tags: ['Health', 'Community', 'Wellness'],
      themes: ['Health'],
      relationshipPillars: ['Health Partnerships'],
      projectLead: null,
      notionUrl: null,
      coverImage: null,
      notionId: 'fallback-5',
      notionIdShort: 'fallback5',
      notionCreatedAt: null,
      notionLastEditedAt: null,
      updatedAt: new Date().toISOString(),
      featured: false,
    },
    {
      id: 'fallback-6',
      name: 'Digital Literacy Program',
      description: 'Teaching digital skills to underserved communities',
      status: 'Completed ✅',
      area: 'Education',
      lead: 'Tech Education Partners',
      funding: 'Funded',
      startDate: '2023-06-01',
      budget: 120000,
      tags: ['Education', 'Digital', 'Skills'],
      themes: ['Education'],
      relationshipPillars: ['Education Partnerships'],
      projectLead: null,
      notionUrl: null,
      coverImage: null,
      notionId: 'fallback-6',
      notionIdShort: 'fallback6',
      notionCreatedAt: null,
      notionLastEditedAt: null,
      updatedAt: new Date().toISOString(),
      featured: false,
    },
  ];
}

/**
 * Get fallback opportunities
 * @returns {Array} Fallback opportunities data
 */
export function getFallbackOpportunities() {
  return [
    {
      id: 'fallback-opp-1',
      name: 'Government Grant - Community Development',
      status: 'Active',
      opportunityType: 'Grant',
      description: 'Federal grant for community-led development initiatives',
      value: 500000,
      probability: 60,
      dueDate: '2025-06-30',
      contactPerson: 'John Smith',
      organizationId: [],
      relatedProjects: [],
      notes: 'Focus on Indigenous communities',
    },
    {
      id: 'fallback-opp-2',
      name: 'Corporate Partnership - Tech Company',
      status: 'In Negotiation',
      opportunityType: 'Partnership',
      description: 'Partnership with major tech company for digital inclusion',
      value: 200000,
      probability: 80,
      dueDate: '2025-03-31',
      contactPerson: 'Jane Doe',
      organizationId: [],
      relatedProjects: [],
      notes: 'Awaiting legal review',
    },
    {
      id: 'fallback-opp-3',
      name: 'Impact Investment - Social Fund',
      status: 'Active',
      opportunityType: 'Investment',
      description: 'Impact investment for scaling successful programs',
      value: 1000000,
      probability: 40,
      dueDate: '2025-09-30',
      contactPerson: 'Robert Chen',
      organizationId: [],
      relatedProjects: [],
      notes: 'Long-term partnership opportunity',
    },
  ];
}

/**
 * Get fallback organizations
 * @returns {Array} Fallback organizations data
 */
export function getFallbackOrganizations() {
  return [
    {
      id: 'fallback-org-1',
      name: 'ACT Community Alliance',
      type: 'Community',
      location: 'Canberra, ACT',
      website: 'https://actca.org.au',
      description: 'Peak body for community organizations in the ACT',
      status: 'Active',
      contactEmail: 'info@actca.org.au',
      phoneNumber: '',
      relatedProjects: [],
      relatedPeople: [],
      indigenousOwnership: false,
      communityOwned: true,
    },
    {
      id: 'fallback-org-2',
      name: 'Indigenous Business Australia',
      type: 'Government',
      location: 'Sydney, NSW',
      website: 'https://iba.gov.au',
      description: 'Supporting Indigenous Australians to start and grow businesses',
      status: 'Active',
      contactEmail: '',
      phoneNumber: '',
      relatedProjects: [],
      relatedPeople: [],
      indigenousOwnership: true,
      communityOwned: false,
    },
    {
      id: 'fallback-org-3',
      name: 'Tech for Social Good',
      type: 'NGO',
      location: 'Melbourne, Vic',
      website: 'https://techforsocialgood.org',
      description: 'Using technology to address social challenges',
      status: 'Active',
      contactEmail: '',
      phoneNumber: '',
      relatedProjects: [],
      relatedPeople: [],
      indigenousOwnership: false,
      communityOwned: false,
    },
  ];
}

/**
 * Get fallback activities
 * @returns {Array} Fallback activities data
 */
export function getFallbackActivities() {
  return [];
}

/**
 * Get fallback people
 * @returns {Array} Fallback people data
 */
export function getFallbackPeople() {
  return [];
}

/**
 * Get fallback artifacts
 * @returns {Array} Fallback artifacts data
 */
export function getFallbackArtifacts() {
  return [];
}

/**
 * Get fallback actions
 * @returns {Array} Fallback actions data
 */
export function getFallbackActions() {
  return [];
}

/**
 * Get fallback places
 * @returns {Array} Fallback places data
 */
export function getFallbackPlaces() {
  return [
    {
      id: 'fallback-place-1',
      name: 'Larrakia Country',
      place: 'Larrakia Country',
      westernName: 'Darwin',
      state: 'NT',
      map: '-12.4628, 130.8418',
      protocols: 'Acknowledge Larrakia people, respect coastal country',
      relatedOrganisations: [],
      relatedPeople: [],
      relatedProjects: [],
      // For frontend compatibility
      indigenousName: 'Larrakia Country',
      displayName: 'Larrakia Country',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-place-2',
      name: 'Kaurna Country',
      place: 'Kaurna Country',
      westernName: 'Adelaide',
      state: 'SA',
      map: '-34.9285, 138.6007',
      protocols: 'Acknowledge Kaurna people, respect the river',
      relatedOrganisations: [],
      relatedPeople: [],
      relatedProjects: [],
      // For frontend compatibility
      indigenousName: 'Kaurna Country',
      displayName: 'Kaurna Country',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-place-3',
      name: 'Wurundjeri Country',
      place: 'Wurundjeri Country',
      westernName: 'Melbourne',
      state: 'Vic',
      map: '-37.8136, 144.9631',
      protocols: 'Acknowledge Wurundjeri people, respect the Birrarung (Yarra River)',
      relatedOrganisations: [],
      relatedPeople: [],
      relatedProjects: [],
      // For frontend compatibility
      indigenousName: 'Wurundjeri Country',
      displayName: 'Wurundjeri Country',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-place-4',
      name: 'Remote Communities',
      place: 'Remote Communities',
      westernName: 'Various Remote Locations',
      state: 'NT',
      map: 'Various locations across Australia',
      protocols: 'Respect traditional owners, follow community protocols',
      relatedOrganisations: [],
      relatedPeople: [],
      relatedProjects: [],
      // For frontend compatibility
      indigenousName: 'Various Traditional Names',
      displayName: 'Remote Communities',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export default {
  getFallbackPartners,
  getFallbackProjects,
  getFallbackOpportunities,
  getFallbackOrganizations,
  getFallbackActivities,
  getFallbackPeople,
  getFallbackArtifacts,
  getFallbackActions,
  getFallbackPlaces,
};
