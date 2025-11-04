const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Project {
  id: string;
  name: string;
  description?: string;
  aiSummary?: string;
  status?: string;
  themes?: string[];
  relatedPlaces?: Array<{ displayName: string; [key: string]: any }>;
  relatedOrganisations?: string[];
  autonomyScore?: number;
  rocketBoosterStage?: string;
  coverImage?: string | null;
  storytellerCount?: number;
}

export async function getProjects(): Promise<Project[]> {
  try {
    const response = await fetch(`${API_URL}/api/real/projects`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid data format received');
    }

    return data.projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}
