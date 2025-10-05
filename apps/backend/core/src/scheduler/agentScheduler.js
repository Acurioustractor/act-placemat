/**
 * Agent Scheduler
 *
 * Manages scheduled tasks for the business agent including:
 * - Hourly financial monitoring
 * - Daily morning intelligence brief
 * - Daily compliance checks
 * - Weekly grant opportunity scanning
 */

import cron from 'node-cron';
import BusinessAgentAustralia from '../agents/businessAgentAustralia.js';

class AgentScheduler {
  constructor() {
    this.agent = null;
    this.jobs = {};
    this.isRunning = false;

    console.log('📅 Agent Scheduler initialized');
  }

  /**
   * Start all scheduled jobs
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️ Scheduler is already running');
      return;
    }

    try {
      // Initialize agent
      this.agent = new BusinessAgentAustralia({
        analysisIntervalMinutes: 60,
        enableComplianceMonitoring: true,
        enableGrantDiscovery: true,
        enableNotifications: true
      });

      // Start the agent
      await this.agent.start();

      // Schedule recurring jobs
      this.scheduleJobs();

      this.isRunning = true;
      console.log('✅ Agent Scheduler started successfully');

      return {
        success: true,
        message: 'Scheduler started',
        jobs: Object.keys(this.jobs)
      };

    } catch (error) {
      console.error('❌ Failed to start scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  async stop() {
    console.log('⏸️ Stopping Agent Scheduler...');

    // Stop all cron jobs
    Object.keys(this.jobs).forEach(jobName => {
      if (this.jobs[jobName]) {
        this.jobs[jobName].stop();
        console.log(`   Stopped: ${jobName}`);
      }
    });

    // Stop the agent
    if (this.agent) {
      await this.agent.stop();
    }

    this.jobs = {};
    this.isRunning = false;

    console.log('✅ Agent Scheduler stopped');

    return {
      success: true,
      message: 'Scheduler stopped'
    };
  }

  /**
   * Schedule all recurring jobs
   */
  scheduleJobs() {
    console.log('📅 Scheduling recurring jobs...');

    // Every hour - Continuous business analysis
    this.jobs.hourlyAnalysis = cron.schedule('0 * * * *', async () => {
      console.log('🔄 [HOURLY] Running business analysis...');
      try {
        await this.agent.runContinuousAnalysis();
      } catch (error) {
        console.error('Hourly analysis failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    // Daily at 6:00 AM - Morning intelligence brief
    this.jobs.morningBrief = cron.schedule('0 6 * * *', async () => {
      console.log('☀️ [DAILY 6AM] Generating morning intelligence brief...');
      try {
        const brief = await this.agent.generateMorningBrief();
        console.log('Morning brief generated:', brief.summary.headline);
        // TODO: Send via Slack/Email
      } catch (error) {
        console.error('Morning brief generation failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    // Daily at 9:00 PM - Compliance checks
    this.jobs.complianceCheck = cron.schedule('0 21 * * *', async () => {
      console.log('📋 [DAILY 9PM] Running compliance checks...');
      try {
        const compliance = await this.agent.checkAustralianCompliance();
        if (compliance.alerts && compliance.alerts.length > 0) {
          console.log(`⚠️ ${compliance.alerts.length} compliance alert(s)`);
          // TODO: Send notifications
        }
      } catch (error) {
        console.error('Compliance check failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    // Weekly on Monday at 9:00 AM - Grant opportunity scan
    this.jobs.grantScan = cron.schedule('0 9 * * 1', async () => {
      console.log('🎯 [WEEKLY MONDAY 9AM] Scanning grant opportunities...');
      try {
        const opportunities = await this.agent.scanGrantOpportunities();
        console.log(`Found ${opportunities.totalFound} opportunities`);
        if (opportunities.totalFound > 0) {
          // TODO: Send notification with opportunities
        }
      } catch (error) {
        console.error('Grant scan failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    // Every 4 hours - Financial monitoring
    this.jobs.financialMonitoring = cron.schedule('0 */4 * * *', async () => {
      console.log('💰 [EVERY 4 HOURS] Monitoring financials...');
      try {
        const financial = await this.agent.analyzeFinancials();
        if (financial.alerts && financial.alerts.length > 0) {
          console.log(`💰 ${financial.alerts.length} financial alert(s)`);
          // TODO: Send critical financial alerts
        }
      } catch (error) {
        console.error('Financial monitoring failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    // Weekly on Friday at 4:00 PM - Relationship intelligence
    this.jobs.relationshipReview = cron.schedule('0 16 * * 5', async () => {
      console.log('🤝 [WEEKLY FRIDAY 4PM] Reviewing relationships...');
      try {
        const relationships = await this.agent.analyzeRelationships();
        console.log(`Network: ${relationships.networkSize} contacts, ${relationships.strategicContacts} strategic`);
        if (relationships.recommendations && relationships.recommendations.length > 0) {
          // TODO: Send relationship recommendations
        }
      } catch (error) {
        console.error('Relationship review failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    console.log('✅ Scheduled jobs:');
    console.log('   • Hourly: Business analysis (every hour)');
    console.log('   • Daily 6AM: Morning intelligence brief');
    console.log('   • Daily 9PM: Compliance checks');
    console.log('   • Weekly Monday 9AM: Grant opportunities');
    console.log('   • Every 4 hours: Financial monitoring');
    console.log('   • Weekly Friday 4PM: Relationship intelligence');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const jobStatuses = {};
    Object.keys(this.jobs).forEach(jobName => {
      const job = this.jobs[jobName];
      jobStatuses[jobName] = {
        running: job ? job.options.scheduled : false
      };
    });

    return {
      scheduler: 'Agent Scheduler',
      status: this.isRunning ? 'running' : 'stopped',
      timezone: 'Australia/Sydney',
      agent: this.agent ? 'initialized' : 'not initialized',
      jobs: jobStatuses
    };
  }

  /**
   * Run a specific job immediately
   */
  async runJob(jobName) {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    console.log(`🔄 Running job: ${jobName}`);

    switch (jobName) {
      case 'hourlyAnalysis':
        return await this.agent.runContinuousAnalysis();

      case 'morningBrief':
        return await this.agent.generateMorningBrief();

      case 'complianceCheck':
        return await this.agent.checkAustralianCompliance();

      case 'grantScan':
        return await this.agent.scanGrantOpportunities();

      case 'financialMonitoring':
        return await this.agent.analyzeFinancials();

      case 'relationshipReview':
        return await this.agent.analyzeRelationships();

      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Export singleton instance
const schedulerInstance = new AgentScheduler();

export default schedulerInstance;
export { AgentScheduler };