// Base API service for the ACT Placemat application

import { API_BASE_URL, ERROR_MESSAGES, CACHE_CONFIG } from '../constants';
import { APIError } from '../types';

/**
 * Base API service for handling HTTP requests
 */
class ApiService {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make a GET request
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @returns Promise with response data
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.defaultHeaders,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a POST request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @returns Promise with response data
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(data),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a PUT request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @returns Promise with response data
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.defaultHeaders,
        body: JSON.stringify(data),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a DELETE request
   * @param endpoint - API endpoint
   * @returns Promise with response data
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.defaultHeaders,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Build URL with query parameters
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @returns Full URL string
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Handle API response
   * @param response - Fetch Response object
   * @returns Parsed response data
   * @throws APIError if response is not ok
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      const apiError: APIError = {
        status: response.status,
        message: errorData.message || response.statusText || ERROR_MESSAGES.API_ERROR,
        details: errorData,
        timestamp: new Date(),
      };
      
      throw apiError;
    }
    
    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }
    
    return response.json();
  }

  /**
   * Handle API errors
   * @param error - Error object
   * @throws APIError with formatted error message
   */
  private handleError(error: any): never {
    console.error('API Error:', error);
    
    if (error.status && error.message && error.timestamp) {
      throw error;
    }
    
    const apiError: APIError = {
      status: error.status || 500,
      message: error.message || ERROR_MESSAGES.NETWORK_ERROR,
      details: error,
      timestamp: new Date(),
    };
    
    throw apiError;
  }

  /**
   * Retry a failed request
   * @param fn - Function to retry
   * @param retries - Number of retries
   * @param delay - Delay between retries in ms
   * @returns Promise with response data
   */
  async retry<T>(fn: () => Promise<T>, retries: number = CACHE_CONFIG.RETRY_ATTEMPTS, delay: number = CACHE_CONFIG.RETRY_DELAY): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      // Type assertion to avoid TypeScript errors with the recursive call
      return this.retry(fn, retries - 1, delay * 2) as Promise<T>;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for testing and extension
export default ApiService;