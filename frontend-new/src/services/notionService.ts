// Notion Service for Partner Data Integration
// This will connect to your Notion database once API access is working

interface NotionPartner {
  id: string;
  properties: {
    Name: { title: Array<{ plain_text: string }> };
    Type: { select: { name: string } };
    Category: { select?: { name: string } };
    Description: { rich_text: Array<{ plain_text: string }> };
    'Contribution Type': { rich_text: Array<{ plain_text: string }> };
    'Relationship Strength': { select: { name: string } };
    'Collaboration Focus': { multi_select: Array<{ name: string }> };
    'Impact Story': { rich_text: Array<{ plain_text: string }> };
    Featured: { checkbox: boolean };
    'Logo URL': { url?: string };
    'Website URL': { url?: string };
    Location: { rich_text: Array<{ plain_text: string }> };
    'Established Date': { date?: { start: string } };
  };
}

export interface Partner {
  id: string;
  name: string;
  type: 'community' | 'funder' | 'talent' | 'government' | 'alliance';
  category?: string;
  logo_url?: string;
  website_url?: string;
  description: string;
  contribution_type: string;
  relationship_strength: 'cornerstone' | 'active' | 'emerging' | 'connected';
  collaboration_focus: string[];
  impact_story: string;
  featured: boolean;
  location?: string;
  established_date?: string;
}

class NotionPartnerService {
  private baseUrl = 'http://localhost:4000/api/notion'; // Backend proxy to handle CORS

  async getPartners(): Promise<Partner[]> {
    try {
      // Try to fetch from Notion via backend proxy
      const response = await fetch(`${this.baseUrl}/partners`);
      
      if (!response.ok) {
        console.warn('Notion API not available, using default partners');
        return this.getDefaultPartners();
      }
      
      const notionData: NotionPartner[] = await response.json();
      return this.transformNotionToPartners(notionData);
      
    } catch (error) {
      console.warn('Error fetching from Notion, using default partners:', error);
      return this.getDefaultPartners();
    }
  }

  private transformNotionToPartners(notionData: NotionPartner[]): Partner[] {
    return notionData.map(item => ({
      id: item.id,
      name: item.properties.Name?.title?.[0]?.plain_text || '',
      type: this.mapNotionType(item.properties.Type?.select?.name || 'alliance'),
      category: item.properties.Category?.select?.name,
      description: item.properties.Description?.rich_text?.[0]?.plain_text || '',
      contribution_type: item.properties['Contribution Type']?.rich_text?.[0]?.plain_text || '',
      relationship_strength: this.mapRelationshipStrength(item.properties['Relationship Strength']?.select?.name || 'connected'),
      collaboration_focus: item.properties['Collaboration Focus']?.multi_select?.map(f => f.name) || [],
      impact_story: item.properties['Impact Story']?.rich_text?.[0]?.plain_text || '',
      featured: item.properties.Featured?.checkbox || false,
      logo_url: item.properties['Logo URL']?.url,
      website_url: item.properties['Website URL']?.url,
      location: item.properties.Location?.rich_text?.[0]?.plain_text,
      established_date: item.properties['Established Date']?.date?.start?.split('-')[0] // Extract year
    }));
  }

  private mapNotionType(notionType: string): 'community' | 'funder' | 'talent' | 'government' | 'alliance' {
    const type = notionType.toLowerCase();
    if (type.includes('community')) return 'community';
    if (type.includes('fund')) return 'funder';
    if (type.includes('talent') || type.includes('design')) return 'talent';
    if (type.includes('government') || type.includes('gov')) return 'government';
    return 'alliance';
  }

  private mapRelationshipStrength(strength: string): 'cornerstone' | 'active' | 'emerging' | 'connected' {
    const str = strength.toLowerCase();
    if (str.includes('cornerstone') || str.includes('core')) return 'cornerstone';
    if (str.includes('active') || str.includes('strong')) return 'active';
    if (str.includes('emerging') || str.includes('new')) return 'emerging';
    return 'connected';
  }

  private getDefaultPartners(): Partner[] {
    // Fallback partners based on your business plan
    return [
      {
        id: 'childrens-ground',
        name: "Children's Ground",
        type: 'community',
        category: 'indigenous_led',
        description: 'Indigenous-led organisation pioneering community-controlled development across remote Australia.',
        contribution_type: 'Community Wisdom & Co-design',
        relationship_strength: 'cornerstone',
        collaboration_focus: ['Community-led design', 'Cultural guidance', 'Lived experience'],
        impact_story: 'Teaching us that true innovation comes from listening circles, not boardrooms.',
        featured: true,
        location: 'Remote Australia',
        established_date: '2023',
        logo_url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=200&h=200&fit=crop'
      },
      {
        id: 'snow-foundation',
        name: 'Snow Foundation',
        type: 'funder',
        category: 'impact_focused',
        description: 'Visionary foundation backing bold approaches to social justice through trust-based funding.',
        contribution_type: 'Trust-based Funding & Strategic Support',
        relationship_strength: 'active',
        collaboration_focus: ['Financial backing', 'Strategic mentorship', 'Network connections'],
        impact_story: 'Believing in community-led solutions before they become mainstream.',
        featured: true,
        location: 'Australia',
        established_date: '2023',
        logo_url: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=200&h=200&fit=crop'
      },
      {
        id: 'first-nations-youth-justice-alliance',
        name: 'First Nations Youth Justice Alliance',
        type: 'community',
        category: 'indigenous_led',
        description: 'Leading Indigenous-led organisation working on culturally responsive youth justice approaches.',
        contribution_type: 'Cultural Knowledge & Advocacy Leadership',
        relationship_strength: 'cornerstone',
        collaboration_focus: ['Cultural protocols', 'Youth engagement', 'Justice system reform'],
        impact_story: 'Showing us what justice looks like when communities lead the way.',
        featured: true,
        location: 'National',
        established_date: '2022',
        logo_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200&h=200&fit=crop'
      },
      {
        id: 'elder-advisory-circle',
        name: 'Elder Advisory Circle',
        type: 'community',
        category: 'wisdom_keepers',
        description: 'Circle of Elders from participating communities who guide our approach and hold us accountable.',
        contribution_type: 'Wisdom, Guidance & Accountability',
        relationship_strength: 'cornerstone',
        collaboration_focus: ['Cultural guidance', 'Project oversight', 'Community accountability'],
        impact_story: 'The compass that keeps us oriented toward genuine community benefit.',
        featured: true,
        location: 'Community-based',
        established_date: '2023',
        logo_url: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=200&h=200&fit=crop'
      }
    ];
  }
}

export const notionPartnerService = new NotionPartnerService();