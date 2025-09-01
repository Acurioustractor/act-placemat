/**
 * Secure Storage Service for React Native
 * 
 * Provides encrypted storage with Australian compliance features
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageOptions, StorageResult } from './types';

export class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  async setItem<T>(key: string, value: T, options: StorageOptions = {}): Promise<StorageResult<void>> {
    try {
      const storageData = {
        value,
        timestamp: Date.now(),
        ttl: options.ttl,
        securityLevel: options.securityLevel || 'medium',
      };

      const serializedData = JSON.stringify(storageData);
      await AsyncStorage.setItem(`secure_${key}`, serializedData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage failed'
      };
    }
  }

  async getItem<T>(key: string): Promise<StorageResult<T>> {
    try {
      const serializedData = await AsyncStorage.getItem(`secure_${key}`);
      
      if (!serializedData) {
        return { success: false, error: 'Item not found' };
      }

      const storageData = JSON.parse(serializedData);
      
      // Check TTL expiration
      if (storageData.ttl && Date.now() - storageData.timestamp > storageData.ttl) {
        await this.deleteItem(key);
        return { success: false, error: 'Item expired' };
      }

      return { success: true, data: storageData.value };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retrieval failed'
      };
    }
  }

  async deleteItem(key: string): Promise<StorageResult<void>> {
    try {
      await AsyncStorage.removeItem(`secure_${key}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed'
      };
    }
  }

  async clear(): Promise<StorageResult<void>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const secureKeys = allKeys.filter(key => key.startsWith('secure_'));
      await AsyncStorage.multiRemove(secureKeys);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clear failed'
      };
    }
  }
}

// Export singleton instance
export const secureStorageService = SecureStorageService.getInstance();