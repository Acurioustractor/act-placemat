/**
 * Mobile Data Provider for ACT Placemat
 * 
 * Provides React Native-optimized data access with:
 * - Automatic background sync
 * - Offline mode support
 * - Australian compliance
 * - Mobile performance optimizations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataIntegrationManager, type DataIntegrationConfig } from './DataIntegrationManager';
import type { Story, Project, Opportunity, Person, MobileDataState, MobileSyncOptions } from './types';

export class MobileDataProvider {
  private dataManager: DataIntegrationManager;
  private state: MobileDataState;
  private listeners: Array<(state: MobileDataState) => void> = [];
  private syncInterval?: NodeJS.Timeout;

  constructor(config: DataIntegrationConfig = {}) {
    this.dataManager = new DataIntegrationManager(config);
    this.state = {
      stories: [],
      projects: [],
      opportunities: [],
      people: [],
      isLoading: true,
      isSyncing: false,
      lastSyncTime: null,
      error: null,
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.dataManager.initialize();
      await this.loadCachedData();
      this.setupAutoSync();
      this.updateState({ isLoading: false });
    } catch (error) {
      this.updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      });
    }
  }

  private async loadCachedData(): Promise<void> {
    try {
      const [stories, projects, opportunities, people, lastSync] = await Promise.all([
        this.getCachedData<Story[]>('cached_stories'),
        this.getCachedData<Project[]>('cached_projects'),
        this.getCachedData<Opportunity[]>('cached_opportunities'),
        this.getCachedData<Person[]>('cached_people'),
        this.getCachedData<string>('last_sync_time'),
      ]);

      this.updateState({
        stories: stories || [],
        projects: projects || [],
        opportunities: opportunities || [],
        people: people || [],
        lastSyncTime: lastSync ? new Date(lastSync) : null,
      });

      console.log('📱 Loaded cached data for offline use');
    } catch (error) {
      console.warn('Failed to load cached data:', error);
    }
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async setCachedData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to cache ${key}:`, error);
    }
  }

  private setupAutoSync(): void {
    // Sync every 5 minutes when app is active
    this.syncInterval = setInterval(() => {
      if (!this.state.isSyncing) {
        this.syncAll({ backgroundSync: true });
      }
    }, 5 * 60 * 1000);
  }

  private updateState(updates: Partial<MobileDataState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Public API
  getState(): MobileDataState {
    return { ...this.state };
  }

  subscribe(listener: (state: MobileDataState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async syncAll(options: MobileSyncOptions = {}): Promise<void> {
    if (this.state.isSyncing && !options.forceRefresh) return;

    this.updateState({ isSyncing: true, error: null });

    try {
      console.log('🔄 Starting mobile data sync...');

      // Sync all data types in parallel
      const [stories, projects, opportunities, people] = await Promise.all([
        this.dataManager.getAllStories(),
        this.dataManager.getAllProjects(),
        this.dataManager.getAllOpportunities(),
        this.dataManager.getAllPeople(),
      ]);

      // Update state with fresh data
      this.updateState({
        stories,
        projects,
        opportunities,
        people,
        lastSyncTime: new Date(),
      });

      // Cache the fresh data
      await Promise.all([
        this.setCachedData('cached_stories', stories),
        this.setCachedData('cached_projects', projects),
        this.setCachedData('cached_opportunities', opportunities),
        this.setCachedData('cached_people', people),
        this.setCachedData('last_sync_time', new Date().toISOString()),
      ]);

      console.log('✅ Mobile data sync completed');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      this.updateState({ error: errorMessage });
      console.error('❌ Mobile sync failed:', error);
    } finally {
      this.updateState({ isSyncing: false });
    }
  }

  async searchStories(query: string, options: any = {}): Promise<Story[]> {
    try {
      return await this.dataManager.searchStories(query, options);
    } catch (error) {
      console.error('Story search failed:', error);
      return [];
    }
  }

  async searchProjects(query: string, options: any = {}): Promise<Project[]> {
    try {
      return await this.dataManager.searchProjects(query, options);
    } catch (error) {
      console.error('Project search failed:', error);
      return [];
    }
  }

  async searchOpportunities(query: string, options: any = {}): Promise<Opportunity[]> {
    try {
      return await this.dataManager.searchOpportunities(query, options);
    } catch (error) {
      console.error('Opportunity search failed:', error);
      return [];
    }
  }

  async searchPeople(query: string, options: any = {}): Promise<Person[]> {
    try {
      return await this.dataManager.searchPeople(query, options);
    } catch (error) {
      console.error('People search failed:', error);
      return [];
    }
  }

  // Compliance and reporting
  async generateComplianceReport() {
    return await this.dataManager.generateComplianceReport();
  }

  async validateDataResidency(): Promise<boolean> {
    return await this.dataManager.validateDataResidency();
  }

  // Cache management
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem('cached_stories'),
        AsyncStorage.removeItem('cached_projects'),
        AsyncStorage.removeItem('cached_opportunities'),
        AsyncStorage.removeItem('cached_people'),
        AsyncStorage.removeItem('last_sync_time'),
      ]);

      this.updateState({
        stories: [],
        projects: [],
        opportunities: [],
        people: [],
        lastSyncTime: null,
      });

      await this.dataManager.clearCache();
      console.log('🗑️ Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  getCacheStats() {
    return this.dataManager.getCacheStats();
  }

  // Status information
  getNetworkStatus() {
    return this.dataManager.getNetworkStatus();
  }

  getConnectionStatus() {
    return this.dataManager.getConnectionStatus();
  }

  getSyncStatus() {
    return this.dataManager.getSyncStatus();
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.listeners = [];
  }
}