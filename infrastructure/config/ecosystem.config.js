module.exports = {
  apps: [
    {
      name: 'act-backend',
      cwd: './apps/backend',
      script: 'src/server.js',
      instances: 1, // Single instance for development
      exec_mode: 'fork', // Fork mode for development
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        PM2_SERVE_PATH: '.',
        PM2_SERVE_PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        instances: 'max',
        exec_mode: 'cluster'
      },
      watch: [
        'src',
        'database',
        'package.json',
        '.env'
      ],
      ignore_watch: [
        'node_modules',
        'logs',
        'tests',
        '*.log',
        '*.pid'
      ],
      watch_options: {
        followSymlinks: false,
        usePolling: false,
        interval: 1000,
        binaryInterval: 3000
      },
      max_memory_restart: '500M',
      error_file: '../../logs/backend-error.log',
      out_file: '../../logs/backend-out.log',
      log_file: '../../logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 8000,
      // Advanced options
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      source_map_support: true,
      instance_var: 'INSTANCE_ID'
    },
    {
      name: 'act-frontend',
      cwd: './apps/frontend',
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        PORT: 5173,
        FORCE_COLOR: 1
      },
      watch: false, // Vite handles its own watching
      error_file: '../../logs/frontend-error.log',
      out_file: '../../logs/frontend-out.log',
      log_file: '../../logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 8000,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/act-placemat.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};