// Unified Data Synchronization Service
// Manages data sync between Notion, Airtable, and other data sources

const { PlacematNotionIntegration } = require('./notion-mcp.js');
const { PlacematAirtableIntegration } = require('./airtable-mcp.js');

class UnifiedDataSync {
    constructor(config = {}) {
        // Initialize integrations
        this.notion = new PlacematNotionIntegration(config.notion || {});
        this.airtable = new PlacematAirtableIntegration(config.airtable || {});
        
        // Sync configuration
        this.syncConfig = {
            conflictResolution: config.conflictResolution || 'newest', // 'newest', 'notion', 'airtable', 'manual'
            syncInterval: config.syncInterval || 5 * 60 * 1000, // 5 minutes
            enableAutoSync: config.enableAutoSync !== false,
            syncDirection: config.syncDirection || 'bidirectional' // 'bidirectional', 'notion-to-airtable', 'airtable-to-notion'
        };
        
        // State management
        this.syncState = {
            lastSync: null,
            syncing: false,
            conflicts: [],
            errors: []
        };
        
        // Field mapping configuration
        this.fieldMappings = this.initializeFieldMappings();
        
        // Event emitter for sync events
        this.EventEmitter = require('events');
        this.events = new this.EventEmitter();
    }

    initializeFieldMappings() {
        return {
            projects: {
                // Notion field -> Airtable field
                'name': 'Name',
                'area': 'Area',
                'description': 'Description',
                'status': 'Status',
                'funding': 'Funding',
                'lead': 'Project Lead',
                'revenueActual': 'Revenue Actual',
                'revenuePotential': 'Revenue Potential',
                'actualIncoming': 'Actual Incoming',
                'potentialIncoming': 'Potential Incoming',
                'themes': 'Themes',
                'tags': 'Tags',
                'location': 'Location',
                'state': 'State',
                'nextMilestone': 'Next Milestone Date',
                'coreValues': 'Core Values',
                'place': 'Place'
            },
            opportunities: {
                'name': 'Opportunity Name',
                'organization': 'Organization',
                'stage': 'Stage',
                'amount': 'Revenue Amount',
                'probability': 'Probability',
                'type': 'Opportunity Type',
                'description': 'Description',
                'primaryContact': 'Primary Contact',
                'nextAction': 'Next Action',
                'nextActionDate': 'Next Action Date',
                'deadline': 'Deadline'
            }
        };
    }

    // Main sync method
    async sync() {
        if (this.syncState.syncing) {
            console.log('Sync already in progress');
            return;
        }

        this.syncState.syncing = true;
        this.syncState.errors = [];
        this.syncState.conflicts = [];
        
        const syncReport = {
            startTime: new Date(),
            endTime: null,
            projectsSync: { created: 0, updated: 0, conflicts: 0 },
            opportunitiesSync: { created: 0, updated: 0, conflicts: 0 },
            errors: [],
            success: false
        };

        try {
            console.log('Starting unified data sync...');
            this.events.emit('sync:start', syncReport);

            // Fetch data from both sources
            const [notionData, airtableData] = await Promise.all([
                this.fetchNotionData(),
                this.fetchAirtableData()
            ]);

            // Sync projects
            if (this.shouldSyncProjects()) {
                const projectsResult = await this.syncProjects(notionData.projects, airtableData.projects);
                syncReport.projectsSync = projectsResult;
            }

            // Sync opportunities (if available)
            if (notionData.opportunities && airtableData.opportunities) {
                const opportunitiesResult = await this.syncOpportunities(
                    notionData.opportunities, 
                    airtableData.opportunities
                );
                syncReport.opportunitiesSync = opportunitiesResult;
            }

            // Handle conflicts
            if (this.syncState.conflicts.length > 0) {
                await this.handleConflicts();
            }

            syncReport.success = true;
            syncReport.endTime = new Date();
            this.syncState.lastSync = new Date();
            
            console.log('Sync completed successfully:', syncReport);
            this.events.emit('sync:complete', syncReport);
            
        } catch (error) {
            console.error('Sync failed:', error);
            syncReport.errors.push(error.message);
            syncReport.success = false;
            syncReport.endTime = new Date();
            
            this.syncState.errors.push({
                timestamp: new Date(),
                error: error.message,
                stack: error.stack
            });
            
            this.events.emit('sync:error', error);
            
        } finally {
            this.syncState.syncing = false;
        }

        return syncReport;
    }

    async fetchNotionData() {
        try {
            const projects = await this.notion.getProjects();
            
            // Try to fetch opportunities if the database exists
            let opportunities = [];
            try {
                // This would need to be implemented in notion-mcp.js
                opportunities = await this.notion.notion.fetchOpportunities?.() || [];
            } catch (e) {
                console.log('Opportunities database not available in Notion');
            }

            return { projects, opportunities };
        } catch (error) {
            console.error('Error fetching Notion data:', error);
            throw error;
        }
    }

    async fetchAirtableData() {
        try {
            const data = await this.airtable.getAllData();
            return data;
        } catch (error) {
            console.error('Error fetching Airtable data:', error);
            throw error;
        }
    }

    async syncProjects(notionProjects, airtableProjects) {
        const result = { created: 0, updated: 0, conflicts: 0 };
        
        // Create lookup maps for efficient comparison
        const notionMap = new Map(notionProjects.map(p => [this.getProjectKey(p), p]));
        const airtableMap = new Map(airtableProjects.map(p => [this.getProjectKey(p), p]));
        
        // Check Notion -> Airtable
        if (this.shouldSyncToAirtable()) {
            for (const notionProject of notionProjects) {
                const key = this.getProjectKey(notionProject);
                const airtableProject = airtableMap.get(key);
                
                if (!airtableProject) {
                    // Create in Airtable
                    await this.createProjectInAirtable(notionProject);
                    result.created++;
                } else {
                    // Check if update needed
                    const comparison = this.compareProjects(notionProject, airtableProject);
                    if (comparison.hasChanges) {
                        if (comparison.hasConflict) {
                            this.handleProjectConflict(notionProject, airtableProject, comparison);
                            result.conflicts++;
                        } else {
                            await this.updateProjectInAirtable(airtableProject.id, notionProject);
                            result.updated++;
                        }
                    }
                }
            }
        }
        
        // Check Airtable -> Notion
        if (this.shouldSyncToNotion()) {
            for (const airtableProject of airtableProjects) {
                const key = this.getProjectKey(airtableProject);
                const notionProject = notionMap.get(key);
                
                if (!notionProject) {
                    // Create in Notion
                    await this.createProjectInNotion(airtableProject);
                    result.created++;
                } else {
                    // Updates to Notion handled above if bidirectional
                }
            }
        }
        
        return result;
    }

    getProjectKey(project) {
        // Use name as key, but could be enhanced with better matching logic
        return project.name.toLowerCase().trim();
    }

    compareProjects(notionProject, airtableProject) {
        const changes = [];
        const conflicts = [];
        
        // Compare each mapped field
        for (const [notionField, airtableField] of Object.entries(this.fieldMappings.projects)) {
            const notionValue = notionProject[notionField];
            const airtableValue = airtableProject[notionField]; // Already mapped in parser
            
            if (this.valuesAreDifferent(notionValue, airtableValue)) {
                const change = {
                    field: notionField,
                    notionValue,
                    airtableValue
                };
                
                changes.push(change);
                
                // Check if this is a conflict (both have been modified)
                if (this.isConflict(notionProject, airtableProject, notionField)) {
                    conflicts.push(change);
                }
            }
        }
        
        return {
            hasChanges: changes.length > 0,
            hasConflict: conflicts.length > 0,
            changes,
            conflicts
        };
    }

    valuesAreDifferent(val1, val2) {
        // Handle different types of values
        if (val1 === val2) return false;
        if (val1 == null && val2 == null) return false;
        if (val1 == null || val2 == null) return true;
        
        // Array comparison
        if (Array.isArray(val1) && Array.isArray(val2)) {
            return JSON.stringify(val1.sort()) !== JSON.stringify(val2.sort());
        }
        
        // Object comparison
        if (typeof val1 === 'object' && typeof val2 === 'object') {
            return JSON.stringify(val1) !== JSON.stringify(val2);
        }
        
        // Number comparison with tolerance
        if (typeof val1 === 'number' && typeof val2 === 'number') {
            return Math.abs(val1 - val2) > 0.01;
        }
        
        return val1 !== val2;
    }

    isConflict(notionProject, airtableProject, field) {
        // Simple conflict detection based on modification times
        // In a real implementation, you'd track field-level modification times
        const notionModified = new Date(notionProject.lastModified);
        const airtableModified = new Date(airtableProject.lastModified);
        
        // If both have been modified recently (within sync interval), it's a conflict
        const timeDiff = Math.abs(notionModified - airtableModified);
        return timeDiff < this.syncConfig.syncInterval;
    }

    handleProjectConflict(notionProject, airtableProject, comparison) {
        const conflict = {
            type: 'project',
            notionData: notionProject,
            airtableData: airtableProject,
            changes: comparison.changes,
            conflicts: comparison.conflicts,
            timestamp: new Date()
        };
        
        this.syncState.conflicts.push(conflict);
        
        // Apply conflict resolution strategy
        switch (this.syncConfig.conflictResolution) {
            case 'newest':
                // Use the most recently modified version
                const notionTime = new Date(notionProject.lastModified);
                const airtableTime = new Date(airtableProject.lastModified);
                return notionTime > airtableTime ? 'notion' : 'airtable';
                
            case 'notion':
                return 'notion';
                
            case 'airtable':
                return 'airtable';
                
            case 'manual':
            default:
                // Store conflict for manual resolution
                this.events.emit('conflict:detected', conflict);
                return null;
        }
    }

    async createProjectInAirtable(notionProject) {
        const airtableFields = this.mapNotionToAirtable(notionProject, 'projects');
        
        try {
            const result = await this.airtable.airtable.createRecord(
                this.airtable.airtable.tables.projects,
                airtableFields
            );
            
            console.log(`Created project in Airtable: ${notionProject.name}`);
            this.events.emit('project:created:airtable', result);
            
            return result;
        } catch (error) {
            console.error(`Failed to create project in Airtable: ${notionProject.name}`, error);
            throw error;
        }
    }

    async updateProjectInAirtable(recordId, notionProject) {
        const airtableFields = this.mapNotionToAirtable(notionProject, 'projects');
        
        try {
            const result = await this.airtable.airtable.updateRecord(
                this.airtable.airtable.tables.projects,
                recordId,
                airtableFields
            );
            
            console.log(`Updated project in Airtable: ${notionProject.name}`);
            this.events.emit('project:updated:airtable', result);
            
            return result;
        } catch (error) {
            console.error(`Failed to update project in Airtable: ${notionProject.name}`, error);
            throw error;
        }
    }

    async createProjectInNotion(airtableProject) {
        // This would require implementing write capabilities in notion-mcp.js
        console.log(`Would create project in Notion: ${airtableProject.name}`);
        console.log('Note: Notion write operations not yet implemented');
        
        // Placeholder for future implementation
        this.events.emit('project:created:notion:pending', airtableProject);
    }

    mapNotionToAirtable(notionData, dataType) {
        const mapping = this.fieldMappings[dataType];
        const airtableFields = {};
        
        for (const [notionField, airtableField] of Object.entries(mapping)) {
            if (notionData[notionField] !== undefined) {
                airtableFields[airtableField] = notionData[notionField];
            }
        }
        
        return airtableFields;
    }

    mapAirtableToNotion(airtableData, dataType) {
        const mapping = this.fieldMappings[dataType];
        const notionFields = {};
        
        // Reverse mapping
        for (const [notionField, airtableField] of Object.entries(mapping)) {
            if (airtableData[airtableField] !== undefined) {
                notionFields[notionField] = airtableData[airtableField];
            }
        }
        
        return notionFields;
    }

    // Sync control methods
    shouldSyncProjects() {
        return true; // Can be configured
    }

    shouldSyncToAirtable() {
        return this.syncConfig.syncDirection === 'bidirectional' || 
               this.syncConfig.syncDirection === 'notion-to-airtable';
    }

    shouldSyncToNotion() {
        return this.syncConfig.syncDirection === 'bidirectional' || 
               this.syncConfig.syncDirection === 'airtable-to-notion';
    }

    // Auto-sync management
    startAutoSync() {
        if (!this.syncConfig.enableAutoSync) {
            console.log('Auto-sync is disabled');
            return;
        }

        if (this.syncInterval) {
            console.log('Auto-sync already running');
            return;
        }

        this.syncInterval = setInterval(() => {
            this.sync().catch(error => {
                console.error('Auto-sync error:', error);
                this.events.emit('autosync:error', error);
            });
        }, this.syncConfig.syncInterval);

        console.log(`Auto-sync started (every ${this.syncConfig.syncInterval / 1000} seconds)`);
        this.events.emit('autosync:started');
        
        // Run initial sync
        this.sync();
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('Auto-sync stopped');
            this.events.emit('autosync:stopped');
        }
    }

    // Conflict resolution
    async handleConflicts() {
        if (this.syncState.conflicts.length === 0) return;
        
        console.log(`${this.syncState.conflicts.length} conflicts detected`);
        
        for (const conflict of this.syncState.conflicts) {
            if (this.syncConfig.conflictResolution === 'manual') {
                // Emit event for UI to handle
                this.events.emit('conflict:needs-resolution', conflict);
            } else {
                // Auto-resolve based on strategy
                await this.resolveConflict(conflict);
            }
        }
    }

    async resolveConflict(conflict, resolution = null) {
        const strategy = resolution || this.syncConfig.conflictResolution;
        
        switch (strategy) {
            case 'newest':
            case 'notion':
            case 'airtable':
                // Apply the resolution
                if (conflict.type === 'project') {
                    const useNotion = strategy === 'notion' || 
                        (strategy === 'newest' && 
                         new Date(conflict.notionData.lastModified) > 
                         new Date(conflict.airtableData.lastModified));
                    
                    if (useNotion) {
                        await this.updateProjectInAirtable(
                            conflict.airtableData.id, 
                            conflict.notionData
                        );
                    } else {
                        await this.createProjectInNotion(conflict.airtableData);
                    }
                }
                break;
                
            default:
                console.log('Manual conflict resolution required');
        }
        
        // Remove resolved conflict
        this.syncState.conflicts = this.syncState.conflicts.filter(c => c !== conflict);
    }

    // Sync opportunities (similar pattern to projects)
    async syncOpportunities(notionOpportunities, airtableOpportunities) {
        // Similar implementation to syncProjects
        console.log('Opportunity sync not fully implemented yet');
        return { created: 0, updated: 0, conflicts: 0 };
    }

    // Status and monitoring
    getSyncStatus() {
        return {
            syncing: this.syncState.syncing,
            lastSync: this.syncState.lastSync,
            conflicts: this.syncState.conflicts.length,
            errors: this.syncState.errors.length,
            autoSyncEnabled: !!this.syncInterval
        };
    }

    getConflicts() {
        return [...this.syncState.conflicts];
    }

    getErrors() {
        return [...this.syncState.errors];
    }

    clearErrors() {
        this.syncState.errors = [];
    }

    // Event listeners
    on(event, handler) {
        this.events.on(event, handler);
    }

    off(event, handler) {
        this.events.off(event, handler);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.UnifiedDataSync = UnifiedDataSync;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedDataSync;
}