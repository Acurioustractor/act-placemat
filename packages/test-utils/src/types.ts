/**
 * Test Types for ACT Placemat
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  timezone: string;
  locale: string;
  currency: string;
}

export interface TestApiResponse<T = any> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    [key: string]: any;
  };
  success: boolean;
}

export interface TestApiError {
  error: {
    message: string;
    code: number;
    details: any;
    timestamp: string;
  };
  success: false;
}

export type MockFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

export interface TestEnvironment {
  [key: string]: string;
}