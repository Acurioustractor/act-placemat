/**
 * Contact Intelligence Metrics Module
 *
 * Tracks service performance metrics and health indicators
 * for the contact intelligence service.
 *
 * @module contacts/metrics
 */

/**
 * Metrics collector for contact intelligence service
 */
export class ContactMetrics {
  constructor() {
    this.metrics = {
      total_enrichments: 0,
      successful_enrichments: 0,
      average_processing_time: 0,
      ai_calls_made: 0,
      intelligence_cache_hits: 0
    };
  }

  /**
   * Get service metrics and health
   * @returns {Object} Current metrics and health status
   */
  getServiceMetrics(intelligenceCache, enrichmentQueue, isProcessingQueue) {
    return {
      ...this.metrics,
      cache_size: intelligenceCache.size,
      queue_length: enrichmentQueue.length,
      is_processing: isProcessingQueue,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };
  }

  /**
   * Record a successful enrichment
   */
  recordSuccessfulEnrichment() {
    this.metrics.successful_enrichments++;
    this.metrics.total_enrichments++;
  }

  /**
   * Record an AI call
   */
  recordAICall() {
    this.metrics.ai_calls_made++;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit() {
    this.metrics.intelligence_cache_hits++;
  }

  /**
   * Update average processing time
   * @param {number} duration - Duration in milliseconds
   */
  updateProcessingTime(duration) {
    const current = this.metrics.average_processing_time;
    const count = this.metrics.successful_enrichments;
    this.metrics.average_processing_time = ((current * (count - 1)) + duration) / count;
  }
}

export default ContactMetrics;
