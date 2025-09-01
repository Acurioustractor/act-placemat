#!/usr/bin/env node

/**
 * Node.js Performance Profiler for AI Workloads
 * 
 * Monitors CPU, memory, and event loop performance during AI operations
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { cpuUsage, memoryUsage } from 'process';

class NodeProfiler {
  constructor() {
    this.measurements = [];
    this.isRunning = false;
    this.interval = null;
    this.observer = null;
    this.startCPU = null;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startCPU = cpuUsage();
    console.log('📊 Node.js Profiler started...');
    
    // Set up performance observer
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.measurements.push({
          type: 'performance',
          name: entry.name,
          duration: entry.duration,
          timestamp: Date.now()
        });
      }
    });
    
    this.observer.observe({ entryTypes: ['measure', 'function'] });
    
    // Monitor system resources every second
    this.interval = setInterval(() => {
      const mem = memoryUsage();
      const cpu = cpuUsage(this.startCPU);
      
      this.measurements.push({
        type: 'system',
        memory: {
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
          rss: mem.rss
        },
        cpu: {
          user: cpu.user,
          system: cpu.system
        },
        timestamp: Date.now()
      });
    }, 1000);
    
    // Monitor event loop lag
    this.monitorEventLoop();
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    console.log('📊 Node.js Profiler stopped');
    return this.generateReport();
  }

  monitorEventLoop() {
    let start = performance.now();
    
    const measureLag = () => {
      const lag = performance.now() - start - 10; // Expected 10ms delay
      this.measurements.push({
        type: 'eventloop',
        lag: Math.max(0, lag),
        timestamp: Date.now()
      });
      
      start = performance.now();
      if (this.isRunning) {
        setTimeout(measureLag, 10);
      }
    };
    
    setTimeout(measureLag, 10);
  }

  generateReport() {
    const systemMeasurements = this.measurements.filter(m => m.type === 'system');
    const eventLoopMeasurements = this.measurements.filter(m => m.type === 'eventloop');
    
    if (systemMeasurements.length === 0) {
      return { error: 'No measurements collected' };
    }
    
    // Calculate memory statistics
    const heapUsed = systemMeasurements.map(m => m.memory.heapUsed);
    const maxHeap = Math.max(...heapUsed);
    const avgHeap = heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length;
    const heapGrowth = heapUsed[heapUsed.length - 1] - heapUsed[0];
    
    // Calculate CPU statistics
    const cpuUser = systemMeasurements.map(m => m.cpu.user);
    const cpuSystem = systemMeasurements.map(m => m.cpu.system);
    const avgCPUUser = cpuUser.reduce((a, b) => a + b, 0) / cpuUser.length;
    const avgCPUSystem = cpuSystem.reduce((a, b) => a + b, 0) / cpuSystem.length;
    
    // Calculate event loop lag statistics
    const eventLoopLags = eventLoopMeasurements.map(m => m.lag);
    const maxLag = Math.max(...eventLoopLags, 0);
    const avgLag = eventLoopLags.length > 0 ? eventLoopLags.reduce((a, b) => a + b, 0) / eventLoopLags.length : 0;
    
    return {
      duration: systemMeasurements.length,
      memory: {
        maxHeapUsed: Math.round(maxHeap / 1024 / 1024), // MB
        avgHeapUsed: Math.round(avgHeap / 1024 / 1024), // MB
        heapGrowth: Math.round(heapGrowth / 1024 / 1024), // MB
        finalHeap: Math.round(heapUsed[heapUsed.length - 1] / 1024 / 1024) // MB
      },
      cpu: {
        avgUserTime: avgCPUUser,
        avgSystemTime: avgCPUSystem,
        totalCPUTime: avgCPUUser + avgCPUSystem
      },
      eventLoop: {
        maxLag: Math.round(maxLag * 100) / 100, // ms
        avgLag: Math.round(avgLag * 100) / 100, // ms
        lagEvents: eventLoopMeasurements.length
      },
      performance: this.measurements.filter(m => m.type === 'performance')
    };
  }

  formatReport(report) {
    return `
📊 Node.js Performance Profile
==============================

🧠 Memory Usage:
  - Peak Heap: ${report.memory.maxHeapUsed}MB
  - Average Heap: ${report.memory.avgHeapUsed}MB
  - Heap Growth: ${report.memory.heapGrowth >= 0 ? '+' : ''}${report.memory.heapGrowth}MB
  - Final Heap: ${report.memory.finalHeap}MB

⚡ CPU Usage:
  - User Time: ${report.cpu.avgUserTime}μs
  - System Time: ${report.cpu.avgSystemTime}μs
  - Total CPU: ${report.cpu.totalCPUTime}μs

🔄 Event Loop:
  - Max Lag: ${report.eventLoop.maxLag}ms
  - Avg Lag: ${report.eventLoop.avgLag}ms
  - Measurements: ${report.eventLoop.lagEvents}

📈 Duration: ${report.duration} seconds
`;
  }
}

export default NodeProfiler;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const profiler = new NodeProfiler();
  
  console.log('Starting Node.js profiler for 30 seconds...');
  profiler.start();
  
  setTimeout(() => {
    const report = profiler.stop();
    console.log(profiler.formatReport(report));
    console.log('Raw data:', JSON.stringify(report, null, 2));
  }, 30000);
}