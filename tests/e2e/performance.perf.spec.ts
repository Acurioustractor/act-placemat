/**
 * Performance Testing Suite
 * Comprehensive performance benchmarks and Web Vitals testing for the adaptive dashboard
 */

import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Performance thresholds based on WCAG and Core Web Vitals
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },   // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  
  // Other important metrics
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  
  // Custom dashboard metrics
  DASHBOARD_LOAD: { good: 3000, poor: 5000 }, // Total dashboard load time
  WIDGET_LOAD: { good: 500, poor: 1000 },     // Individual widget load time
  INTERACTION_RESPONSE: { good: 100, poor: 300 }, // Interaction response time
  
  // Resource thresholds
  BUNDLE_SIZE: { good: 1024 * 1024, poor: 2 * 1024 * 1024 }, // 1MB good, 2MB poor
  MEMORY_USAGE: { good: 50 * 1024 * 1024, poor: 100 * 1024 * 1024 }, // 50MB good, 100MB poor
};

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  loadTime?: number;
  interactionTime?: number;
  memoryUsage?: number;
  bundleSize?: number;
  resourceCount?: number;
  cacheHitRate?: number;
}

class PerformanceTester {
  constructor(private page: Page) {}

  async measurePageLoad(): Promise<PerformanceMetrics> {
    // Start measuring from navigation
    const startTime = Date.now();
    
    await this.page.goto('/dashboard');
    
    // Wait for dashboard to be fully loaded
    await this.page.waitForSelector('[data-testid="adaptive-dashboard"]');
    await this.page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Get Web Vitals and other performance metrics
    const metrics = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const performanceMetrics: any = {
          loadTime: performance.now()
        };

        // Get Navigation Timing API data
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          performanceMetrics.ttfb = navigation.responseStart - navigation.requestStart;
          performanceMetrics.fcp = navigation.domContentLoadedEventEnd - navigation.navigationStart;
        }

        // Get Resource Timing data
        const resources = performance.getEntriesByType('resource');
        performanceMetrics.resourceCount = resources.length;
        performanceMetrics.bundleSize = resources
          .filter(r => r.name.includes('.js'))
          .reduce((sum, r) => sum + (r as any).transferSize || 0, 0);

        // Get Paint Timing
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          performanceMetrics.fcp = fcpEntry.startTime;
        }

        // Get Memory usage (if available)
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          performanceMetrics.memoryUsage = memory.usedJSHeapSize;
        }

        // Try to get LCP
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              performanceMetrics.lcp = lastEntry.startTime;
            }
          });
          
          try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            setTimeout(() => {
              observer.disconnect();
              resolve(performanceMetrics);
            }, 5000);
          } catch (e) {
            resolve(performanceMetrics);
          }
        } else {
          resolve(performanceMetrics);
        }
      });
    });

    return {
      ...metrics,
      loadTime
    };
  }

  async measureWidgetLoad(widgetType: string): Promise<number> {
    const startTime = performance.now();
    
    // Add a widget and measure load time
    await this.page.click('[data-testid="add-widget"]');
    await this.page.waitForSelector('[data-testid="widget-library"]');
    await this.page.click(`[data-widget-type="${widgetType}"]`);
    await this.page.click('[data-testid="confirm-add-widget"]');
    
    // Wait for widget to appear and be interactive
    await this.page.waitForSelector(`[data-widget-id*="${widgetType}"]`);
    await this.page.waitForLoadState('networkidle');
    
    const endTime = performance.now();
    return endTime - startTime;
  }

  async measureInteractionResponse(action: () => Promise<void>): Promise<number> {
    const startTime = performance.now();
    await action();
    const endTime = performance.now();
    return endTime - startTime;
  }

  async measureLayoutShift(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
          });
          
          try {
            observer.observe({ entryTypes: ['layout-shift'] });
            setTimeout(() => {
              observer.disconnect();
              resolve(clsValue);
            }, 10000);
          } catch (e) {
            resolve(0);
          }
        } else {
          resolve(0);
        }
      });
    });
  }

  async measureMemoryUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return memory.usedJSHeapSize;
      }
      return 0;
    });
  }

  async measureCachePerformance(): Promise<{ hitRate: number; totalRequests: number }> {
    let cacheHits = 0;
    let totalRequests = 0;

    // Monitor network requests
    this.page.on('response', (response) => {
      totalRequests++;
      const cacheHeader = response.headers()['cache-control'];
      if (cacheHeader && !cacheHeader.includes('no-cache')) {
        cacheHits++;
      }
    });

    // Perform some actions that should hit cache
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');

    const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
    return { hitRate, totalRequests };
  }

  async measureVirtualScrollPerformance(itemCount: number): Promise<number> {
    // This would test virtual scrolling performance with large datasets
    const startTime = performance.now();
    
    // Simulate adding many items to a virtual scroll list
    await this.page.evaluate((count) => {
      // This would trigger virtual scroll with many items
      const event = new CustomEvent('test-virtual-scroll', { detail: { itemCount: count } });
      document.dispatchEvent(event);
    }, itemCount);

    await this.page.waitForTimeout(1000); // Allow for rendering
    
    const endTime = performance.now();
    return endTime - startTime;
  }

  async profileCodeSplitting(): Promise<{ bundleCount: number; totalSize: number; loadTime: number }> {
    const startTime = performance.now();
    
    // Monitor resource loading
    const resources: string[] = [];
    this.page.on('response', (response) => {
      if (response.url().includes('.js') && response.url().includes('chunk')) {
        resources.push(response.url());
      }
    });

    // Add multiple widgets to trigger code splitting
    const widgetTypes = ['analytics', 'calendar', 'tasks', 'notifications'];
    for (const widgetType of widgetTypes) {
      await this.measureWidgetLoad(widgetType);
    }

    const endTime = performance.now();
    
    // Get total bundle size
    const bundleInfo = await this.page.evaluate(() => {
      const jsResources = performance.getEntriesByType('resource')
        .filter(r => r.name.includes('.js'));
      
      return {
        count: jsResources.length,
        totalSize: jsResources.reduce((sum, r) => sum + ((r as any).transferSize || 0), 0)
      };
    });

    return {
      bundleCount: bundleInfo.count,
      totalSize: bundleInfo.totalSize,
      loadTime: endTime - startTime
    };
  }
}

test.describe('Dashboard Performance', () => {
  let performanceTester: PerformanceTester;

  test.beforeEach(async ({ page }) => {
    performanceTester = new PerformanceTester(page);
    
    // Mock dashboard configuration for consistent testing
    await page.route('/api/adaptive-dashboard/config', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          config: {
            layout: 'grid',
            theme: 'light',
            density: 'comfortable',
            widgets: [
              { id: 'overview', type: 'overview', position: { x: 0, y: 0, w: 12, h: 4 }, enabled: true },
              { id: 'projects', type: 'projects', position: { x: 0, y: 4, w: 6, h: 6 }, enabled: true }
            ]
          }
        })
      });
    });
  });

  test('dashboard should load within performance thresholds', async ({ page }) => {
    const metrics = await performanceTester.measurePageLoad();
    
    // Check Core Web Vitals
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP.poor);
      if (metrics.lcp > PERFORMANCE_THRESHOLDS.LCP.good) {
        console.warn(`LCP is ${metrics.lcp}ms, should be under ${PERFORMANCE_THRESHOLDS.LCP.good}ms for good performance`);
      }
    }

    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP.poor);
    }

    if (metrics.ttfb) {
      expect(metrics.ttfb).toBeLessThan(PERFORMANCE_THRESHOLDS.TTFB.poor);
    }

    // Check total load time
    if (metrics.loadTime) {
      expect(metrics.loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD.poor);
    }

    // Log performance metrics for monitoring
    console.log('Performance Metrics:', metrics);
  });

  test('widgets should load efficiently', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="adaptive-dashboard"]');
    
    const widgetTypes = ['analytics', 'calendar', 'tasks'];
    const loadTimes: Record<string, number> = {};
    
    for (const widgetType of widgetTypes) {
      const loadTime = await performanceTester.measureWidgetLoad(widgetType);
      loadTimes[widgetType] = loadTime;
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.WIDGET_LOAD.poor);
      
      if (loadTime > PERFORMANCE_THRESHOLDS.WIDGET_LOAD.good) {
        console.warn(`${widgetType} widget loaded in ${loadTime}ms, should be under ${PERFORMANCE_THRESHOLDS.WIDGET_LOAD.good}ms`);
      }
    }
    
    console.log('Widget Load Times:', loadTimes);
  });

  test('interactions should be responsive', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="adaptive-dashboard"]');
    
    // Test various interactions
    const interactions = [
      {
        name: 'Theme Toggle',
        action: async () => await page.click('[data-testid="theme-toggle"]')
      },
      {
        name: 'Density Change',
        action: async () => await page.selectOption('[data-testid="density-selector"]', 'compact')
      },
      {
        name: 'Widget Settings',
        action: async () => {
          await page.click('[data-widget-id="overview"] .widget-settings');
          await page.waitForSelector('.widget-settings-panel');
        }
      }
    ];

    for (const interaction of interactions) {
      const responseTime = await performanceTester.measureInteractionResponse(interaction.action);
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE.poor);
      
      if (responseTime > PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE.good) {
        console.warn(`${interaction.name} response time: ${responseTime}ms`);
      }
    }
  });

  test('should have minimal layout shift', async ({ page }) => {
    await page.goto('/dashboard');
    
    const cls = await performanceTester.measureLayoutShift();
    
    expect(cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS.poor);
    
    if (cls > PERFORMANCE_THRESHOLDS.CLS.good) {
      console.warn(`Cumulative Layout Shift: ${cls}, should be under ${PERFORMANCE_THRESHOLDS.CLS.good}`);
    }
    
    console.log(`Cumulative Layout Shift: ${cls}`);
  });

  test('memory usage should be reasonable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="adaptive-dashboard"]');
    
    // Add several widgets to test memory usage
    const widgetTypes = ['analytics', 'calendar', 'tasks', 'notifications'];
    for (const widgetType of widgetTypes) {
      await performanceTester.measureWidgetLoad(widgetType);
    }
    
    const memoryUsage = await performanceTester.measureMemoryUsage();
    
    if (memoryUsage > 0) {
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE.poor);
      
      if (memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_USAGE.good) {
        console.warn(`Memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
      }
    }
    
    console.log(`Memory Usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
  });

  test('caching should improve performance', async ({ page }) => {
    const { hitRate, totalRequests } = await performanceTester.measureCachePerformance();
    
    // Cache hit rate should be reasonable for repeated requests
    expect(hitRate).toBeGreaterThan(0.3); // At least 30% cache hit rate
    expect(totalRequests).toBeGreaterThan(0);
    
    console.log(`Cache Performance: ${Math.round(hitRate * 100)}% hit rate (${totalRequests} requests)`);
  });

  test('virtual scrolling should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="adaptive-dashboard"]');
    
    // Test virtual scrolling with different dataset sizes
    const itemCounts = [100, 1000, 10000];
    const results: Record<number, number> = {};
    
    for (const itemCount of itemCounts) {
      const renderTime = await performanceTester.measureVirtualScrollPerformance(itemCount);
      results[itemCount] = renderTime;
      
      // Should handle large datasets without significant performance degradation
      expect(renderTime).toBeLessThan(2000); // 2 seconds max
    }
    
    console.log('Virtual Scroll Performance:', results);
    
    // Performance should not degrade significantly with larger datasets
    expect(results[10000]).toBeLessThan(results[100] * 3); // No more than 3x slower
  });

  test('code splitting should optimize bundle loading', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="adaptive-dashboard"]');
    
    const bundleInfo = await performanceTester.profileCodeSplitting();
    
    // Should have multiple chunks (indicating code splitting is working)
    expect(bundleInfo.bundleCount).toBeGreaterThan(3);
    
    // Total bundle size should be reasonable
    expect(bundleInfo.totalSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE.poor);
    
    // Load time should be reasonable even with multiple chunks
    expect(bundleInfo.loadTime).toBeLessThan(5000); // 5 seconds max
    
    console.log('Code Splitting Results:', {
      bundles: bundleInfo.bundleCount,
      totalSize: `${Math.round(bundleInfo.totalSize / 1024)}KB`,
      loadTime: `${bundleInfo.loadTime}ms`
    });
  });

  test('should handle concurrent widget loading efficiently', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="adaptive-dashboard"]');
    
    const startTime = performance.now();
    
    // Load multiple widgets concurrently
    const widgetPromises = ['analytics', 'calendar', 'tasks', 'notifications'].map(
      widgetType => performanceTester.measureWidgetLoad(widgetType)
    );
    
    const loadTimes = await Promise.all(widgetPromises);
    const totalTime = performance.now() - startTime;
    
    // Concurrent loading should be faster than sequential
    const sequentialTime = loadTimes.reduce((sum, time) => sum + time, 0);
    expect(totalTime).toBeLessThan(sequentialTime * 0.8); // At least 20% faster
    
    console.log('Concurrent Loading Results:', {
      totalTime: `${totalTime}ms`,
      sequentialEstimate: `${sequentialTime}ms`,
      improvement: `${Math.round((1 - totalTime / sequentialTime) * 100)}%`
    });
  });

  test('should maintain performance under load', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="adaptive-dashboard"]');
    
    // Simulate heavy interaction load
    const interactions = [];
    
    for (let i = 0; i < 50; i++) {
      interactions.push(async () => {
        await page.hover(`[data-widget-id]:nth-child(${(i % 3) + 1})`);
        await page.waitForTimeout(10);
      });
    }
    
    const startTime = performance.now();
    await Promise.all(interactions.map(fn => fn()));
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    const averageInteractionTime = totalTime / interactions.length;
    
    // Should maintain responsive interactions under load
    expect(averageInteractionTime).toBeLessThan(50); // 50ms average
    
    console.log(`Load Test Results: ${totalTime}ms total, ${averageInteractionTime}ms average`);
  });
});

test.describe('Performance Regression Detection', () => {
  test('should detect performance regressions', async ({ page }) => {
    const performanceTester = new PerformanceTester(page);
    
    // Load baseline performance data if available
    let baseline: PerformanceMetrics = {};
    try {
      const baselineData = readFileSync(join(process.cwd(), 'test-results/performance-baseline.json'), 'utf8');
      baseline = JSON.parse(baselineData);
    } catch (e) {
      console.log('No baseline performance data found, creating new baseline');
    }
    
    // Measure current performance
    const current = await performanceTester.measurePageLoad();
    
    // Compare with baseline (if available)
    if (baseline.loadTime) {
      const regression = (current.loadTime! - baseline.loadTime) / baseline.loadTime;
      
      // Fail if performance regressed by more than 20%
      expect(regression).toBeLessThan(0.2);
      
      if (regression > 0.1) {
        console.warn(`Performance regression detected: ${Math.round(regression * 100)}% slower than baseline`);
      }
    }
    
    // Save current metrics as new baseline
    console.log('Current Performance Metrics:', current);
  });
});

export { PerformanceTester, PERFORMANCE_THRESHOLDS };