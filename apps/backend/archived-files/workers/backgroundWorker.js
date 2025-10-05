/**
 * Background Worker
 * Handles scheduled tasks and background processing for the Perfect System
 */

import cron from 'node-cron';
import notionSyncEngine from '../services/notionSyncEngine.js';
import intelligentInsightsEngine from '../services/intelligentInsightsEngineSimple.js';
import MultiProviderAI from '../services/multiProviderAI.js';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../utils/loadEnv.js';

loadEnv();

// Initialize services
const ai = new MultiProviderAI();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Worker configuration
const WORKER_TYPE = process.env.WORKER_TYPE || 'scheduler';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

console.log(`🤖 Background Worker Started (Type: ${WORKER_TYPE})`);

/**
 * Scheduled Tasks
 */

// Every minute: Incremental Notion sync
cron.schedule('* * * * *', async () => {
  if (WORKER_TYPE !== 'scheduler') return;
  
  try {
    console.log('⏰ Running incremental Notion sync...');
    await notionSyncEngine.performIncrementalSync();
    console.log('✅ Incremental sync completed');
  } catch (error) {
    console.error('❌ Incremental sync failed:', error);
  }
});

// Every hour: Full Notion sync
cron.schedule('0 * * * *', async () => {
  if (WORKER_TYPE !== 'scheduler') return;
  
  try {
    console.log('⏰ Running full Notion sync...');
    await notionSyncEngine.performFullSync();
    console.log('✅ Full sync completed');
  } catch (error) {
    console.error('❌ Full sync failed:', error);
  }
});

// Every 5 minutes: Generate insights
cron.schedule('*/5 * * * *', async () => {
  if (WORKER_TYPE !== 'scheduler') return;
  
  try {
    console.log('🧠 Generating insights...');
    const insights = await intelligentInsightsEngine.generateInsights('1d');
    
    // Store insights in database
    const { error } = await supabase
      .from('insights')
      .insert({
        type: 'automated',
        data: insights,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    console.log('✅ Insights generated and stored');
  } catch (error) {
    console.error('❌ Insights generation failed:', error);
  }
});

// Every day at 2 AM: Cleanup old data
cron.schedule('0 2 * * *', async () => {
  if (WORKER_TYPE !== 'scheduler') return;
  
  try {
    console.log('🧹 Running daily cleanup...');
    
    // Delete insights older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error } = await supabase
      .from('insights')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());
    
    if (error) throw error;
    
    console.log('✅ Daily cleanup completed');
  } catch (error) {
    console.error('❌ Daily cleanup failed:', error);
  }
});

// Every week: Generate weekly report
cron.schedule('0 9 * * MON', async () => {
  if (WORKER_TYPE !== 'scheduler') return;
  
  try {
    console.log('📊 Generating weekly report...');
    
    // Get week's data
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    const { data: stories } = await supabase
      .from('stories')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    // Generate report content
    const reportPrompt = `
      Generate a weekly summary report:
      - ${projects?.length || 0} new projects
      - ${stories?.length || 0} new stories
      
      Format as a professional weekly update email.
    `;
    
    const report = await ai.generateContent(reportPrompt, 'weekly_report');
    
    if (report.success) {
      // Store report
      await supabase
        .from('reports')
        .insert({
          type: 'weekly',
          content: report.content,
          metrics: {
            new_projects: projects?.length || 0,
            new_stories: stories?.length || 0
          },
          created_at: new Date().toISOString()
        });
      
      console.log('✅ Weekly report generated');
    }
  } catch (error) {
    console.error('❌ Weekly report generation failed:', error);
  }
});

// Health check
cron.schedule('*/30 * * * * *', () => {
  if (IS_PRODUCTION) {
    console.log('💚 Worker health check - OK');
  }
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down worker...');
  
  // Stop all cron jobs
  cron.getTasks().forEach(task => task.stop());
  
  // Allow time for cleanup
  setTimeout(() => {
    console.log('👋 Worker shutdown complete');
    process.exit(0);
  }, 5000);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down worker...');
  process.exit(0);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  if (!IS_PRODUCTION) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Background worker initialized');
console.log('📅 Scheduled tasks:');
console.log('  - Every minute: Incremental sync');
console.log('  - Every hour: Full sync');
console.log('  - Every 5 minutes: Generate insights');
console.log('  - Daily at 2 AM: Cleanup');
console.log('  - Weekly on Monday: Report generation');
