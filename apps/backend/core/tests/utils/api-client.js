/**
 * API Test Client
 *
 * Utilities for making HTTP requests to API endpoints in tests
 */

/**
 * Creates a mock Express request object
 * @param {Object} options - Request options
 * @returns {Object} Mock request
 */
export function createMockRequest(options = {}) {
  const {
    method = 'GET',
    url = '/',
    path = '/',
    params = {},
    query = {},
    body = {},
    headers = {},
    cookies = {},
  } = options;

  return {
    method,
    url,
    path,
    params,
    query,
    body,
    headers,
    cookies,
    get: (name) => headers[name.toLowerCase()] || headers[name],
  };
}

/**
 * Creates a mock Express response object
 * @returns {Object} Mock response with vi.fn spies
 */
export function createMockResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    locals: {},
  };

  return response;
}

/**
 * Creates a mock Express next function
 * @returns {Function} Mock next function
 */
export function createMockNext() {
  return vi.fn();
}

/**
 * Creates mock request and response for route testing
 * @param {Object} options - Request options
 * @returns {Object} { req, res, next }
 */
export function createMockRouteContext(options = {}) {
  const req = createMockRequest(options);
  const res = createMockResponse();
  const next = createMockNext();
  return { req, res, next };
}

/**
 * Test client for making HTTP requests to the Express app
 * Useful for integration tests with a running server
 */
export class TestApiClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set authorization header
   * @param {string} token - JWT or auth token
   */
  setAuth(token) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Make a GET request
   * @param {string} path - Endpoint path
   * @param {Object} options - Request options
   */
  async get(path, options = {}) {
    return this.request('GET', path, options);
  }

  /**
   * Make a POST request
   * @param {string} path - Endpoint path
   * @param {Object} options - Request options
   */
  async post(path, options = {}) {
    return this.request('POST', path, options);
  }

  /**
   * Make a PATCH request
   * @param {string} path - Endpoint path
   * @param {Object} options - Request options
   */
  async patch(path, options = {}) {
    return this.request('PATCH', path, options);
  }

  /**
   * Make a PUT request
   * @param {string} path - Endpoint path
   * @param {Object} options - Request options
   */
  async put(path, options = {}) {
    return this.request('PUT', path, options);
  }

  /**
   * Make a DELETE request
   * @param {string} path - Endpoint path
   * @param {Object} options - Request options
   */
  async delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }

  /**
   * Core request method
   * @param {string} method - HTTP method
   * @param {string} path - Endpoint path
   * @param {Object} options - Request options
   */
  async request(method, path, options = {}) {
    const { query, body, headers = {} } = options;

    const url = new URL(path, this.baseUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    };
  }
}
