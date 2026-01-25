/**
 * Cultural Protocol Enforcer - Lifecycle Module
 *
 * Connection management and health checking.
 * Part of the Cultural Protocol Enforcer modular architecture.
 */

/**
 * Creates the lifecycle management module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Lifecycle methods
 */
export function createLifecycleModule(dependencies = {}) {
  const {
    name = 'Cultural Protocol Enforcer',
    producer = null,
    consumer = null,
    redis = null,
    supabase = null,
    openai = null,
    sacredProtocols = {},
    sovereigntyFramework = {},
    traumaProtocols = {},
    consentFramework = {},
    culturalAdvisors = new Map(),
    violationTracking = new Map(),
    encryptionKeys = {}
  } = dependencies;

  /**
   * Connects to required services
   * @returns {Promise<void>}
   */
  async function connect() {
    if (producer) {
      await producer.connect();
    }
    if (consumer) {
      await consumer.connect();
    }
    console.log('🛡️ Cultural Protocol Enforcer connected to Kafka');
  }

  /**
   * Disconnects from all services
   * @returns {Promise<void>}
   */
  async function disconnect() {
    if (producer) {
      await producer.disconnect();
    }
    if (consumer) {
      await consumer.disconnect();
    }
    if (redis) {
      await redis.quit();
    }
    console.log('🛡️ Cultural Protocol Enforcer disconnected');
  }

  /**
   * Performs a health check
   * @returns {Object} Health status
   */
  async function healthCheck() {
    return {
      name,
      status: 'healthy',
      supabase_connected: Boolean(supabase),
      openai_configured: Boolean(openai),
      protocols_loaded: {
        sacred_protocols: Object.keys(sacredProtocols).length,
        sovereignty_framework: Object.keys(sovereigntyFramework).length,
        trauma_protocols: Object.keys(traumaProtocols).length,
        consent_framework: Object.keys(consentFramework).length
      },
      cultural_advisors: culturalAdvisors.size,
      violation_tracking: violationTracking.size,
      encryption_keys_initialized: Object.keys(encryptionKeys).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Performs a readiness check
   * @returns {Promise<Object>} Readiness status
   */
  async function readinessCheck() {
    const checks = {
      kafka: false,
      supabase: false,
      redis: false
    };

    try {
      if (producer) {
        await producer.send({
          topic: 'health-check',
          messages: [{ key: 'health', value: JSON.stringify({ service: name }) }]
        });
        checks.kafka = true;
      }
    } catch (error) {
      console.warn('Kafka readiness check failed:', error.message);
    }

    try {
      if (supabase) {
        checks.supabase = true;
      }
    } catch (error) {
      console.warn('Supabase readiness check failed:', error.message);
    }

    try {
      if (redis) {
        await redis.ping();
        checks.redis = true;
      }
    } catch (error) {
      console.warn('Redis readiness check failed:', error.message);
    }

    const allReady = Object.values(checks).every(v => v);

    return {
      ready: allReady,
      checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets service statistics
   * @returns {Promise<Object>} Service statistics
   */
  async function getStats() {
    return {
      name,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      protocols: {
        sacred: Boolean(sacredProtocols),
        sovereignty: Boolean(sovereigntyFramework),
        trauma: Boolean(traumaProtocols),
        consent: Boolean(consentFramework)
      },
      tracking: {
        cultural_advisors: culturalAdvisors.size,
        violations_tracked: violationTracking.size
      }
    };
  }

  /**
   * Graceful shutdown handler
   * @param {Function} signalHandler - Optional signal handler
   * @returns {Function} Shutdown function
   */
  function setupGracefulShutdown(signalHandler) {
    const shutdown = async (signal) => {
      console.log(`🛡️ Cultural Protocol Enforcer received ${signal}, shutting down gracefully...`);

      try {
        await disconnect();
        console.log('🛡️ Cultural Protocol Enforcer shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    if (signalHandler) {
      signalHandler();
    }

    return shutdown;
  }

  /**
   * Initializes monitoring
   * @param {Object} options - Monitoring options
   * @returns {Object} Monitoring interval references
   */
  function initializeMonitoring(options = {}) {
    const interval = options.healthCheckInterval || 30000;
    const intervals = {};

    intervals.healthCheck = setInterval(async () => {
      const health = await healthCheck();
      if (health.status !== 'healthy') {
        console.warn('Cultural Protocol Enforcer health check failed:', health);
      }
    }, interval);

    return intervals;
  }

  /**
   * Stops monitoring intervals
   * @param {Object} intervals - Monitoring intervals to stop
   */
  function stopMonitoring(intervals) {
    for (const [key, interval] of Object.entries(intervals)) {
      clearInterval(interval);
    }
  }

  /**
   * Registers a cultural advisor
   * @param {string} advisorId - Advisor ID
   * @param {Object} advisorData - Advisor information
   */
  function registerCulturalAdvisor(advisorId, advisorData) {
    culturalAdvisors.set(advisorId, {
      ...advisorData,
      registered_at: new Date().toISOString(),
      status: 'active'
    });
  }

  /**
   * Gets registered cultural advisors
   * @returns {Array} List of advisors
   */
  function getCulturalAdvisors() {
    return Array.from(culturalAdvisors.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  /**
   * Tracks a violation pattern
   * @param {string} patternId - Pattern ID
   * @param {Object} violationData - Violation information
   */
  function trackViolationPattern(patternId, violationData) {
    violationTracking.set(patternId, {
      ...violationData,
      tracked_at: new Date().toISOString(),
      count: (violationTracking.get(patternId)?.count || 0) + 1
    });
  }

  /**
   * Gets tracked violation patterns
   * @returns {Array} List of patterns
   */
  function getViolationPatterns() {
    return Array.from(violationTracking.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  return {
    connect,
    disconnect,
    healthCheck,
    readinessCheck,
    getStats,
    setupGracefulShutdown,
    initializeMonitoring,
    stopMonitoring,
    registerCulturalAdvisor,
    getCulturalAdvisors,
    trackViolationPattern,
    getViolationPatterns
  };
}

export default {
  createLifecycleModule
};
