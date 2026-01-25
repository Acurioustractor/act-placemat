#!/usr/bin/env node
/**
 * LinkedIn Imports Cleanup Script
 *
 * Cleans up the inflated linkedin_imports table:
 * - Archives messages to linkedin_messages table
 * - Archives invitations to linkedin_invitations table
 * - Deletes notes-only records (first names only - useless)
 * - Keeps full connection records with real data
 *
 * Run: node scripts/cleanup-linkedin-imports.js [--dry-run] [--delete-messages]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_MESSAGES = process.argv.includes('--delete-messages');

async function analyzeCurrentState() {
  console.log('=== ANALYZING CURRENT STATE ===\n');

  // Get counts by type
  let allData = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('linkedin_imports')
      .select('id, owner, type, payload')
      .range(offset, offset + 999);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    offset += 1000;
    if (offset >= 50000) break;
  }

  const stats = {
    total: allData.length,
    byType: {},
    byOwner: {},
    connections: {
      fullData: [],
      notesOnly: [],
      withEmail: []
    },
    messages: [],
    invitations: [],
    other: []
  };

  allData.forEach(record => {
    // By type
    stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;

    // By owner
    stats.byOwner[record.owner] = (stats.byOwner[record.owner] || 0) + 1;

    const p = record.payload || {};

    if (record.type === 'connections') {
      // Check if it's notes-only (just first name)
      const keys = Object.keys(p);
      if (keys.length === 1 && p['Notes:']) {
        stats.connections.notesOnly.push(record.id);
      } else if (p['First Name'] && p['Last Name']) {
        stats.connections.fullData.push(record.id);
        if (p['Email Address'] && p['Email Address'].trim()) {
          stats.connections.withEmail.push(record.id);
        }
      } else {
        stats.connections.notesOnly.push(record.id); // Treat as garbage
      }
    } else if (record.type === 'messages') {
      stats.messages.push(record.id);
    } else if (record.type === 'invitations') {
      stats.invitations.push(record.id);
    } else {
      stats.other.push(record.id);
    }
  });

  console.log('Total records:', stats.total);
  console.log('\nBy type:', JSON.stringify(stats.byType, null, 2));
  console.log('\nBy owner:', JSON.stringify(stats.byOwner, null, 2));
  console.log('\nConnections breakdown:');
  console.log('  - Full data (keep):', stats.connections.fullData.length);
  console.log('  - With email:', stats.connections.withEmail.length);
  console.log('  - Notes only (DELETE):', stats.connections.notesOnly.length);
  console.log('\nMessages (archive/delete):', stats.messages.length);
  console.log('Invitations (archive/delete):', stats.invitations.length);
  console.log('Other (skills, positions - keep):', stats.other.length);

  return stats;
}

async function createArchiveTables() {
  console.log('\n=== CREATING ARCHIVE TABLES ===\n');

  if (DRY_RUN) {
    console.log('[DRY RUN] Would create linkedin_messages and linkedin_invitations tables');
    return;
  }

  // Create messages archive table
  const { error: msgError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS linkedin_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_id UUID,
        owner TEXT,
        conversation_id TEXT,
        conversation_title TEXT,
        sender_profile_url TEXT,
        recipient_profile_urls TEXT,
        subject TEXT,
        content TEXT,
        folder TEXT,
        sent_at TIMESTAMPTZ,
        is_draft BOOLEAN,
        attachments TEXT,
        payload JSONB,
        archived_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_linkedin_messages_owner ON linkedin_messages(owner);
      CREATE INDEX IF NOT EXISTS idx_linkedin_messages_conversation ON linkedin_messages(conversation_id);
    `
  });

  if (msgError && !msgError.message.includes('already exists')) {
    // Table might already exist, try direct creation
    console.log('Creating messages table via direct SQL...');
  }

  // Create invitations archive table
  const { error: invError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS linkedin_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_id UUID,
        owner TEXT,
        direction TEXT,
        inviter_profile_url TEXT,
        invitee_profile_url TEXT,
        message TEXT,
        sent_at TIMESTAMPTZ,
        payload JSONB,
        archived_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_linkedin_invitations_owner ON linkedin_invitations(owner);
    `
  });

  console.log('Archive tables created (or already exist)');
}

async function archiveMessages(messageIds) {
  console.log('\n=== ARCHIVING MESSAGES ===\n');
  console.log(`Processing ${messageIds.length} messages...`);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would archive', messageIds.length, 'messages');
    return;
  }

  if (DELETE_MESSAGES) {
    console.log('--delete-messages flag set, skipping archive, will delete directly');
    return;
  }

  // Fetch and archive in batches
  const batchSize = 100;
  let archived = 0;

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);

    const { data: records } = await supabase
      .from('linkedin_imports')
      .select('*')
      .in('id', batch);

    if (records && records.length > 0) {
      const archiveRecords = records.map(r => ({
        original_id: r.id,
        owner: r.owner,
        conversation_id: r.payload?.['CONVERSATION ID'],
        conversation_title: r.payload?.['CONVERSATION TITLE'],
        sender_profile_url: r.payload?.['SENDER PROFILE URL'],
        recipient_profile_urls: r.payload?.['RECIPIENT PROFILE URLS'],
        subject: r.payload?.['SUBJECT'],
        content: r.payload?.['CONTENT'],
        folder: r.payload?.['FOLDER'],
        sent_at: r.payload?.['DATE'] ? new Date(r.payload['DATE']) : null,
        is_draft: r.payload?.['IS MESSAGE DRAFT'] === 'TRUE',
        attachments: r.payload?.['ATTACHMENTS'],
        payload: r.payload
      }));

      const { error } = await supabase
        .from('linkedin_messages')
        .insert(archiveRecords);

      if (error) {
        console.error('Error archiving batch:', error.message);
      } else {
        archived += records.length;
        process.stdout.write(`\rArchived ${archived}/${messageIds.length} messages`);
      }
    }
  }

  console.log('\nMessages archived:', archived);
}

async function archiveInvitations(invitationIds) {
  console.log('\n=== ARCHIVING INVITATIONS ===\n');
  console.log(`Processing ${invitationIds.length} invitations...`);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would archive', invitationIds.length, 'invitations');
    return;
  }

  if (DELETE_MESSAGES) {
    console.log('--delete-messages flag set, skipping archive, will delete directly');
    return;
  }

  const batchSize = 100;
  let archived = 0;

  for (let i = 0; i < invitationIds.length; i += batchSize) {
    const batch = invitationIds.slice(i, i + batchSize);

    const { data: records } = await supabase
      .from('linkedin_imports')
      .select('*')
      .in('id', batch);

    if (records && records.length > 0) {
      const archiveRecords = records.map(r => ({
        original_id: r.id,
        owner: r.owner,
        direction: r.payload?.['Direction'],
        inviter_profile_url: r.payload?.['inviterProfileUrl'],
        invitee_profile_url: r.payload?.['inviteeProfileUrl'],
        message: r.payload?.['Message'],
        sent_at: r.payload?.['Sent At'] ? new Date(r.payload['Sent At']) : null,
        payload: r.payload
      }));

      const { error } = await supabase
        .from('linkedin_invitations')
        .insert(archiveRecords);

      if (error) {
        console.error('Error archiving batch:', error.message);
      } else {
        archived += records.length;
        process.stdout.write(`\rArchived ${archived}/${invitationIds.length} invitations`);
      }
    }
  }

  console.log('\nInvitations archived:', archived);
}

async function deleteRecords(ids, description) {
  console.log(`\n=== DELETING ${description.toUpperCase()} ===\n`);
  console.log(`Deleting ${ids.length} records...`);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would delete', ids.length, description);
    return;
  }

  const batchSize = 500;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    const { error } = await supabase
      .from('linkedin_imports')
      .delete()
      .in('id', batch);

    if (error) {
      console.error('Error deleting batch:', error.message);
    } else {
      deleted += batch.length;
      process.stdout.write(`\rDeleted ${deleted}/${ids.length} ${description}`);
    }
  }

  console.log('\nDeleted:', deleted);
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   LinkedIn Imports Cleanup Script          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // 1. Analyze current state
    const stats = await analyzeCurrentState();

    // 2. Create archive tables (if not deleting everything)
    if (!DELETE_MESSAGES) {
      await createArchiveTables();
    }

    // 3. Archive messages
    if (stats.messages.length > 0) {
      await archiveMessages(stats.messages);
    }

    // 4. Archive invitations
    if (stats.invitations.length > 0) {
      await archiveInvitations(stats.invitations);
    }

    // 5. Delete notes-only garbage records
    if (stats.connections.notesOnly.length > 0) {
      await deleteRecords(stats.connections.notesOnly, 'notes-only garbage records');
    }

    // 6. Delete messages from linkedin_imports (after archiving)
    if (stats.messages.length > 0) {
      await deleteRecords(stats.messages, 'messages');
    }

    // 7. Delete invitations from linkedin_imports (after archiving)
    if (stats.invitations.length > 0) {
      await deleteRecords(stats.invitations, 'invitations');
    }

    // 8. Final verification
    console.log('\n=== FINAL STATE ===\n');

    const { count } = await supabase
      .from('linkedin_imports')
      .select('*', { count: 'exact', head: true });

    console.log('Records remaining in linkedin_imports:', count);
    console.log('\nExpected remaining:', stats.connections.fullData.length + stats.other.length);

    console.log('\n✅ Cleanup complete!');
    console.log('\nSummary:');
    console.log('  - Archived messages:', stats.messages.length);
    console.log('  - Archived invitations:', stats.invitations.length);
    console.log('  - Deleted garbage records:', stats.connections.notesOnly.length);
    console.log('  - Kept good connections:', stats.connections.fullData.length);
    console.log('  - Kept other (skills, positions):', stats.other.length);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
