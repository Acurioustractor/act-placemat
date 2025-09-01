/**
 * Fix Database Constraints for SLA Monitoring
 * Resolves constraint violations preventing alert storage
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixDatabaseConstraints() {
  console.log('🔍 Checking database structure for SLA monitoring...');

  try {
    // Check if sla_alerts table exists
    const { data: alertsData, error: alertsError } = await supabase
      .from('sla_alerts')
      .select('*')
      .limit(1);

    if (alertsError) {
      console.log('⚠️ sla_alerts table issue:', alertsError.message);
      
      if (alertsError.message.includes('does not exist')) {
        console.log('📝 Creating sla_alerts table...');
        await createSlaAlertsTable();
      }
    } else {
      console.log('✅ sla_alerts table exists and accessible');
    }

    // Check community_events table constraints
    const { data: eventsData, error: eventsError } = await supabase
      .from('community_events')
      .select('*')
      .limit(1);

    if (eventsError) {
      console.log('⚠️ community_events table issue:', eventsError.message);
    } else {
      console.log('✅ community_events table exists and accessible');
    }

    // Test inserting a simple alert
    await testAlertInsertion();

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

async function createSlaAlertsTable() {
  console.log('Creating sla_alerts table with proper constraints...');
  
  // This would typically be done via Supabase dashboard or SQL migration
  // For now, let's just log what needs to be done
  console.log(`
📋 Manual SQL needed in Supabase Dashboard:

CREATE TABLE IF NOT EXISTS sla_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT UNIQUE NOT NULL,
  alert_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('data_freshness', 'api_performance', 'data_quality', 'processing_performance', 'system_health')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'warning', 'high', 'critical')),
  score NUMERIC,
  issues JSONB DEFAULT '[]',
  details JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_alerts_category ON sla_alerts(category);
CREATE INDEX IF NOT EXISTS idx_sla_alerts_severity ON sla_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_sla_alerts_created ON sla_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE sla_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY sla_alerts_service_access ON sla_alerts
  FOR ALL USING (true);
  `);
}

async function testAlertInsertion() {
  console.log('🧪 Testing alert insertion...');

  const testAlert = {
    alert_id: `test_${Date.now()}`,
    alert_type: 'data_freshness',
    category: 'data_freshness', // This should match our constraint
    severity: 'warning',
    score: 0.65,
    issues: ['Test alert for constraint validation'],
    details: { test: true },
    acknowledged: false
  };

  const { data, error } = await supabase
    .from('sla_alerts')
    .insert([testAlert])
    .select();

  if (error) {
    console.log('❌ Test alert insertion failed:', error.message);
    
    // If table doesn't exist, provide guidance
    if (error.message.includes('does not exist')) {
      console.log('📝 sla_alerts table needs to be created manually in Supabase Dashboard');
    } else if (error.message.includes('constraint')) {
      console.log('📝 Constraint issue detected - category values may need adjustment');
    }
  } else {
    console.log('✅ Test alert inserted successfully:', data);
    
    // Clean up test data
    await supabase
      .from('sla_alerts')
      .delete()
      .eq('alert_id', testAlert.alert_id);
    
    console.log('🧹 Test data cleaned up');
  }
}

async function checkSlaComplianceTable() {
  console.log('🔍 Checking sla_compliance table...');

  const { data, error } = await supabase
    .from('sla_compliance')
    .select('*')
    .limit(1);

  if (error) {
    console.log('⚠️ sla_compliance table issue:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log(`
📋 Manual SQL needed for sla_compliance table:

CREATE TABLE IF NOT EXISTS sla_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  overall_score NUMERIC NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
  data_freshness_score NUMERIC CHECK (data_freshness_score >= 0 AND data_freshness_score <= 1),
  api_performance_score NUMERIC CHECK (api_performance_score >= 0 AND api_performance_score <= 1),
  data_quality_score NUMERIC CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  processing_performance_score NUMERIC CHECK (processing_performance_score >= 0 AND processing_performance_score <= 1),
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_compliance_period ON sla_compliance(period_start DESC, period_end DESC);
ALTER TABLE sla_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_compliance_service_access ON sla_compliance FOR ALL USING (true);
      `);
    }
  } else {
    console.log('✅ sla_compliance table exists and accessible');
  }
}

// Run the checks
console.log('🚀 Starting database constraint diagnostics...');
await checkAndFixDatabaseConstraints();
await checkSlaComplianceTable();
console.log('✨ Database diagnostics complete!');