/**
 * Email Consolidation Migration Tracker
 *
 * R&D Component: Vendor Contact Migration Management System
 * Hypothesis: Automated vendor contact tracking + CSV export reduces email consolidation
 *             migration time by 70% (from 4hrs to ~1hr for 50 vendors)
 * Methodology: Extract sender emails from Gmail messages, group by vendor,
 *              track migration status, generate CSV export for manual updates,
 *              prioritize by invoice recency
 * Success Metric: 100% vendor coverage, migration completion in <2 hours,
 *                 successful migration of all invoices to accounts@act.place within 3 months
 * Findings: TBD after migration completion
 */

export class EmailConsolidationTracker {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * R&D Method: Track migration status for all vendors
   * Returns: Array of { vendor, currentEmail, lastInvoiceDate, migrated, priority }
   */
  async trackMigration(tenantId) {
    console.log('[Email Consolidation] Tracking migration status for tenant:', tenantId);

    try {
      // Get all discovered subscriptions with Gmail message IDs
      const { data: subscriptions, error } = await this.supabase
        .from('discovered_subscriptions')
        .select(`
          vendor,
          gmail_message_id,
          account_email,
          last_scanned,
          subscription_receipts(gmail_message_id, created_at)
        `)
        .eq('tenant_id', tenantId)
        .not('gmail_message_id', 'is', null);

      if (error) {
        console.error('[Email Consolidation] Error fetching subscriptions:', error);
        throw error;
      }

      if (!subscriptions || subscriptions.length === 0) {
        return {
          vendors: [],
          message: 'No subscriptions with Gmail data found'
        };
      }

      console.log(`[Email Consolidation] Analyzing ${subscriptions.length} subscriptions`);

      // Group by vendor
      const vendorMap = new Map();

      for (const sub of subscriptions) {
        const vendor = sub.vendor;

        if (!vendorMap.has(vendor)) {
          vendorMap.set(vendor, {
            vendor,
            accountEmail: sub.account_email,
            currentEmail: null,  // Will extract from message if needed
            migratedToAccounts: sub.account_email === 'accounts@act.place',
            lastInvoiceDate: sub.last_scanned,
            gmailMessageIds: [sub.gmail_message_id],
            receiptCount: sub.subscription_receipts?.length || 0
          });
        } else {
          // Update with most recent data
          const existing = vendorMap.get(vendor);
          existing.gmailMessageIds.push(sub.gmail_message_id);

          if (new Date(sub.last_scanned) > new Date(existing.lastInvoiceDate)) {
            existing.lastInvoiceDate = sub.last_scanned;
            existing.accountEmail = sub.account_email;
            existing.migratedToAccounts = sub.account_email === 'accounts@act.place';
          }

          existing.receiptCount += sub.subscription_receipts?.length || 0;
        }
      }

      // Convert to array and add priorities
      const vendors = Array.from(vendorMap.values()).map(vendor => ({
        ...vendor,
        priority: this.calculatePriority(vendor.lastInvoiceDate),
        priorityLabel: this.getPriorityLabel(vendor.lastInvoiceDate),
        notificationSent: false  // Placeholder for future feature
      }));

      // Sort by priority (high to low)
      vendors.sort((a, b) => b.priority - a.priority);

      // Calculate migration statistics
      const stats = {
        total: vendors.length,
        migrated: vendors.filter(v => v.migratedToAccounts).length,
        pending: vendors.filter(v => !v.migratedToAccounts).length,
        migrationRate: vendors.length > 0
          ? ((vendors.filter(v => v.migratedToAccounts).length / vendors.length) * 100).toFixed(1)
          : 0
      };

      console.log('[Email Consolidation] Migration status:', stats);

      // R&D Metrics
      console.log('[R&D] Migration Tracking Metrics:', {
        vendorsAnalyzed: vendors.length,
        alreadyMigrated: stats.migrated,
        pendingMigration: stats.pending,
        migrationCompletionRate: `${stats.migrationRate}%`,
        highPriorityVendors: vendors.filter(v => v.priorityLabel === 'High').length
      });

      return {
        vendors,
        stats
      };
    } catch (error) {
      console.error('[Email Consolidation] Error tracking migration:', error);
      throw error;
    }
  }

  /**
   * Export vendor contact list as CSV
   * For manual updates to billing email addresses
   */
  async exportVendorContactList(tenantId, options = {}) {
    console.log('[Email Consolidation] Exporting vendor contact list for tenant:', tenantId);

    const { vendors } = await this.trackMigration(tenantId);

    // Filter out already-migrated vendors unless includeAll is true
    const vendorsToExport = options.includeAll
      ? vendors
      : vendors.filter(v => !v.migratedToAccounts);

    // Generate CSV
    const headers = ['Vendor', 'Current Account', 'Action Required', 'Priority', 'Last Invoice', 'Receipt Count'];
    const rows = vendorsToExport.map(v => [
      v.vendor,
      v.accountEmail || 'Unknown',
      v.migratedToAccounts
        ? 'Already using accounts@act.place'
        : 'Update billing email to accounts@act.place',
      v.priorityLabel,
      v.lastInvoiceDate ? new Date(v.lastInvoiceDate).toLocaleDateString() : 'Unknown',
      v.receiptCount
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => this.escapeCSV(cell)).join(','))
    ].join('\n');

    console.log(`[Email Consolidation] Exported ${vendorsToExport.length} vendors to CSV`);

    return {
      csv,
      vendorCount: vendorsToExport.length,
      filename: `vendor-migration-list-${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  /**
   * Get migration progress dashboard data
   */
  async getMigrationStatus(tenantId) {
    const { vendors, stats } = await this.trackMigration(tenantId);

    return {
      summary: {
        totalVendors: stats.total,
        migrated: stats.migrated,
        pending: stats.pending,
        completionRate: parseFloat(stats.migrationRate)
      },
      recentActivity: vendors
        .filter(v => !v.migratedToAccounts)
        .slice(0, 10)  // Top 10 pending migrations
        .map(v => ({
          vendor: v.vendor,
          priority: v.priorityLabel,
          lastInvoice: v.lastInvoiceDate,
          receiptCount: v.receiptCount
        })),
      completedMigrations: vendors
        .filter(v => v.migratedToAccounts)
        .slice(0, 5)  // Recent 5 completed
        .map(v => ({
          vendor: v.vendor,
          migratedTo: 'accounts@act.place'
        }))
    };
  }

  /**
   * Calculate priority score based on last invoice date
   * More recent = higher priority
   */
  calculatePriority(lastInvoiceDate) {
    if (!lastInvoiceDate) return 0;

    const daysSince = this.daysSince(lastInvoiceDate);

    // Score: 100 (today) → 0 (90+ days ago)
    if (daysSince <= 7) return 100;
    if (daysSince <= 30) return 80;
    if (daysSince <= 90) return 50;
    return 20;
  }

  /**
   * Get priority label
   */
  getPriorityLabel(lastInvoiceDate) {
    if (!lastInvoiceDate) return 'Low';

    const daysSince = this.daysSince(lastInvoiceDate);

    if (daysSince <= 7) return 'High';
    if (daysSince <= 30) return 'Medium';
    return 'Low';
  }

  /**
   * Calculate days since a date
   */
  daysSince(date) {
    const then = new Date(date);
    const now = new Date();
    const diffTime = now - then;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Escape CSV field (handle commas, quotes, newlines)
   */
  escapeCSV(field) {
    if (field === null || field === undefined) return '';

    const str = String(field);

    // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Mark vendor as migrated (manual confirmation)
   */
  async markVendorAsMigrated(tenantId, vendor) {
    console.log(`[Email Consolidation] Marking ${vendor} as migrated for tenant ${tenantId}`);

    // Update all subscriptions for this vendor to use accounts@act.place
    const { data, error } = await this.supabase
      .from('discovered_subscriptions')
      .update({ account_email: 'accounts@act.place' })
      .eq('tenant_id', tenantId)
      .eq('vendor', vendor);

    if (error) {
      console.error('[Email Consolidation] Error marking vendor as migrated:', error);
      throw error;
    }

    console.log(`[Email Consolidation] Successfully marked ${vendor} as migrated`);

    return {
      success: true,
      vendor,
      message: `${vendor} has been marked as migrated to accounts@act.place`
    };
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Email Consolidation Migration Tracker',
  hypothesis: 'Automated vendor contact tracking + CSV export reduces email consolidation migration time by 70% (from 4hrs to ~1hr for 50 vendors)',
  methodology: 'Extract sender emails from Gmail messages, group by vendor, track migration status per vendor, generate CSV for manual billing email updates, prioritize by invoice recency',
  successMetric: '100% vendor coverage, migration task completion in <2 hours, successful full migration within 3 months',
  findings: 'TBD after migration completion and user feedback',
  category: 'Software Development',
  technicalUncertainty: 'Optimal prioritization strategy and automation level for vendor contact migration workflow without introducing errors or missed vendors',
  estimatedHours: 3.0
};

export default EmailConsolidationTracker;
