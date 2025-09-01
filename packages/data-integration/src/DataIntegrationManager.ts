/**
 * Data Integration Manager for ACT Placemat
 * 
 * Orchestrates data flow between mobile apps and backend services
 * with Australian compliance and mobile optimization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDataManager, type DataManager, type DataManagerConfig } from '@act-placemat/data-services';
import type { Story, Project, Opportunity, Person } from './types';

export interface DataIntegrationConfig extends DataManagerConfig {
  enableOfflineMode?: boolean;
  enableAustralianCompliance?: boolean;
  enableMobileOptimizations?: boolean;
  cacheSettings?: {
    maxCacheSize: number;
    compressionEnabled: boolean;
    compressionThreshold: number;
  };
  syncSettings?: {
    enableAutoSync: boolean;
    syncInterval: number;
    enableBackgroundSync: boolean;
    conflictResolution: 'latest-wins' | 'manual' | 'server-wins';
  };
  compliance?: {
    enableGDPRCompliance: boolean;
    enablePrivacyActCompliance: boolean;
    enableDataResidencyTracking: boolean;
    defaultDataRetention: number;
  };
}

export class DataIntegrationManager {
  private dataManager: DataManager;
  private config: DataIntegrationConfig;
  private isInitialized = false;

  constructor(config: DataIntegrationConfig = {}) {
    this.config = {
      enableOfflineMode: true,
      enableAustralianCompliance: true,
      enableMobileOptimizations: true,
      cacheSettings: {
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        compressionEnabled: true,
        compressionThreshold: 1024,
      },
      syncSettings: {
        enableAutoSync: true,
        syncInterval: 5 * 60 * 1000, // 5 minutes
        enableBackgroundSync: true,
        conflictResolution: 'latest-wins',
      },
      compliance: {
        enableGDPRCompliance: true,
        enablePrivacyActCompliance: true,
        enableDataResidencyTracking: true,
        defaultDataRetention: 2555 * 24 * 60 * 60 * 1000, // 7 years
      },
      ...config,
    };

    this.dataManager = createDataManager(this.config);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚜 Initializing ACT Placemat data integration...');

      // Initialize storage
      await this.initializeStorage();

      // Set up compliance tracking
      if (this.config.enableAustralianCompliance) {
        await this.initializeCompliance();
      }

      // Set up mobile optimizations
      if (this.config.enableMobileOptimizations) {
        await this.initializeMobileOptimizations();
      }

      this.isInitialized = true;
      console.log('✅ Data integration initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize data integration:', error);
      throw error;
    }
  }

  private async initializeStorage(): Promise<void> {
    // Ensure async storage is available
    try {
      await AsyncStorage.setItem('data_integration_test', 'test');
      await AsyncStorage.removeItem('data_integration_test');
      console.log('📱 Mobile storage initialized');
    } catch (error) {
      console.error('Failed to initialize mobile storage:', error);
      throw error;
    }
  }

  private async initializeCompliance(): Promise<void> {
    const complianceData = {
      dataResidency: 'australia',
      gdprCompliant: this.config.compliance?.enableGDPRCompliance,
      privacyActCompliant: this.config.compliance?.enablePrivacyActCompliance,
      initializedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem('compliance_config', JSON.stringify(complianceData));
    console.log('🇦🇺 Australian compliance initialized');
  }

  private async initializeMobileOptimizations(): Promise<void> {
    // Set up mobile-specific optimizations
    const mobileConfig = {
      cacheEnabled: true,
      compressionEnabled: this.config.cacheSettings?.compressionEnabled,
      maxCacheSize: this.config.cacheSettings?.maxCacheSize,
      backgroundSyncEnabled: this.config.syncSettings?.enableBackgroundSync,
    };

    await AsyncStorage.setItem('mobile_config', JSON.stringify(mobileConfig));
    console.log('📱 Mobile optimizations initialized');
  }

  // Search operations
  async searchStories(query: string, options: any = {}): Promise<Story[]> {
    const response = await this.dataManager.searchStories({ query, ...options });
    return response.data?.items || [];
  }

  async searchProjects(query: string, options: any = {}): Promise<Project[]> {
    const response = await this.dataManager.searchProjects({ query, ...options });
    return response.data?.items || [];
  }

  async searchOpportunities(query: string, options: any = {}): Promise<Opportunity[]> {
    const response = await this.dataManager.searchOpportunities({ query, ...options });
    return response.data?.items || [];
  }

  async searchPeople(query: string, options: any = {}): Promise<Person[]> {
    // For now, return empty array - people search would need to be implemented
    return [];
  }

  // Data retrieval operations
  async getAllStories(): Promise<Story[]> {
    const response = await this.dataManager.getAllStories();
    return response.data || [];
  }

  async getAllProjects(): Promise<Project[]> {
    const response = await this.dataManager.getAllProjects();
    return response.data || [];
  }

  async getAllOpportunities(): Promise<Opportunity[]> {
    const response = await this.dataManager.getAllOpportunities();
    return response.data || [];
  }

  async getAllPeople(): Promise<Person[]> {
    const response = await this.dataManager.getAllPeople();
    return response.data || [];
  }

  // Sync operations
  async syncAll(): Promise<void> {
    await this.dataManager.syncAll();
  }

  getSyncStatus() {
    return this.dataManager.getSyncStatus();
  }

  // Cache operations
  async clearCache(): Promise<void> {
    await this.dataManager.clearCache();
  }

  getCacheStats() {
    return this.dataManager.getCacheStats();
  }

  // Status operations
  getNetworkStatus() {
    return this.dataManager.getNetworkStatus();
  }

  getConnectionStatus() {
    return this.dataManager.getConnectionStatus();
  }

  // Compliance operations
  async generateComplianceReport() {
    return await this.dataManager.generateComplianceReport();
  }

  async validateDataResidency(): Promise<boolean> {
    return await this.dataManager.validateDataResidency();
  }

  // Utility methods
  isInitialized(): boolean {
    return this.isInitialized;
  }

  getConfig(): DataIntegrationConfig {
    return { ...this.config };
  }
}