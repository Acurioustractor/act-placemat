/**
 * Health check for ACT Farmhand Worker
 * Used by Docker healthcheck
 */

import Redis from 'ioredis';

async function healthCheck() {
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryDelayOnFailover: 100
    });
    
    // Check if worker health data is recent (within last 10 minutes)
    const healthData = await redis.get('farmhand:health');
    
    if (!healthData) {
      console.error('No health data found');
      process.exit(1);
    }
    
    const health = JSON.parse(healthData);
    const lastUpdate = new Date(health.timestamp);
    const now = new Date();
    const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
    
    if (minutesSinceUpdate > 10) {
      console.error(`Health data is stale (${minutesSinceUpdate.toFixed(1)} minutes old)`);
      process.exit(1);
    }
    
    // Check if critical services are healthy
    const criticalServices = ['kafka', 'redis', 'supabase'];
    const unhealthyServices = criticalServices.filter(
      service => health[service]?.status === 'unhealthy'
    );
    
    if (unhealthyServices.length > 0) {
      console.error(`Critical services unhealthy: ${unhealthyServices.join(', ')}`);
      process.exit(1);
    }
    
    await redis.quit();
    console.log('✅ ACT Farmhand Worker is healthy');
    process.exit(0);
    
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

healthCheck();