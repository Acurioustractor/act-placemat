// Base API service for handling HTTP requests

import { API_BASE_URL, ERROR_MESSAGES, CACHE_CONFIG } from '../constants';
import { APIError } from '../types';

/**
 * Base API service for handling HTTP requests with error handling and retry logic.
 * Provides methods for common HTTP operations (GET, POST, PUT, DELETE) with consistent error handling.
 */
class ApiService {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  /**
   * Creates a new ApiService instance.
   *
   * @param {string} [baseUrl=API_BASE_URL] - The base URL for all API requests
   */
  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Makes a GET request to the specified endpoint.
   * Automatically handles query parameters and error responses.
   *
   * @template T - The expected response data type
   * @param {string} endpoint - API endpoint path (relative or absolute URL)
   * @param {Record<string, unknown>} [params] - Optional query parameters to append to the URL
   * @returns {Promise<T>} Promise resolving to the parsed response data
   * @throws {APIError} If the request fails with error status or network issues
   * @example
   * const projects = await apiService.get<Project[]>('/api/projects', { status: 'active' });
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
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
   * Makes a POST request to the specified endpoint.
   * Automatically serializes request body as JSON and handles error responses.
   *
   * @template T - The expected response data type
   * @param {string} endpoint - API endpoint path (relative or absolute URL)
   * @param {unknown} data - Request body data to be JSON-serialized
   * @returns {Promise<T>} Promise resolving to the parsed response data
   * @throws {APIError} If the request fails with error status or network issues
   * @example
   * const newProject = await apiService.post<Project>('/api/projects', {
   *   name: 'New Project',
   *   status: 'active'
   * });
   */
  async post<T>(endpoint: string, data: unknown): Promise<T> {
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
   * Makes a PUT request to the specified endpoint.
   * Automatically serializes request body as JSON and handles error responses.
   *
   * @template T - The expected response data type
   * @param {string} endpoint - API endpoint path (relative or absolute URL)
   * @param {unknown} data - Request body data to be JSON-serialized
   * @returns {Promise<T>} Promise resolving to the parsed response data
   * @throws {APIError} If the request fails with error status or network issues
   * @example
   * const updatedProject = await apiService.put<Project>('/api/projects/123', {
   *   status: 'completed'
   * });
   */
  async put<T>(endpoint: string, data: unknown): Promise<T> {
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
   * Makes a DELETE request to the specified endpoint.
   * Handles error responses and empty 204 responses gracefully.
   *
   * @template T - The expected response data type
   * @param {string} endpoint - API endpoint path (relative or absolute URL)
   * @returns {Promise<T>} Promise resolving to the parsed response data (or empty object for 204)
   * @throws {APIError} If the request fails with error status or network issues
   * @example
   * await apiService.delete('/api/projects/123');
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
   * Constructs a full URL from an endpoint and query parameters.
   * Handles both relative paths and absolute URLs correctly.
   *
   * @private
   * @param {string} endpoint - API endpoint path (relative or absolute URL)
   * @param {Record<string, unknown>} [params] - Optional query parameters to append
   * @returns {string} The complete URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    // Handle full URLs (starting with http:// or https://) vs relative paths
    let url: URL;
    
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      // It's already a full URL, use it directly
      url = new URL(endpoint);
    } else {
      // It's a relative path, construct with base URL
      url = new URL(endpoint, this.baseUrl);
    }
    
    // Debug logging
    console.log(`🔧 URL Construction Debug:`, {
      endpoint,
      isFullUrl: endpoint.startsWith('http'),
      baseUrl: this.baseUrl,
      constructedUrl: url.toString()
    });
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const finalUrl = url.toString();
    console.log(`🎯 Final URL: ${finalUrl}`);
    return finalUrl;
  }

  /**
   * Processes API responses and handles various status codes.
   * Parses JSON responses and throws formatted errors for non-OK status codes.
   *
   * @private
   * @template T - The expected response data type
   * @param {Response} response - The Fetch API Response object to process
   * @returns {Promise<T>} Promise resolving to the parsed response data
   * @throws {APIError} If the response has a non-OK status (400-599)
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new APIError(
        response.status,
        errorData.message || response.statusText || ERROR_MESSAGES.API_ERROR,
        errorData
      );
    }
    
    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }
    
    return response.json();
  }

  /**
   * Handles and formats errors from API requests.
   * Converts various error types into standardized APIError instances.
   *
   * @private
   * @param {unknown} error - The error object to handle
   * @throws {APIError} Always throws with formatted error information
   */
  private handleError(error: unknown): never {
    console.error('API Error:', error);

    if (error instanceof APIError) {
      throw error;
    }

    const errorObj = error as { status?: number; message?: string };
    throw new APIError(
      errorObj.status || 500,
      errorObj.message || ERROR_MESSAGES.NETWORK_ERROR,
      { error }
    );
  }

  /**
   * Retries a failed request with exponential backoff.
   * Useful for handling transient network failures.
   *
   * @template T - The expected response data type
   * @param {() => Promise<T>} fn - The function to retry
   * @param {number} [retries=CACHE_CONFIG.RETRY_ATTEMPTS] - Maximum number of retry attempts
   * @param {number} [delay=CACHE_CONFIG.RETRY_DELAY] - Initial delay between retries in milliseconds (doubles on each retry)
   * @returns {Promise<T>} Promise resolving to the result of the function
   * @throws {Error} Throws the last error if all retries are exhausted
   * @example
   * const data = await apiService.retry(
   *   () => apiService.get<Project[]>('/api/projects'),
   *   3,
   *   1000
   * );
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