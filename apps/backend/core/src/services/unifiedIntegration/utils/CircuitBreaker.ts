/**
 * Circuit Breaker Pattern for UnifiedIntegrationService
 * Provides fault tolerance and prevents cascade failures across service integrations
 */

import { IntegrationLogger } from './Logger.js';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time in ms before trying to close circuit
  monitoringWindow: number; // Time window for failure counting in ms
  halfOpenMaxCalls: number; // Max calls allowed in half-open state
  healthCheckInterval: number; // Health check interval in ms
}

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject all calls
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  stateChangedAt: number;
  healthCheckStatus: 'healthy' | 'unhealthy' | 'unknown';
}

export interface HealthChecker {
  (): Promise<boolean>;
}

export class CircuitBreaker {
  private readonly logger: IntegrationLogger;
  private readonly serviceName: string;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalCalls: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private stateChangedAt: number = Date.now();
  private halfOpenCallCount: number = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  private healthCheckStatus: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';

  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringWindow: 120000, // 2 minutes
    halfOpenMaxCalls: 3,
    healthCheckInterval: 30000 // 30 seconds
  };

  constructor(
    serviceName: string,
    private readonly config: Partial<CircuitBreakerConfig> = {},
    private readonly healthChecker?: HealthChecker
  ) {
    this.serviceName = serviceName;
    this.config = { ...this.defaultConfig, ...config };
    this.logger = IntegrationLogger.getInstance();

    this.logger.info('Circuit breaker initialized', {
      serviceName,
      config: this.config
    });

    // Start health checking if provided
    if (this.healthChecker) {
      this.startHealthChecking();
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const correlationId = this.logger.generateCorrelationId();

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw this.createCircuitOpenError();
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls!) {
        throw this.createCircuitOpenError();
      }
      this.halfOpenCallCount++;
    }

    this.totalCalls++;

    try {
      const result = await operation();
      this.onSuccess(correlationId);
      return result;
    } catch (error) {
      this.onFailure(error, correlationId);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(correlationId: string): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    this.logger.debug('Circuit breaker operation succeeded', {
      serviceName: this.serviceName,
      state: this.state,
      successCount: this.successCount,
      correlationId
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed();
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: any, correlationId: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    this.logger.warn('Circuit breaker operation failed', {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      error: error.message,
      correlationId
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      if (this.shouldOpen()) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Check if circuit should open based on failure threshold
   */
  private shouldOpen(): boolean {
    const recentFailures = this.getRecentFailureCount();
    return recentFailures >= this.config.failureThreshold!;
  }

  /**
   * Get count of failures within monitoring window
   */
  private getRecentFailureCount(): number {
    if (!this.lastFailureTime) return 0;

    const now = Date.now();
    const windowStart = now - this.config.monitoringWindow!;

    // For simplicity, we'll use total failure count
    // In production, you'd want a sliding window implementation
    return this.lastFailureTime >= windowStart ? this.failureCount : 0;
  }

  /**
   * Check if we should attempt to reset from open state
   */
  private shouldAttemptReset(): boolean {
    const timeSinceStateChange = Date.now() - this.stateChangedAt;
    return timeSinceStateChange >= this.config.resetTimeout!;
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.stateChangedAt = Date.now();
    this.failureCount = 0;
    this.halfOpenCallCount = 0;

    this.logger.info('Circuit breaker transitioned to CLOSED', {
      serviceName: this.serviceName,
      successCount: this.successCount
    });
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.stateChangedAt = Date.now();
    this.halfOpenCallCount = 0;

    this.logger.error('Circuit breaker transitioned to OPEN', {
      serviceName: this.serviceName,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.stateChangedAt = Date.now();
    this.halfOpenCallCount = 0;

    this.logger.info('Circuit breaker transitioned to HALF_OPEN', {
      serviceName: this.serviceName,
      timeSinceOpen: Date.now() - this.stateChangedAt
    });
  }

  /**
   * Create circuit open error
   */
  private createCircuitOpenError(): Error {
    return new Error(
      `Circuit breaker is OPEN for service ${this.serviceName}. ` +
      `Last failure: ${this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : 'unknown'}`
    );
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    if (!this.healthChecker) return;

    this.healthCheckTimer = setInterval(async () => {
      try {
        const isHealthy = await this.healthChecker!();
        this.healthCheckStatus = isHealthy ? 'healthy' : 'unhealthy';

        this.logger.debug('Health check completed', {
          serviceName: this.serviceName,
          status: this.healthCheckStatus,
          circuitState: this.state
        });

        // If service is healthy and circuit is open, consider transitioning
        if (isHealthy && this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
          this.transitionToHalfOpen();
        }

      } catch (error) {
        this.healthCheckStatus = 'unhealthy';
        this.logger.warn('Health check failed', {
          serviceName: this.serviceName,
          error: error.message
        });
      }
    }, this.config.healthCheckInterval!);
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      healthCheckStatus: this.healthCheckStatus
    };
  }

  /**
   * Get failure rate (0-1)
   */
  getFailureRate(): number {
    if (this.totalCalls === 0) return 0;
    return this.failureCount / this.totalCalls;
  }

  /**
   * Get success rate (0-1)
   */
  getSuccessRate(): number {
    if (this.totalCalls === 0) return 0;
    return this.successCount / this.totalCalls;
  }

  /**
   * Check if circuit is currently allowing calls
   */
  isCallAllowed(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.OPEN) return this.shouldAttemptReset();
    if (this.state === CircuitState.HALF_OPEN) {
      return this.halfOpenCallCount < this.config.halfOpenMaxCalls!;
    }
    return false;
  }

  /**
   * Force circuit to specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    const oldState = this.state;
    this.state = state;
    this.stateChangedAt = Date.now();

    if (state === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.halfOpenCallCount = 0;
    } else if (state === CircuitState.HALF_OPEN) {
      this.halfOpenCallCount = 0;
    }

    this.logger.warn('Circuit breaker state forced', {
      serviceName: this.serviceName,
      oldState,
      newState: state
    });
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.stateChangedAt = Date.now();
    this.halfOpenCallCount = 0;
    this.healthCheckStatus = 'unknown';

    this.logger.info('Circuit breaker reset', {
      serviceName: this.serviceName
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.info('Circuit breaker configuration updated', {
      serviceName: this.serviceName,
      config: this.config
    });

    // Restart health checking if interval changed
    if (newConfig.healthCheckInterval && this.healthChecker) {
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }
      this.startHealthChecking();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    this.logger.info('Circuit breaker destroyed', {
      serviceName: this.serviceName
    });
  }
}