/**
 * PM2 Ecosystem Configuration
 * Production deployment configuration for ACT Perfect System
 */

module.exports = {
  apps: [
    {
      // Backend API Server
      name: 'act-backend',
      script: './apps/backend/start-enhanced.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '2G',
      
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        HOST: '0.0.0.0'
      },
      
      // Logging
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      
      // Restart policy
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      merge_logs: true,
      
      // Advanced features
      post_update: ['npm install'],
      
      // Health check
      health_check: {
        interval: 30000,
        url: 'http://localhost:4000/health',
        max_consecutive_failures: 3
      }
    },
    
    {
      // Frontend Static Server
      name: 'act-frontend',
      script: 'serve',
      args: '-s apps/frontend/dist -l 5173',
      watch: false,
      
      env: {
        NODE_ENV: 'production'
      },
      
      // Logging
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      
      // Restart policy
      autorestart: true,
      max_restarts: 10
    },
    
    {
      // Background Worker for Scheduled Tasks
      name: 'act-worker',
      script: './apps/backend/src/workers/backgroundWorker.js',
      instances: 1,
      watch: false,
      
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'scheduler'
      },
      
      // Logging
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      
      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s'
    },
    
    {
      // Redis Cache Server (optional)
      name: 'act-redis',
      script: 'redis-server',
      args: '--port 6379 --appendonly yes',
      watch: false,
      
      // Logging
      error_file: './logs/redis-error.log',
      out_file: './logs/redis-out.log',
      
      // Restart policy
      autorestart: true,
      max_restarts: 5
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:act/perfect-system.git',
      path: '/var/www/act-platform',
      'pre-deploy-local': 'npm test',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install redis-server nginx',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'deploy',
      host: 'staging.your-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:act/perfect-system.git',
      path: '/var/www/act-platform-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};