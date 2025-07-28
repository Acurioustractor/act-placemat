// Simple Notion API wrapper that works with your real data
class NotionRealData {
    constructor() {
        // Get config from environment or fallback to server-provided values
        this.token = this.getEnvVar('NOTION_TOKEN') || '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';
        this.databaseId = this.getEnvVar('NOTION_DATABASE_ID') || '177ebcf981cf80dd9514f1ec32f3314c';
        this.baseUrl = 'https://api.notion.com/v1';
    }

    // Browser-compatible environment variable getter
    getEnvVar(name) {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        return null;
    }

    async fetchAllProjects() {
        try {
            console.log('Fetching real projects from server...');
            
            const response = await fetch('/api/notion/real-projects');

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ Found ${data.projects.length} real projects`);
            
            return data;
        } catch (error) {
            console.error('Error fetching real projects:', error);
            throw error;
        }
    }

}

// Export for use
if (typeof window !== 'undefined') {
    window.NotionRealData = NotionRealData;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotionRealData };
}