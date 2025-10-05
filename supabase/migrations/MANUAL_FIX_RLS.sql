-- MANUAL FIX: Run this in Supabase SQL Editor
-- This adds service role policies to allow backend sync

-- Gmail tables
CREATE POLICY IF NOT EXISTS "Service role full access" ON gmail_sync_status FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON gmail_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON gmail_threads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON gmail_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON gmail_intelligence_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Calendar tables
CREATE POLICY IF NOT EXISTS "Service role full access" ON calendar_sync_status FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON calendar_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON calendar_participants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON calendar_intelligence_insights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON calendar_availability_slots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Financial tables
CREATE POLICY IF NOT EXISTS "Service role full access" ON xero_sync_status FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON financial_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON xero_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON financial_intelligence_insights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON bas_tracking FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT 'RLS policies updated for service role' AS status;