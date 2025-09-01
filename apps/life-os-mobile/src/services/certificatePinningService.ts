/**
 * Certificate Pinning Service for React Native
 * Implements SSL certificate pinning for secure API communications
 */

import { NetworkingModule } from 'react-native-ssl-pinning';

interface ApiConfig {
  baseUrl: string;
  certificateHash?: string;
  publicKeyHash?: string;
  timeout?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface PinnedResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

/**
 * Production API configuration with certificate pinning
 * Note: Replace these hashes with actual certificate/public key hashes from production
 */
const API_CONFIGS = {
  production: {
    baseUrl: 'https://api.act.place',
    // SHA-256 hash of the certificate (replace with actual hash)
    certificateHash: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    // Alternative: SHA-256 hash of the public key (replace with actual hash)
    publicKeyHash: 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    timeout: 30000,
  },
  staging: {
    baseUrl: 'https://staging-api.act.place',
    certificateHash: 'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
    timeout: 30000,
  },
  development: {
    baseUrl: 'http://localhost:4000',
    // No pinning for local development
    timeout: 10000,
  },
};

class CertificatePinningService {
  private config: ApiConfig;
  private defaultHeaders: Record<string, string>;

  constructor(environment: 'production' | 'staging' | 'development' = 'production') {
    this.config = API_CONFIGS[environment];
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'ACT-LifeOS-Mobile/1.0',
    };
  }

  /**
   * Set authentication token for all requests
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authentication token
   */
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Make a pinned HTTP request
   */
  async request(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<PinnedResponse> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
    } = options;

    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    try {
      // For development environment, use regular fetch without pinning
      if (this.config.baseUrl.includes('localhost')) {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        return {
          status: response.status,
          data,
          headers: Object.fromEntries(response.headers.entries()),
        };
      }

      // For production/staging, use certificate pinning
      const pinnedRequestConfig = {
        method,
        url,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        timeout,
        // Certificate pinning configuration
        sslPinning: {
          certs: this.config.certificateHash ? [this.config.certificateHash] : [],
          publicKeys: this.config.publicKeyHash ? [this.config.publicKeyHash] : [],
        },
      };

      const response = await NetworkingModule.fetch(url, pinnedRequestConfig);

      // Parse JSON response if content type is JSON
      let parsedData = response.data;
      const contentType =
        response.headers['content-type'] || response.headers['Content-Type'];

      if (contentType && contentType.includes('application/json')) {
        try {
          parsedData = JSON.parse(response.data);
        } catch (error) {
          console.warn('Failed to parse JSON response:', error);
        }
      }

      return {
        status: response.status,
        data: parsedData,
        headers: response.headers,
      };
    } catch (error: any) {
      // Handle certificate pinning failures specifically
      if (error.message?.includes('certificate') || error.message?.includes('SSL')) {
        console.error('🚨 Certificate Pinning Failure:', {
          endpoint,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        throw new Error(
          'Security: Certificate validation failed. This may indicate a man-in-the-middle attack.'
        );
      }

      // Handle network errors
      if (error.message?.includes('Network')) {
        throw new Error('Network error: Please check your connection and try again.');
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * GET request with certificate pinning
   */
  async get(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<PinnedResponse> {
    return this.request(endpoint, { method: 'GET', headers });
  }

  /**
   * POST request with certificate pinning
   */
  async post(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<PinnedResponse> {
    return this.request(endpoint, { method: 'POST', body: data, headers });
  }

  /**
   * PUT request with certificate pinning
   */
  async put(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<PinnedResponse> {
    return this.request(endpoint, { method: 'PUT', body: data, headers });
  }

  /**
   * DELETE request with certificate pinning
   */
  async delete(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<PinnedResponse> {
    return this.request(endpoint, { method: 'DELETE', headers });
  }

  /**
   * Test certificate pinning configuration
   */
  async testPinning(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      console.log('✅ Certificate pinning test successful:', response.status);
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ Certificate pinning test failed:', error.message);
      return false;
    }
  }

  /**
   * Get current API configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Update certificate hash (for certificate rotation)
   */
  updateCertificateHash(newHash: string): void {
    this.config.certificateHash = newHash;
    console.log('🔄 Certificate hash updated for security rotation');
  }

  /**
   * Update public key hash (for key rotation)
   */
  updatePublicKeyHash(newHash: string): void {
    this.config.publicKeyHash = newHash;
    console.log('🔄 Public key hash updated for security rotation');
  }
}

// Create singleton instances for different environments
export const productionApiService = new CertificatePinningService('production');
export const stagingApiService = new CertificatePinningService('staging');
export const developmentApiService = new CertificatePinningService('development');

// Default export for current environment
const currentEnvironment = __DEV__ ? 'development' : 'production';
export const apiService = new CertificatePinningService(currentEnvironment);

export default apiService;
