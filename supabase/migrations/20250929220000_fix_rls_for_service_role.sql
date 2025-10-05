-- Fix RLS Policies for Service Role Access
-- Allows backend sync services to write data using service role key
-- Created: 2025-09-29

-- ============================================================================
-- Gmail Tables - Add service role policies
-- ============================================================================

-- gmail_sync_status: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage gmail sync status" ON gmail_sync_status;
CREATE POLICY "Service role can manage gmail sync status"
  ON gmail_sync_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- gmail_messages: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage gmail messages" ON gmail_messages;
CREATE POLICY "Service role can manage gmail messages"
  ON gmail_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- gmail_threads: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage gmail threads" ON gmail_threads;
CREATE POLICY "Service role can manage gmail threads"
  ON gmail_threads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- gmail_contacts: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage gmail contacts" ON gmail_contacts;
CREATE POLICY "Service role can manage gmail contacts"
  ON gmail_contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- gmail_intelligence_insights: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage gmail insights" ON gmail_intelligence_insights;
CREATE POLICY "Service role can manage gmail insights"
  ON gmail_intelligence_insights
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Calendar Tables - Add service role policies
-- ============================================================================

-- calendar_sync_status: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage calendar sync status" ON calendar_sync_status;
CREATE POLICY "Service role can manage calendar sync status"
  ON calendar_sync_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- calendar_events: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage calendar events" ON calendar_events;
CREATE POLICY "Service role can manage calendar events"
  ON calendar_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- calendar_participants: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage calendar participants" ON calendar_participants;
CREATE POLICY "Service role can manage calendar participants"
  ON calendar_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- calendar_intelligence_insights: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage calendar insights" ON calendar_intelligence_insights;
CREATE POLICY "Service role can manage calendar insights"
  ON calendar_intelligence_insights
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- calendar_availability_slots: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage calendar availability" ON calendar_availability_slots;
CREATE POLICY "Service role can manage calendar availability"
  ON calendar_availability_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Xero/Financial Tables - Add service role policies
-- ============================================================================

-- xero_sync_status: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage xero sync status" ON xero_sync_status;
CREATE POLICY "Service role can manage xero sync status"
  ON xero_sync_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- financial_transactions: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage financial transactions" ON financial_transactions;
CREATE POLICY "Service role can manage financial transactions"
  ON financial_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- xero_contacts: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage xero contacts" ON xero_contacts;
CREATE POLICY "Service role can manage xero contacts"
  ON xero_contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- financial_intelligence_insights: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage financial insights" ON financial_intelligence_insights;
CREATE POLICY "Service role can manage financial insights"
  ON financial_intelligence_insights
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- bas_tracking: Allow service role to insert/update
DROP POLICY IF EXISTS "Service role can manage bas tracking" ON bas_tracking;
CREATE POLICY "Service role can manage bas tracking"
  ON bas_tracking
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON POLICY "Service role can manage gmail sync status" ON gmail_sync_status
  IS 'Allows backend sync services to write Gmail sync status using service role key';

COMMENT ON POLICY "Service role can manage gmail messages" ON gmail_messages
  IS 'Allows backend sync services to write Gmail messages using service role key';

COMMENT ON POLICY "Service role can manage calendar events" ON calendar_events
  IS 'Allows backend sync services to write calendar events using service role key';

COMMENT ON POLICY "Service role can manage financial transactions" ON financial_transactions
  IS 'Allows backend sync services to write financial transactions using service role key';