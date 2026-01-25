/**
 * Dashboard Monitoring
 * Automated monitoring and cron jobs for dashboard
 */

import cron from 'node-cron';

/**
 * Start automated monitoring
 * @param {Object} dashboard - Dashboard instance with update methods
 * @returns {void}
 */
export function startAutomatedMonitoring(dashboard) {
  console.log('Starting automated business monitoring...');

  // Update financial metrics every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await dashboard.updateFinancialMetrics();
  });

  // Update operational metrics every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await dashboard.updateOperationalMetrics();
  });

  // Scan for opportunities every hour
  cron.schedule('0 * * * *', async () => {
    await dashboard.scanForOpportunities();
  });

  // Daily compliance check
  cron.schedule('0 9 * * *', async () => {
    await dashboard.checkComplianceStatus();
  });

  console.log('Automated monitoring started');
}

/**
 * Monitoring configuration
 */
export const MONITORING_CONFIG = {
  financial: {
    schedule: '*/5 * * * *',
    function: 'updateFinancialMetrics'
  },
  operational: {
    schedule: '*/10 * * * *',
    function: 'updateOperationalMetrics'
  },
  opportunities: {
    schedule: '0 * * * *',
    function: 'scanForOpportunities'
  },
  compliance: {
    schedule: '0 9 * * *',
    function: 'checkComplianceStatus'
  }
};

/**
 * Get monitoring status
 * @returns {Object} Monitoring status
 */
export function getMonitoringStatus() {
  return {
    financial_updates: 'active',
    operational_updates: 'active',
    opportunity_scanning: 'active',
    compliance_monitoring: 'active'
  };
}

/**
 * Schedule custom monitoring task
 * @param {string} schedule - Cron schedule
 * @param {Function} task - Task function
 * @returns {string} Job ID
 */
export function scheduleCustomTask(schedule, task) {
  const job = cron.schedule(schedule, async () => {
    try {
      await task();
    } catch (error) {
      console.error('Custom monitoring task error:', error);
    }
  });

  return job;
}

export default {
  startAutomatedMonitoring,
  MONITORING_CONFIG,
  getMonitoringStatus,
  scheduleCustomTask
};
