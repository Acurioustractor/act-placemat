// ACT Placemat - Services Database Connector
// Australia-wide services scraping, mapping, and analytics

class SupabaseServicesConnector {
    constructor(config = {}) {
        this.supabaseUrl = config.url || this.getEnvVar('SUPABASE_URL');
        this.supabaseKey = config.key || this.getEnvVar('SUPABASE_ANON_KEY');
        this.tableName = 'services';
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.warn('Supabase credentials missing. Using mock data for services.');
            this.useMockData = true;
        }
        
        console.log('🔗 Services connector initialized');
    }

    getEnvVar(name) {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        return null;
    }

    // Get all services with location data for mapping
    async getServicesForMapping() {
        if (this.useMockData) {
            return this.getMockServices();
        }

        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName}?select=*`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Supabase error: ${response.status}`);
            }

            const services = await response.json();
            console.log(`✅ Loaded ${services.length} services from Supabase`);
            return this.enrichServicesData(services);
        } catch (error) {
            console.error('Failed to fetch services:', error);
            return this.getMockServices();
        }
    }

    // Get services by state for analytics
    async getServicesByState(state = null) {
        const services = await this.getServicesForMapping();
        
        if (state) {
            return services.filter(service => 
                service.state && service.state.toLowerCase() === state.toLowerCase()
            );
        }
        
        // Group by state for analytics
        const servicesByState = {};
        services.forEach(service => {
            const serviceState = service.state || 'Unknown';
            if (!servicesByState[serviceState]) {
                servicesByState[serviceState] = [];
            }
            servicesByState[serviceState].push(service);
        });
        
        return servicesByState;
    }

    // Search services by type, location, or keyword
    async searchServices(criteria = {}) {
        const services = await this.getServicesForMapping();
        const { type, location, keyword, category } = criteria;
        
        return services.filter(service => {
            let matches = true;
            
            if (type && service.service_type) {
                matches = matches && service.service_type.toLowerCase().includes(type.toLowerCase());
            }
            
            if (location && (service.city || service.state)) {
                const serviceLocation = `${service.city || ''} ${service.state || ''}`.toLowerCase();
                matches = matches && serviceLocation.includes(location.toLowerCase());
            }
            
            if (keyword) {
                const searchText = `${service.name || ''} ${service.description || ''} ${service.tags || ''}`.toLowerCase();
                matches = matches && searchText.includes(keyword.toLowerCase());
            }
            
            if (category && service.category) {
                matches = matches && service.category.toLowerCase() === category.toLowerCase();
            }
            
            return matches;
        });
    }

    // Get service analytics for dashboard
    async getServiceAnalytics() {
        const services = await this.getServicesForMapping();
        const servicesByState = await this.getServicesByState();
        
        // Calculate analytics
        const totalServices = services.length;
        const activeServices = services.filter(s => s.status === 'active').length;
        const stateCount = Object.keys(servicesByState).length;
        
        // Service type distribution
        const typeDistribution = {};
        services.forEach(service => {
            const type = service.service_type || 'Unknown';
            typeDistribution[type] = (typeDistribution[type] || 0) + 1;
        });
        
        // Geographic distribution
        const geoDistribution = Object.entries(servicesByState).map(([state, stateServices]) => ({
            state,
            count: stateServices.length,
            activeCount: stateServices.filter(s => s.status === 'active').length
        })).sort((a, b) => b.count - a.count);
        
        return {
            overview: {
                totalServices,
                activeServices,
                statesWithServices: stateCount,
                averageServicesPerState: Math.round(totalServices / stateCount)
            },
            typeDistribution,
            geoDistribution,
            recentServices: services
                .filter(s => s.created_at)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10)
        };
    }

    // Add new service (for scraping integration)
    async addService(serviceData) {
        if (this.useMockData) {
            console.log('Mock mode: Would add service:', serviceData.name);
            return { success: true, id: 'mock-' + Date.now() };
        }

        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName}`, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(serviceData)
            });

            if (!response.ok) {
                throw new Error(`Failed to add service: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Service added successfully');
            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Failed to add service:', error);
            return { success: false, error: error.message };
        }
    }

    // Scrape services from government websites (Phase 2)
    async scrapeGovernmentServices(state = null) {
        console.log('🕷️ Starting government services scraping...');
        
        // Mock implementation - will be replaced with real scraping
        const mockScrapedServices = [
            {
                name: 'Centrelink Office - Brisbane',
                service_type: 'Government Support',
                category: 'Social Services',
                description: 'Welfare and support services',
                address: '123 Queen Street, Brisbane',
                city: 'Brisbane',
                state: 'Queensland',
                postcode: '4000',
                phone: '132 850',
                website: 'https://servicesaustralia.gov.au',
                latitude: -27.4698,
                longitude: 153.0251,
                status: 'active',
                source: 'servicesaustralia.gov.au',
                scraped_at: new Date().toISOString()
            },
            {
                name: 'Medicare Office - Sydney',
                service_type: 'Healthcare',
                category: 'Government Health',
                description: 'Medicare and health services',
                address: '456 George Street, Sydney',
                city: 'Sydney',
                state: 'New South Wales',
                postcode: '2000',
                phone: '132 011',
                website: 'https://servicesaustralia.gov.au',
                latitude: -33.8688,
                longitude: 151.2093,
                status: 'active',
                source: 'servicesaustralia.gov.au',
                scraped_at: new Date().toISOString()
            }
        ];

        // Add scraped services to database
        for (const service of mockScrapedServices) {
            if (!state || service.state.toLowerCase().includes(state.toLowerCase())) {
                await this.addService(service);
            }
        }

        console.log(`✅ Scraped ${mockScrapedServices.length} services`);
        return mockScrapedServices;
    }

    // Enrich services data with additional metadata
    enrichServicesData(services) {
        return services.map(service => ({
            ...service,
            // Add computed fields
            location_string: `${service.city || ''}, ${service.state || ''}`.trim().replace(/^,\s*/, ''),
            full_address: `${service.address || ''}, ${service.city || ''}, ${service.state || ''} ${service.postcode || ''}`.trim(),
            coordinates: service.latitude && service.longitude ? {
                lat: parseFloat(service.latitude),
                lng: parseFloat(service.longitude)
            } : null,
            // Service quality indicators
            has_contact: !!(service.phone || service.email || service.website),
            has_location: !!(service.latitude && service.longitude),
            is_complete: !!(service.name && service.description && service.address),
            // Categorization
            display_category: service.category || service.service_type || 'Other',
            tags_array: service.tags ? service.tags.split(',').map(tag => tag.trim()) : []
        }));
    }

    // Get mock services for development
    getMockServices() {
        return [
            {
                id: 1,
                name: 'Brisbane Community Health Centre',
                service_type: 'Healthcare',
                category: 'Community Health',
                description: 'Comprehensive community health services including mental health, family planning, and chronic disease management',
                address: '789 Logan Road, Woolloongabba',
                city: 'Brisbane',
                state: 'Queensland',
                postcode: '4102',
                phone: '(07) 3000 1234',
                email: 'info@brisbanecommunityhealth.org.au',
                website: 'https://brisbanecommunityhealth.org.au',
                latitude: -27.4848,
                longitude: 153.0390,
                status: 'active',
                tags: 'health, mental health, community, bulk billing',
                created_at: '2024-01-15T09:00:00Z'
            },
            {
                id: 2,
                name: 'Sydney Legal Aid Office',
                service_type: 'Legal Services',
                category: 'Legal Aid',
                description: 'Free legal advice and representation for people who cannot afford a lawyer',
                address: '321 Castlereagh Street, Sydney',
                city: 'Sydney',
                state: 'New South Wales',
                postcode: '2000',
                phone: '(02) 9219 5000',
                email: 'contact@legalaid.nsw.gov.au',
                website: 'https://legalaid.nsw.gov.au',
                latitude: -33.8709,
                longitude: 151.2087,
                status: 'active',
                tags: 'legal, aid, free, advice, representation',
                created_at: '2024-01-10T14:30:00Z'
            },
            {
                id: 3,
                name: 'Melbourne Employment Hub',
                service_type: 'Employment',
                category: 'Job Services',
                description: 'Job search assistance, career counseling, and skills training programs',
                address: '555 Collins Street, Melbourne',
                city: 'Melbourne',
                state: 'Victoria',
                postcode: '3000',
                phone: '(03) 9600 7777',
                email: 'jobs@melbournehub.org.au',
                website: 'https://melbournehub.org.au',
                latitude: -37.8136,
                longitude: 144.9631,
                status: 'active',
                tags: 'employment, jobs, training, career, skills',
                created_at: '2024-01-20T11:15:00Z'
            },
            {
                id: 4,
                name: 'Perth Family Support Centre',
                service_type: 'Family Services',
                category: 'Family Support',
                description: 'Family counseling, parenting programs, and domestic violence support services',
                address: '888 Hay Street, Perth',
                city: 'Perth',
                state: 'Western Australia',
                postcode: '6000',
                phone: '(08) 9200 5555',
                email: 'support@perthfamily.org.au',
                website: 'https://perthfamily.org.au',
                latitude: -31.9505,
                longitude: 115.8605,
                status: 'active',
                tags: 'family, counseling, parenting, domestic violence, support',
                created_at: '2024-01-05T16:45:00Z'
            },
            {
                id: 5,
                name: 'Adelaide Youth Services',
                service_type: 'Youth Services',
                category: 'Youth Support',
                description: 'Youth programs, mentoring, educational support, and recreational activities',
                address: '123 North Terrace, Adelaide',
                city: 'Adelaide',
                state: 'South Australia',
                postcode: '5000',
                phone: '(08) 8400 3333',
                email: 'youth@adelaideyouth.org.au',
                website: 'https://adelaideyouth.org.au',
                latitude: -34.9285,
                longitude: 138.6007,
                status: 'active',
                tags: 'youth, mentoring, education, recreation, programs',
                created_at: '2024-01-25T10:00:00Z'
            }
        ];
    }
}

// Integration with ACT Placemat Dashboard
class ServicesIntegration {
    constructor() {
        this.connector = new SupabaseServicesConnector();
    }

    async initializeServicesSection() {
        try {
            const analytics = await this.connector.getServiceAnalytics();
            this.displayServicesOverview(analytics);
            
            const services = await this.connector.getServicesForMapping();
            this.displayServicesMap(services);
            
            console.log('✅ Services integration initialized');
        } catch (error) {
            console.error('Failed to initialize services:', error);
        }
    }

    displayServicesOverview(analytics) {
        const overviewHTML = `
            <div class="act-card">
                <div class="act-card-header">
                    <h2 class="act-card-title">🗺️ Australia-wide Services</h2>
                    <span class="act-badge">${analytics.overview.totalServices} services</span>
                </div>
                <div class="act-grid act-grid-4">
                    <div class="metric-card">
                        <div class="metric-value">${analytics.overview.totalServices}</div>
                        <div class="metric-label">Total Services</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${analytics.overview.activeServices}</div>
                        <div class="metric-label">Active Services</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${analytics.overview.statesWithServices}</div>
                        <div class="metric-label">States/Territories</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${analytics.overview.averageServicesPerState}</div>
                        <div class="metric-label">Avg per State</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to dashboard
        const container = document.querySelector('.act-content');
        if (container) {
            container.insertAdjacentHTML('beforeend', overviewHTML);
        }
    }

    displayServicesMap(services) {
        // This would integrate with a mapping library in Phase 2
        console.log('🗺️ Services ready for mapping:', services.length);
        console.log('📍 Geographic distribution:', 
            services.reduce((acc, service) => {
                acc[service.state] = (acc[service.state] || 0) + 1;
                return acc;
            }, {}));
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.SupabaseServicesConnector = SupabaseServicesConnector;
    window.ServicesIntegration = ServicesIntegration;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseServicesConnector, ServicesIntegration };
}

console.log('🇦🇺 Australia-wide services connector ready');