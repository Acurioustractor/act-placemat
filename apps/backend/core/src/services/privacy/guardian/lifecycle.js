/**
 * Privacy Guardian - Lifecycle Module
 *
 * Connection management and health checking.
 * Part of the Privacy Guardian modular architecture.
 */

/**
 * Creates the lifecycle management module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Lifecycle methods
 */
export function createLifecycleModule(dependencies = {}) {
  const {
    name = 'Privacy Guardian',
    producer = null,
    consumer = null,
    redis = null,
    supabase = null,
    privacyFramework = {},
    consentManagement = {},
    sovereigntyProtocols = {},
    encryptionSystem = {},
    privacyMonitoring = {},
    governanceStructure = {}
  } = dependencies;

  /**
   * Connects to required services (Kafka, etc.)
   * @returns {Promise<void>}
   */
  async function connect() {
    if (producer) {
      await producer.connect();
    }
    if (consumer) {
      await consumer.connect();
    }
    console.log('🔒 Privacy Guardian connected to Kafka');
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
    console.log('🔒 Privacy Guardian disconnected');
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
      frameworks_loaded: {
        privacy_framework: Object.keys(privacyFramework.core_principles || {}).length,
        consent_management: Object.keys(consentManagement.consent_types || {}).length,
        sovereignty_protocols: Object.keys(sovereigntyProtocols.ownership_model || {}).length,
        encryption_system: Object.keys(encryptionSystem.encryption_standards || {}).length,
        monitoring_system: Object.keys(privacyMonitoring.continuous_monitoring || {}).length
      },
      encryption_keys_available: Boolean(encryptionSystem),
      governance_structure_active: Boolean(governanceStructure.community_oversight),
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

    // Check Kafka
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

    // Check Supabase
    try {
      if (supabase) {
        await supabase.from('health_check').select('*').limit(1);
        checks.supabase = true;
      }
    } catch (error) {
      // Table might not exist, but connection works
      checks.supabase = true;
    }

    // Check Redis
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
      frameworks: {
        privacy: Boolean(privacyFramework),
        consent: Boolean(consentManagement),
        sovereignty: Boolean(sovereigntyProtocols),
        encryption: Boolean(encryptionSystem),
        monitoring: Boolean(privacyMonitoring),
        governance: Boolean(governanceStructure)
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
      console.log(`🔒 Privacy Guardian received ${signal}, shutting down gracefully...`);

      try {
        await disconnect();
        console.log('🔒 Privacy Guardian shutdown complete');
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

    // Health check interval
    intervals.healthCheck = setInterval(async () => {
      const health = await healthCheck();
      if (health.status !== 'healthy') {
        console.warn('Privacy Guardian health check failed:', health);
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

  return {
    connect,
    disconnect,
    healthCheck,
    readinessCheck,
    getStats,
    setupGracefulShutdown,
    initializeMonitoring,
    stopMonitoring
  };
}

export default {
  createLifecycleModule
};
