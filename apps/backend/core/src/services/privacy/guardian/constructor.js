/**
 * Privacy Guardian - Constructor Module
 *
 * Handles initialization of core connections and dependencies.
 * Part of the Privacy Guardian modular architecture.
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

/**
 * PrivacyGuardian constructor logic
 * @param {Object} config - Configuration options
 */
export function createGuardianConstructor(config = {}) {
  const instance = {
    name: 'Privacy Guardian',

    /**
     * Initialize Kafka connection
     * @param {Object} options - Kafka options
     * @returns {Object} Kafka producer and consumer
     */
    initKafka(options = {}) {
      const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
      const kafka = new Kafka({
        clientId: options.clientId || 'act-privacy-guardian',
        brokers
      });

      return {
        kafka,
        producer: kafka.producer(),
        consumer: kafka.consumer({ groupId: options.groupId || 'privacy-guardian-group' })
      };
    },

    /**
     * Initialize Supabase client for audit logging
     * @returns {Object} Supabase client
     */
    initSupabase() {
      return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    },

    /**
     * Initialize lazy Redis connection
     * @returns {Object} Redis getter function
     */
    initRedis() {
      let _redis = null;

      const getRedis = () => {
        if (!_redis && process.env.REDIS_URL) {
          _redis = new Redis(process.env.REDIS_URL);
          _redis.on('error', (err) => {
            console.warn('[PrivacyGuardian] Redis error (non-fatal):', err.message);
          });
        }
        return _redis;
      };

      return { getRedis, redis: { get: getRedis } };
    }
  };

  return instance;
}

/**
 * Creates a complete PrivacyGuardian instance with constructor logic
 * @param {Object} frameworkModules - Framework initialization modules
 * @returns {Object} Partial PrivacyGuardian with constructor properties
 */
export function initializeGuardianInstance(frameworkModules = {}) {
  const kafka = new Kafka({
    clientId: 'act-privacy-guardian',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
  });

  return {
    name: 'Privacy Guardian',

    // Kafka connections
    producer: kafka.producer(),
    consumer: kafka.consumer({ groupId: 'privacy-guardian-group' }),

    // Lazy Redis
    _redis: null,

    // Supabase client
    supabase: createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),

    // Framework initializations
    privacyFramework: frameworkModules.privacyFramework || {},
    consentManagement: frameworkModules.consentManagement || {},
    sovereigntyProtocols: frameworkModules.sovereigntyProtocols || {},
    encryptionSystem: frameworkModules.encryptionSystem || {},
    privacyMonitoring: frameworkModules.privacyMonitoring || {},
    retentionPolicies: frameworkModules.retentionPolicies || {},
    governanceStructure: frameworkModules.governanceStructure || {}
  };
}

export default {
  createGuardianConstructor,
  initializeGuardianInstance
};
