import { createClient } from '@supabase/supabase-js';

class HealthService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.checks = new Map();
    this.isInitialized = false;
    
    // Start periodic checks after a short delay
    setTimeout(() => {
      if (!this.isInitialized) {
        this.startPeriodicChecks();
        this.isInitialized = true;
      }
    }, 5000);
  }

  async checkDatabase() {
    try {
      const startTime = Date.now();
      const { data, error } = await this.supabase
        .from('stories')
        .select('id')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        return { 
          status: 'unhealthy', 
          error: error.message,
          responseTime 
        };
      }
      
      return { 
        status: 'healthy', 
        error: null,
        responseTime,
        recordCount: data?.length || 0
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        responseTime: null
      };
    }
  }

  async checkExternalAPIs() {
    const checks = [];
    
    // Check Notion API if configured
    if (process.env.NOTION_TOKEN) {
      try {
        const startTime = Date.now();
        const response = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28'
          },
          timeout: 10000
        });
        
        const responseTime = Date.now() - startTime;
        
        checks.push({ 
          service: 'notion', 
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          statusCode: response.status
        });
      } catch (error) {
        checks.push({ 
          service: 'notion', 
          status: 'unhealthy', 
          error: error.message,
          responseTime: null
        });
      }
    }

    return checks;
  }

  async getFullHealthStatus() {
    const database = await this.checkDatabase();
    const external = await this.checkExternalAPIs();
    
    const overallStatus = database.status === 'healthy' ? 'healthy' : 'unhealthy';
    
    return {
      timestamp: new Date().toISOString(),
      overall: overallStatus,
      services: {
        database,
        external
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  startPeriodicChecks() {
    console.log('🏥 Health monitoring started');
    
    const checkInterval = setInterval(async () => {
      try {
        const health = await this.getFullHealthStatus();
        this.checks.set('latest', health);
        
        if (health.overall === 'unhealthy') {
          console.error('🚨 Health check failed:', {
            timestamp: health.timestamp,
            database: health.services.database.status,
            error: health.services.database.error
          });
          
          // Here you could trigger alerts, restart services, etc.
          // For development, we'll just log the issue
        } else {
          // Log healthy status every 5 minutes
          const now = new Date();
          if (now.getMinutes() % 5 === 0 && now.getSeconds() < 30) {
            console.log('💚 System healthy -', {
              uptime: Math.floor(health.system.uptime),
              memory: Math.round(health.system.memory.heapUsed / 1024 / 1024) + 'MB'
            });
          }
        }
      } catch (error) {
        console.error('❌ Health check error:', error.message);
      }
    }, 30000); // Check every 30 seconds

    // Store interval ID for cleanup
    this.checkInterval = checkInterval;
  }

  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🏥 Health monitoring stopped');
    }
  }

  getLatestCheck() {
    return this.checks.get('latest') || {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      message: 'Health check not yet performed'
    };
  }

  // Graceful shutdown
  shutdown() {
    this.stopPeriodicChecks();
  }
}

// Export singleton instance
const healthService = new HealthService();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  healthService.shutdown();
});

process.on('SIGINT', () => {
  healthService.shutdown();
});

export default healthService;