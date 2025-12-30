/**
 * Migration Workflow Service
 *
 * R&D Component: State Machine for Email Migration Orchestration
 * Hypothesis: Automated workflow reduces migration time by 70% (4hrs → 1.2hrs for 50 vendors)
 * Methodology: State machine (not_started → contacted → confirmed → completed),
 *              priority-based processing, progress tracking
 * Success Metric: ≥75% automation rate, <5% manual intervention required
 */

import VendorEmailDiscovery from './vendorEmailDiscovery.js';
import AutomatedEmailService from './automatedEmailService.js';

export class MigrationWorkflow {
  constructor(gmailService, supabase) {
    this.supabase = supabase;
    this.emailDiscovery = new VendorEmailDiscovery(gmailService, supabase);
    this.emailService = new AutomatedEmailService(supabase);

    // State machine transitions
    this.validTransitions = {
      not_started: ['pending_contact', 'skipped'],
      pending_contact: ['contacted', 'skipped'],
      contacted: ['vendor_confirmed', 'skipped'],
      vendor_confirmed: ['completed', 'contacted'], // Can retry contact
      completed: [], // Terminal state
      skipped: ['not_started'] // Can reset
    };
  }

  /**
   * Initialize migration workflow for tenant
   * Discovers vendor emails and calculates priorities
   */
  async initializeMigration(tenantId, options = {}) {
    const { forceRediscover = false } = options;

    console.log(`\n[MigrationWorkflow] Initializing migration for tenant: ${tenantId}\n`);

    // Fetch all subscriptions
    const { data: subscriptions, error } = await this.supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active') // Only active subscriptions
      .order('amount', { ascending: false }); // High-value first

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    console.log(`   Found ${subscriptions.length} active subscriptions\n`);

    // Discover vendor emails
    const emailResults = await this.emailDiscovery.batchDiscover(subscriptions, {
      concurrency: 5
    });

    // Update subscriptions with discovered emails
    await this.emailDiscovery.batchUpdateEmails(emailResults);

    // Set status to pending_contact for subscriptions with emails
    const withEmails = Array.from(emailResults.values())
      .filter(r => r.email !== null)
      .map(r => r.id);

    if (withEmails.length > 0) {
      const { error: updateError } = await this.supabase
        .from('discovered_subscriptions')
        .update({
          migration_status: 'pending_contact',
          updated_at: new Date().toISOString()
        })
        .in('id', withEmails);

      if (updateError) {
        console.error(`Warning: Failed to update status: ${updateError.message}`);
      }
    }

    // Calculate summary stats
    const discovered = Array.from(emailResults.values()).filter(r => r.email !== null);
    const priorityBreakdown = await this.getPriorityBreakdown(tenantId);

    const summary = {
      total: subscriptions.length,
      emailsDiscovered: discovered.length,
      pendingContact: withEmails.length,
      manualNeeded: subscriptions.length - discovered.length,
      priorities: priorityBreakdown
    };

    console.log(`\n📊 Initialization Summary:`);
    console.log(`   Total subscriptions: ${summary.total}`);
    console.log(`   Emails discovered: ${summary.emailsDiscovered} (${(summary.emailsDiscovered / summary.total * 100).toFixed(1)}%)`);
    console.log(`   Ready to contact: ${summary.pendingContact}`);
    console.log(`   Manual entry needed: ${summary.manualNeeded}`);
    console.log(`   Priority breakdown:`, summary.priorities);

    return summary;
  }

  /**
   * Execute contact workflow - send emails to vendors
   */
  async executeContactWorkflow(tenantId, options = {}) {
    const {
      subscriptionIds = null,
      dryRun = false,
      maxBatchSize = 50
    } = options;

    console.log(`\n[MigrationWorkflow] Executing contact workflow...`);
    console.log(`   Dry run: ${dryRun}`);

    // Get template
    const template = await this.emailService.getDefaultTemplate();

    // Fetch subscriptions to contact
    let query = this.supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('migration_status', 'pending_contact')
      .not('vendor_contact_email', 'is', null)
      .order('migration_priority', { ascending: false })
      .limit(maxBatchSize);

    // Filter by specific IDs if provided
    if (subscriptionIds && subscriptionIds.length > 0) {
      query = query.in('id', subscriptionIds);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('   No subscriptions ready to contact');
      return {
        sent: 0,
        queued: 0,
        failed: 0,
        skipped: 0
      };
    }

    console.log(`   Found ${subscriptions.length} subscriptions to contact`);

    // Send batch emails
    const results = await this.emailService.sendBatchEmails(
      subscriptions,
      template,
      { dryRun }
    );

    // Update statuses for successfully sent
    if (!dryRun && results.sent.length > 0) {
      const sentIds = results.sent.map(r => r.id);
      await this.updateMigrationStatus(sentIds, 'contacted');
    }

    return {
      sent: results.sent.length,
      queued: results.queued.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      details: results
    };
  }

  /**
   * Confirm vendor response - manual action
   */
  async confirmVendorResponse(subscriptionId, notes = null) {
    console.log(`[MigrationWorkflow] Confirming vendor response for: ${subscriptionId}`);

    return await this.transitionStatus(subscriptionId, 'vendor_confirmed', {
      confirmed_at: new Date().toISOString(),
      migration_notes: notes
    });
  }

  /**
   * Complete migration - final step
   */
  async completeMigration(subscriptionId) {
    console.log(`[MigrationWorkflow] Completing migration for: ${subscriptionId}`);

    return await this.transitionStatus(subscriptionId, 'completed', {
      completed_at: new Date().toISOString(),
      account_email: 'accounts@act.place' // Final email updated
    });
  }

  /**
   * Skip migration with reason
   */
  async skipMigration(subscriptionId, reason) {
    console.log(`[MigrationWorkflow] Skipping migration: ${subscriptionId} - ${reason}`);

    return await this.transitionStatus(subscriptionId, 'skipped', {
      migration_notes: reason
    });
  }

  /**
   * Transition subscription to new status (with validation)
   */
  async transitionStatus(subscriptionId, newStatus, additionalUpdates = {}) {
    // Get current status
    const { data: subscription, error: fetchError } = await this.supabase
      .from('discovered_subscriptions')
      .select('migration_status')
      .eq('id', subscriptionId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
    }

    const currentStatus = subscription.migration_status || 'not_started';

    // Validate transition
    const validNext = this.validTransitions[currentStatus] || [];
    if (!validNext.includes(newStatus)) {
      throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
    }

    // Update status
    const { data, error } = await this.supabase
      .from('discovered_subscriptions')
      .update({
        migration_status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalUpdates
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }

    console.log(`  ✅ Transitioned: ${currentStatus} → ${newStatus}`);
    return data;
  }

  /**
   * Batch update migration status for multiple subscriptions
   */
  async updateMigrationStatus(subscriptionIds, newStatus) {
    const timestamp = new Date().toISOString();
    const updates = { migration_status: newStatus, updated_at: timestamp };

    // Add timestamp field based on status
    if (newStatus === 'contacted') {
      updates.contacted_at = timestamp;
    } else if (newStatus === 'vendor_confirmed') {
      updates.confirmed_at = timestamp;
    } else if (newStatus === 'completed') {
      updates.completed_at = timestamp;
    }

    const { error } = await this.supabase
      .from('discovered_subscriptions')
      .update(updates)
      .in('id', subscriptionIds);

    if (error) {
      throw new Error(`Batch status update failed: ${error.message}`);
    }

    console.log(`  ✅ Updated ${subscriptionIds.length} subscriptions to: ${newStatus}`);
  }

  /**
   * Get migration progress summary
   */
  async getProgress(tenantId) {
    // Use the migration_progress view
    const { data, error } = await this.supabase
      .from('migration_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch progress: ${error.message}`);
    }

    // If no data, return empty stats
    if (!data) {
      return {
        total: 0,
        byStatus: {
          not_started: 0,
          pending_contact: 0,
          contacted: 0,
          vendor_confirmed: 0,
          completed: 0,
          skipped: 0
        },
        done: 0,
        completionRate: 0,
        avgPendingPriority: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0
      };
    }

    return {
      total: data.total_subscriptions,
      byStatus: {
        not_started: data.not_started || 0,
        pending_contact: data.pending_contact || 0,
        contacted: data.contacted || 0,
        vendor_confirmed: data.vendor_confirmed || 0,
        completed: data.completed || 0,
        skipped: data.skipped || 0
      },
      done: data.done || 0,
      completionRate: parseFloat(data.completion_rate || 0),
      avgPendingPriority: parseFloat(data.avg_pending_priority || 0),
      highPriority: data.high_priority || 0,
      mediumPriority: data.medium_priority || 0,
      lowPriority: data.low_priority || 0
    };
  }

  /**
   * Get priority breakdown
   */
  async getPriorityBreakdown(tenantId) {
    const { data, error } = await this.supabase
      .from('discovered_subscriptions')
      .select('migration_priority')
      .eq('tenant_id', tenantId);

    if (error) {
      return { high: 0, medium: 0, low: 0 };
    }

    const breakdown = data.reduce((acc, sub) => {
      const priority = sub.migration_priority || 0;
      if (priority >= 80) acc.high++;
      else if (priority >= 60) acc.medium++;
      else acc.low++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    return breakdown;
  }

  /**
   * Calculate priority score for a subscription
   * Called by database trigger, but also available as standalone
   */
  calculatePriority(subscription) {
    const amount = parseFloat(subscription.amount || 0);
    const confidence = parseFloat(subscription.confidence || 0);
    const metadata = subscription.metadata || {};

    // Amount score (max 40 points) - Scale: $100 = max points
    const amountScore = Math.min(40, (amount / 100.0) * 40);

    // Recency score (max 30 points)
    let recencyScore = 15; // Default medium priority
    if (metadata.lastSeen) {
      const lastSeen = new Date(metadata.lastSeen);
      const daysSince = Math.floor((new Date() - lastSeen) / (1000 * 60 * 60 * 24));

      if (daysSince <= 7) recencyScore = 30;        // Last week
      else if (daysSince <= 30) recencyScore = 20;  // Last month
      else if (daysSince <= 90) recencyScore = 10;  // Last quarter
      else recencyScore = 5;                         // Older
    }

    // Confidence score (max 30 points)
    const confidenceScore = confidence * 30;

    // Total (0-100)
    return Math.min(100, Math.round(amountScore + recencyScore + confidenceScore));
  }

  /**
   * Get next batch of subscriptions to process
   * Returns highest priority subscriptions ready for next action
   */
  async getNextBatch(tenantId, batchSize = 10) {
    const { data, error } = await this.supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('migration_status', ['pending_contact', 'contacted'])
      .order('migration_priority', { ascending: false })
      .limit(batchSize);

    if (error) {
      throw new Error(`Failed to fetch next batch: ${error.message}`);
    }

    return data || [];
  }
}

/**
 * R&D Documentation Export
 */
export const RD_METADATA = {
  component: 'Migration Workflow Service',
  hypothesis: 'Automated state machine workflow reduces migration time by 70% (4hrs → 1.2hrs for 50 vendors)',
  methodology: 'State machine orchestration (not_started → contacted → confirmed → completed), priority-based processing, progress tracking with SQL views',
  successMetric: 'Automation rate ≥75%, manual intervention <5%, processing time <2hrs for 50 vendors',
  findings: 'TBD after production testing',
  category: 'Workflow Automation',
  technicalUncertainty: 'Optimal batch sizing and state transition timing for balancing speed vs manual oversight',
  estimatedHours: 4.5
};

export default MigrationWorkflow;
