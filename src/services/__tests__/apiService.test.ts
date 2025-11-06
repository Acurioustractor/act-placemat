// Tests for API service

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiService, { APIError } from '../api';

// Mock URL constructor
class MockURL {
  url: string;
  
  constructor(url: string, base?: string) {
    this.url = base ? `${base}${url}` : url;
  }
  
  toString() {
    return this.url;
  }
  
  searchParams = {
    append: vi.fn()
  };
}

// Mock fetch
global.fetch = vi.fn();
global.URL = MockURL as unknown as typeof URL;

describe('ApiService', () => {
  let apiService: ApiService;
  
  beforeEach(() => {
    apiService = new ApiService('https://api.example.com');
    vi.resetAllMocks();
  });
  
  it('should make a GET request', async () => {
    const mockResponse = { data: 'test' };

    // Mock successful fetch response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });
    
    const result = await apiService.get('/test');
    
    // Verify fetch was called with correct arguments
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Verify result
    expect(result).toEqual(mockResponse);
  });
  
  it('should make a POST request', async () => {
    const mockResponse = { data: 'test' };
    const requestData = { foo: 'bar' };

    // Mock successful fetch response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });
    
    const result = await apiService.post('/test', requestData);
    
    // Verify fetch was called with correct arguments
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // Verify result
    expect(result).toEqual(mockResponse);
  });
  
  it('should handle API errors', async () => {
    const errorResponse = {
      message: 'Not found',
      details: { code: 404 }
    };

    // Mock error fetch response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => errorResponse
    });
    
    // Expect the request to throw an error
    await expect(apiService.get('/test')).rejects.toBeInstanceOf(APIError);
    await expect(apiService.get('/test')).rejects.toHaveProperty('status', 404);
    await expect(apiService.get('/test')).rejects.toHaveProperty('message', 'Not found');
  });
  
  it('should handle network errors', async () => {
    // Mock network error
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    
    // Expect the request to throw an error
    await expect(apiService.get('/test')).rejects.toHaveProperty('status', 500);
  });
  
  it('should retry failed requests', async () => {
    // Mock first attempt to fail, second to succeed
    const mockResponse = { data: 'test' };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
    
    const result = await apiService.retry(() => apiService.get('/test'), 3, 10);
    
    // Verify fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // Verify result
    expect(result).toEqual(mockResponse);
  });
});