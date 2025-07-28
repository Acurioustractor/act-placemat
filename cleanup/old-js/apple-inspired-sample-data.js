// 🍎 Apple-Inspired Sample Data for ACT Placemat
// Clean, simple, elegant data structure following Apple design principles

const appleSampleData = {
    // 1️⃣ PROJECTS - Enhanced existing structure
    projects: [
        {
            id: 'proj-001',
            // Essential (Level 1)
            name: 'Community Solar Network',
            status: 'Active',
            area: 'Infrastructure',
            revenue: 85000,
            
            // Important (Level 2)
            lead: 'Maria Santos',
            nextMilestone: '2024-02-15',
            funding: 'Funded',
            teamSize: 8,
            
            // Detail (Level 3)
            description: 'Distributed solar energy system connecting rural communities with clean, affordable power',
            revenuePotential: 250000,
            startDate: '2023-08-01',
            endDate: '2024-12-31',
            successMetrics: 'Power 50+ households, 20% cost reduction, 80% uptime',
            aiSummary: 'High-impact infrastructure project with strong community adoption and revenue growth'
        },
        {
            id: 'proj-002',
            name: 'Youth Leadership Program',
            status: 'Planning',
            area: 'Community',
            revenue: 0,
            
            lead: 'James Mitchell',
            nextMilestone: '2024-02-01',
            funding: 'Seeking',
            teamSize: 4,
            
            description: 'Empowering young leaders through mentorship, training, and community project experience',
            revenuePotential: 120000,
            startDate: '2024-03-01',
            endDate: '2025-02-28',
            successMetrics: '100 participants, 80% completion rate, 20 community projects launched',
            aiSummary: 'Strategic community investment with strong long-term impact potential'
        },
        {
            id: 'proj-003',
            name: 'Local Food Hub',
            status: 'Active',
            area: 'Economic',
            revenue: 45000,
            
            lead: 'Sarah Chen',
            nextMilestone: '2024-01-30',
            funding: 'Self-Funded',
            teamSize: 12,
            
            description: 'Connecting local farmers with community buyers through cooperative marketplace',
            revenuePotential: 180000,
            startDate: '2023-06-01',
            endDate: '2024-08-31',
            successMetrics: '30 farmer partners, $500K in local sales, 15% farmer income increase',
            aiSummary: 'Sustainable economic model driving local food security and farmer prosperity'
        }
    ],

    // 2️⃣ OPPORTUNITIES - New clean structure
    opportunities: [
        {
            id: 'opp-001',
            // Essential (Level 1)
            name: 'Federal Rural Energy Grant',
            stage: 'Proposal',
            value: 300000,
            probability: '75%',
            
            // Important (Level 2)
            type: 'Grant',
            deadline: '2024-02-28',
            contact: 'person-001', // Sarah Johnson
            organization: 'org-001', // Department of Energy
            
            // Detail (Level 3)
            description: 'Federal funding for renewable energy infrastructure in rural communities',
            requirements: 'Environmental impact study, community partnerships, 25% match funding',
            nextAction: 'Submit technical specifications by Feb 15',
            competition: 'Medium - 20+ applicants, strong technical requirements',
            riskLevel: 'Medium',
            weightedValue: 225000
        },
        {
            id: 'opp-002',
            name: 'Corporate Sustainability Partnership',
            stage: 'Negotiation',
            value: 150000,
            probability: '90%',
            
            type: 'Partnership',
            deadline: '2024-01-31',
            contact: 'person-002', // David Kim
            organization: 'org-002', // GreenTech Solutions
            
            description: 'Multi-year partnership for community sustainability initiatives',
            requirements: 'Quarterly impact reports, co-branding opportunities, joint events',
            nextAction: 'Finalize contract terms and payment schedule',
            competition: 'Low - exclusive partnership discussion',
            riskLevel: 'Low',
            weightedValue: 135000
        },
        {
            id: 'opp-003',
            name: 'Foundation Youth Development Grant',
            stage: 'Discovery',
            value: 75000,
            probability: '50%',
            
            type: 'Grant',
            deadline: '2024-03-31',
            contact: 'person-003', // Lisa Rodriguez
            organization: 'org-003', // Community Foundation
            
            description: 'Funding for youth leadership and mentorship programs',
            requirements: 'Program curriculum, outcome measurements, community letters of support',
            nextAction: 'Schedule discovery call to understand priorities',
            competition: 'High - foundation funds many youth programs',
            riskLevel: 'High',
            weightedValue: 37500
        }
    ],

    // 3️⃣ ORGANIZATIONS - New clean structure
    organizations: [
        {
            id: 'org-001',
            // Essential (Level 1)
            name: 'Department of Energy',
            type: 'Government',
            relationship: 'Partner',
            capacity: '$200K-$1M',
            
            // Important (Level 2)
            location: 'Washington, DC',
            keyContact: 'person-001', // Sarah Johnson
            lastContact: '2024-01-15',
            priority: 'Critical',
            
            // Detail (Level 3)
            description: 'Federal agency focused on energy policy and renewable energy initiatives',
            website: 'https://energy.gov',
            strengths: 'Large funding capacity, policy influence, technical expertise',
            opportunities: 'Rural energy grants, research partnerships, policy advocacy',
            notes: 'Strong advocate for community-owned renewable energy projects',
            partnershipHistory: '2-year grant partnership, excellent working relationship'
        },
        {
            id: 'org-002',
            name: 'GreenTech Solutions',
            type: 'Corporation',
            relationship: 'Client',
            capacity: '$50K-$200K',
            
            location: 'San Francisco, CA',
            keyContact: 'person-002', // David Kim
            lastContact: '2024-01-20',
            priority: 'High',
            
            description: 'Technology company specializing in sustainable energy solutions',
            website: 'https://greentechsolutions.com',
            strengths: 'Technical innovation, market reach, sustainability focus',
            opportunities: 'Partnership funding, technology integration, market expansion',
            notes: 'Interested in community-scale implementations of their technology',
            partnershipHistory: 'New relationship, very promising initial discussions'
        },
        {
            id: 'org-003',
            name: 'Community Foundation',
            type: 'Foundation',
            relationship: 'Prospect',
            capacity: '<$50K',
            
            location: 'Regional',
            keyContact: 'person-003', // Lisa Rodriguez
            lastContact: '2024-01-10',
            priority: 'Medium',
            
            description: 'Local foundation supporting community development and youth programs',
            website: 'https://communityfoundation.org',
            strengths: 'Local knowledge, youth focus, community connections',
            opportunities: 'Youth programs, capacity building, community events',
            notes: 'Particularly interested in programs that develop local leadership',
            partnershipHistory: 'Early stage conversations, attended our community event'
        }
    ],

    // 4️⃣ PEOPLE - New clean structure
    people: [
        {
            id: 'person-001',
            // Essential (Level 1)
            name: 'Sarah Johnson',
            role: 'Program Director',
            organization: 'org-001', // Department of Energy
            influence: 'Decision Maker',
            
            // Important (Level 2)
            email: 'sarah.johnson@energy.gov',
            phone: '(202) 555-0123',
            linkedin: 'https://linkedin.com/in/sarah-johnson-energy',
            lastContact: '2024-01-15',
            
            // Detail (Level 3)
            location: 'Washington, DC (EST)',
            expertise: ['Energy Policy', 'Rural Development', 'Grant Management'],
            interests: ['Community Ownership', 'Renewable Energy', 'Policy Innovation'],
            communicationPref: 'Email',
            nextContact: '2024-02-01',
            background: '15 years in federal energy policy, former rural development coordinator',
            personalNotes: 'Originally from rural Colorado, passionate about community energy projects'
        },
        {
            id: 'person-002',
            name: 'David Kim',
            role: 'Partnerships Director',
            organization: 'org-002', // GreenTech Solutions
            influence: 'Influencer',
            
            email: 'david.kim@greentechsolutions.com',
            phone: '(415) 555-0456',
            linkedin: 'https://linkedin.com/in/david-kim-greentech',
            lastContact: '2024-01-20',
            
            location: 'San Francisco, CA (PST)',
            expertise: ['Business Development', 'Technology', 'Sustainability'],
            interests: ['Community Impact', 'Innovation', 'Social Enterprise'],
            communicationPref: 'Video Call',
            nextContact: '2024-01-30',
            background: 'Former startup founder, now focused on scaling sustainable technologies',
            personalNotes: 'Enjoys hiking, very interested in community-owned business models'
        },
        {
            id: 'person-003',
            name: 'Lisa Rodriguez',
            role: 'Youth Programs Manager',
            organization: 'org-003', // Community Foundation
            influence: 'Supporter',
            
            email: 'lisa.rodriguez@communityfoundation.org',
            phone: '(555) 123-7890',
            linkedin: 'https://linkedin.com/in/lisa-rodriguez-youth',
            lastContact: '2024-01-10',
            
            location: 'Regional (CST)',
            expertise: ['Youth Development', 'Program Management', 'Community Organizing'],
            interests: ['Education', 'Leadership Development', 'Community Building'],
            communicationPref: 'Phone',
            nextContact: '2024-02-15',
            background: 'Former teacher, 8 years in youth development and community programs',
            personalNotes: 'Multilingual (Spanish/English), strong community connections'
        }
    ],

    // 5️⃣ ARTIFACTS - New clean structure
    artifacts: [
        {
            id: 'artifact-001',
            // Essential (Level 1)
            name: 'Grant Application Template',
            type: 'Template',
            status: 'Approved',
            owner: 'person-001', // Sarah Johnson
            
            // Important (Level 2)
            format: 'Word',
            access: 'Internal',
            version: 2.1,
            lastUpdated: '2024-01-15',
            
            // Detail (Level 3)
            description: 'Standardized template for federal energy grant applications',
            purpose: 'Proposal',
            audience: ['Team', 'Partners'],
            keywords: ['Grant', 'Energy', 'Template', 'Federal'],
            usageNotes: 'Use for all DOE grant applications, customize section 3 for specific projects',
            downloadCount: 23,
            effectiveness: 'High'
        },
        {
            id: 'artifact-002',
            name: 'Community Impact Report 2023',
            type: 'Report',
            status: 'Published',
            owner: 'person-002', // David Kim
            
            format: 'PDF',
            access: 'Public',
            version: 1.0,
            lastUpdated: '2024-01-01',
            
            description: 'Annual report showcasing community projects and their impact',
            purpose: 'Marketing',
            audience: ['Public', 'Funders', 'Partners'],
            keywords: ['Impact', 'Annual', 'Community', 'Report'],
            usageNotes: 'Share with potential funders and partners to demonstrate track record',
            downloadCount: 156,
            effectiveness: 'High'
        },
        {
            id: 'artifact-003',
            name: 'Partnership Agreement Template',
            type: 'Contract',
            status: 'Review',
            owner: 'person-003', // Lisa Rodriguez
            
            format: 'Word',
            access: 'Confidential',
            version: 1.2,
            lastUpdated: '2024-01-18',
            
            description: 'Legal template for formal partnership agreements',
            purpose: 'Legal',
            audience: ['Team'],
            keywords: ['Partnership', 'Contract', 'Legal', 'Template'],
            usageNotes: 'Requires legal review before use, customize terms for each partnership',
            downloadCount: 8,
            effectiveness: 'Medium'
        }
    ],

    // 🔗 RELATIONSHIPS - Clean connection mapping
    relationships: {
        // Projects → Other Entities
        'proj-001': {
            opportunities: ['opp-001', 'opp-002'],
            organizations: ['org-001', 'org-002'],
            people: ['person-001', 'person-002'],
            artifacts: ['artifact-001', 'artifact-002']
        },
        'proj-002': {
            opportunities: ['opp-003'],
            organizations: ['org-003'],
            people: ['person-003'],
            artifacts: ['artifact-002']
        },
        'proj-003': {
            opportunities: [],
            organizations: ['org-002'],
            people: ['person-002'],
            artifacts: ['artifact-002', 'artifact-003']
        }
    }
};

// 📊 METRICS - Apple-inspired dashboard data
const dashboardMetrics = {
    projects: {
        total: 3,
        active: 2,
        planning: 1,
        totalRevenue: 130000,
        potentialRevenue: 550000
    },
    opportunities: {
        total: 3,
        totalValue: 525000,
        weightedValue: 397500,
        stages: {
            discovery: 1,
            proposal: 1,
            negotiation: 1
        }
    },
    organizations: {
        total: 3,
        partners: 1,
        clients: 1,
        prospects: 1,
        highCapacity: 1
    },
    people: {
        total: 3,
        decisionMakers: 1,
        influencers: 1,
        supporters: 1
    },
    artifacts: {
        total: 3,
        approved: 1,
        published: 1,
        inReview: 1
    }
};

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.appleSampleData = appleSampleData;
    window.dashboardMetrics = dashboardMetrics;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { appleSampleData, dashboardMetrics };
}

console.log('🍎 Apple-inspired sample data loaded successfully');
console.log('📊 Dashboard metrics:', dashboardMetrics);