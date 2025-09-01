#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function createMissingTables() {
  console.log("🔄 Checking missing database tables...");

  const tables = [
    "data_quality_audit",
    "normalized_documents",
    "normalized_stories",
    "normalized_storytellers",
  ];

  // Test that tables exist by trying to select from them
  console.log("🔍 Verifying which tables are missing...");

  for (const tableName of tables) {
    const { data, error } = await supabase
      .from(tableName)
      .select("id")
      .limit(0);

    if (error) {
      console.log(`❌ ${tableName}: Missing - ${error.message}`);
    } else {
      console.log(`✅ ${tableName}: Exists`);
    }
  }

  console.log(
    "\n📝 To fix missing tables, please run this SQL in your Supabase dashboard SQL editor:",
  );
  console.log("");
  console.log(`
-- Create simplified versions of missing tables
CREATE TABLE IF NOT EXISTS data_quality_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  quality_check_type TEXT NOT NULL DEFAULT 'validation',
  quality_score_before NUMERIC(5,2) DEFAULT 0,
  quality_score_after NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS normalized_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'story',
  source_id UUID,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS normalized_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS normalized_storytellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID,
  full_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
  `);

  console.log(
    "\nAfter running the SQL above, the backend errors should be resolved.",
  );
}

createMissingTables().catch(console.error);
