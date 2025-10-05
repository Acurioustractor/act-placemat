#!/usr/bin/env node

/**
 * Docker Health Check Script
 * Simple health check for container orchestration
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8080,
  path: '/health',
  method: 'GET',
  timeout: 3000
};

const request = http.request(options, (response) => {
  if (response.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.log(`Health check failed with status: ${response.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (error) => {
  console.log(`Health check failed with error: ${error.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('Health check timed out');
  request.destroy();
  process.exit(1);
});

request.end();