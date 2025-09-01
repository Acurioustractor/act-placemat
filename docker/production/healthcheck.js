#!/usr/bin/env node

/**
 * ACT Platform - Production Health Check
 * Comprehensive health monitoring for Docker containers
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class HealthChecker {
  constructor() {
    this.baseUrl =
      process.env.HEALTH_CHECK_URL || `http://localhost:${process.env.PORT || 3000}`;
    this.timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000');
    this.retries = parseInt(process.env.HEALTH_CHECK_RETRIES || '3');
    this.isDaemon = process.argv.includes('--daemon');

    this.checks = [
      { name: 'api', path: '/api/health', critical: true },
      { name: 'database', path: '/api/health/database', critical: true },
      { name: 'redis', path: '/api/health/redis', critical: false },
      { name: 'compliance', path: '/api/compliance/health', critical: true },
      { name: 'metrics', path: '/metrics', critical: false },
    ];
  }

  async runHealthCheck() {
    const timestamp = new Date().toISOString();
    console.log(`🔍 Health check started at ${timestamp}`);

    const results = {
      timestamp,
      overall: 'healthy',
      checks: {},
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'unknown',
    };

    let criticalFailures = 0;
    let totalFailures = 0;

    for (const check of this.checks) {
      try {
        const result = await this.performCheck(check);
        results.checks[check.name] = result;

        if (!result.healthy) {
          totalFailures++;
          if (check.critical) {
            criticalFailures++;
          }
        }
      } catch (error) {
        results.checks[check.name] = {
          healthy: false,
          error: error.message,
          critical: check.critical,
          timestamp: new Date().toISOString(),
        };

        totalFailures++;
        if (check.critical) {
          criticalFailures++;
        }
      }
    }

    // Determine overall health status
    if (criticalFailures > 0) {
      results.overall = 'critical';
    } else if (totalFailures > 0) {
      results.overall = 'degraded';
    } else {
      results.overall = 'healthy';
    }

    if (!this.isDaemon) {
      this.printHealthStatus(results);
    }

    return results;
  }

  async performCheck(check) {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(check.path);
      const duration = Date.now() - startTime;

      const healthy = response.statusCode >= 200 && response.statusCode < 400;

      return {
        healthy,
        statusCode: response.statusCode,
        responseTime: duration,
        critical: check.critical,
        timestamp: new Date().toISOString(),
        details: response.body ? JSON.parse(response.body) : null,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        healthy: false,
        error: error.message,
        responseTime: duration,
        critical: check.critical,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: this.timeout,
        headers: {
          'User-Agent': 'ACT-Platform-HealthCheck/1.0',
          Accept: 'application/json',
        },
      };

      const req = httpModule.request(options, res => {
        let body = '';

        res.on('data', chunk => {
          body += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', error => {
        reject(error);
      });

      req.end();
    });
  }

  printHealthStatus(results) {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 ACT Platform Health Check Results');
    console.log('='.repeat(60));
    console.log(
      `Overall Status: ${this.getStatusEmoji(results.overall)} ${results.overall.toUpperCase()}`
    );
    console.log(`Uptime: ${Math.floor(results.uptime)}s`);
    console.log(`Memory Usage: ${Math.round(results.memory.rss / 1024 / 1024)}MB`);
    console.log(`Environment: ${results.environment}`);
    console.log('');

    // Individual check results
    for (const [name, result] of Object.entries(results.checks)) {
      const status = result.healthy ? '✅' : result.critical ? '❌' : '⚠️ ';
      const criticalLabel = result.critical ? ' (CRITICAL)' : '';

      console.log(
        `${status} ${name.padEnd(12)} ${result.responseTime}ms${criticalLabel}`
      );

      if (!result.healthy && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    console.log('='.repeat(60));
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️ ';
      case 'critical':
        return '❌';
      default:
        return '❓';
    }
  }

  async runDaemon() {
    console.log('🔄 Starting health check daemon...');

    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'); // 30 seconds

    setInterval(async () => {
      try {
        const results = await this.runHealthCheck();

        // Log only if there are issues
        if (results.overall !== 'healthy') {
          console.log(`⚠️  Health status: ${results.overall}`);

          const failedChecks = Object.entries(results.checks)
            .filter(([, result]) => !result.healthy)
            .map(([name, result]) => `${name}: ${result.error || 'failed'}`);

          if (failedChecks.length > 0) {
            console.log(`   Failed checks: ${failedChecks.join(', ')}`);
          }
        }
      } catch (error) {
        console.error('❌ Health check daemon error:', error);
      }
    }, interval);

    // Keep daemon alive
    process.on('SIGTERM', () => {
      console.log('🛑 Health check daemon shutting down...');
      process.exit(0);
    });
  }

  async retryCheck() {
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const results = await this.runHealthCheck();

        // Exit with appropriate code
        if (results.overall === 'healthy') {
          process.exit(0);
        } else if (results.overall === 'degraded') {
          process.exit(1);
        } else {
          process.exit(2);
        }
      } catch (error) {
        console.error(`Health check attempt ${attempt} failed:`, error.message);

        if (attempt < this.retries) {
          const delay = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error('❌ All health check attempts failed');
    process.exit(3);
  }
}

// CLI interface
async function main() {
  const healthChecker = new HealthChecker();

  if (healthChecker.isDaemon) {
    await healthChecker.runDaemon();
  } else {
    await healthChecker.retryCheck();
  }
}

// Handle uncaught errors
process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception in health checker:', error);
  process.exit(4);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled rejection in health checker:', error);
  process.exit(5);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Health check failed:', error);
    process.exit(6);
  });
}

module.exports = { HealthChecker };
