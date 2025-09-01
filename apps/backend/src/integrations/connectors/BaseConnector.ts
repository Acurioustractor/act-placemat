/**
 * ACT Platform - Base Connector Class
 *
 * Provides a standardized base implementation for all integrations.
 * All connector classes should extend this base to ensure consistent
 * behavior across the platform.
 */

import type {
  ConnectorInterface,
  IntegrationStatus,
  ConnectionInfo,
  IntegrationError,
  IntegrationEvent,
  IntegrationEventType,
} from '../types/integrationTypes.js';

export abstract class BaseConnector implements ConnectorInterface {
  protected status: IntegrationStatus = 'inactive';
  protected connected: boolean = false;
  protected connectionInfo: Partial<ConnectionInfo> = {};
  protected lastError?: IntegrationError;
  protected events: IntegrationEvent[] = [];
  protected retryAttempts: number = 3;
  protected retryDelay: number = 1000;

  constructor(
    protected name: string,
    protected config: any = {}
  ) {
    this.connectionInfo = {
      status: this.status,
      ...this.config.connection,
    };
  }

  // Abstract methods that must be implemented by concrete classes
  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  // Optional disconnect method
  async disconnect(): Promise<void> {
    this.connected = false;
    this.status = 'inactive';
    this.connectionInfo.status = 'inactive';
    this.emitEvent('connection-lost', { reason: 'manual disconnect' });
  }

  // Status and connection info
  getStatus(): IntegrationStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      status: this.status,
      connectedAt: this.connectionInfo.connectedAt,
      lastActivity: this.connectionInfo.lastActivity,
      ...this.connectionInfo,
    } as ConnectionInfo;
  }

  // Error handling
  getLastError(): IntegrationError | undefined {
    return this.lastError;
  }

  protected setError(
    code: string,
    message: string,
    details?: any,
    retryable: boolean = true
  ): void {
    this.lastError = {
      code,
      message,
      details,
      timestamp: new Date(),
      integration: this.name,
      retryable,
    };

    this.status = 'error';
    this.emitEvent('error-occurred', { error: this.lastError });
  }

  protected clearError(): void {
    this.lastError = undefined;
    if (this.status === 'error') {
      this.status = this.connected ? 'active' : 'inactive';
    }
  }

  // Event system
  protected emitEvent(type: IntegrationEventType, details: any): void {
    const event: IntegrationEvent = {
      type,
      integration: this.name,
      timestamp: new Date(),
      details,
      severity: this.getSeverityForEvent(type),
    };

    this.events.push(event);

    // Keep only last 100 events to prevent memory leaks
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    // Log event if it's significant
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn(`[${this.name}] ${type}:`, details);
    }
  }

  private getSeverityForEvent(
    type: IntegrationEventType
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case 'connection-lost':
      case 'authentication-failed':
      case 'health-check-failed':
        return 'high';
      case 'error-occurred':
        return 'critical';
      case 'rate-limit-exceeded':
        return 'medium';
      case 'performance-threshold-exceeded':
        return 'medium';
      default:
        return 'low';
    }
  }

  getEvents(): IntegrationEvent[] {
    return [...this.events];
  }

  // Retry mechanism
  protected async retry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.retryAttempts) {
          this.setError(
            'RETRY_EXHAUSTED',
            `${context} failed after ${this.retryAttempts} attempts: ${lastError.message}`,
            { attempts: this.retryAttempts, lastError: lastError.message },
            false
          );
          throw error;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Lifecycle helpers
  protected async initializeConnection(): Promise<void> {
    try {
      this.status = 'active';
      this.connected = true;
      this.connectionInfo.connectedAt = new Date();
      this.connectionInfo.status = 'active';
      this.clearError();
      this.emitEvent('connection-established', { timestamp: new Date() });
    } catch (error) {
      this.status = 'error';
      this.connected = false;
      this.connectionInfo.status = 'error';
      throw error;
    }
  }

  protected updateLastActivity(): void {
    this.connectionInfo.lastActivity = new Date();
  }

  // Health check with automatic status update
  async performHealthCheck(): Promise<boolean> {
    try {
      const isHealthy = await this.healthCheck();

      if (!isHealthy) {
        this.status = 'unhealthy';
        this.emitEvent('health-check-failed', { timestamp: new Date() });
      } else if (this.status === 'unhealthy') {
        this.status = 'active';
      }

      return isHealthy;
    } catch (error) {
      this.setError(
        'HEALTH_CHECK_ERROR',
        `Health check failed: ${(error as Error).message}`,
        error
      );
      return false;
    }
  }

  // Configuration management
  getConfig(): any {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<any>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Validation helpers
  protected validateRequired(value: any, name: string): void {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${name} is required but was not provided`);
    }
  }

  protected validateUrl(url: string, name: string = 'URL'): void {
    try {
      new URL(url);
    } catch {
      throw new Error(`${name} is not a valid URL: ${url}`);
    }
  }

  protected validatePort(port: number, name: string = 'Port'): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`${name} must be a valid port number (1-65535): ${port}`);
    }
  }

  // String representation
  toString(): string {
    return `${this.constructor.name}(${this.name}, status=${this.status}, connected=${this.connected})`;
  }
}
