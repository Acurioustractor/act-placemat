#!/usr/bin/env node

/**
 * Gmail Token Backup System
 * Automatically backs up Gmail tokens with timestamping
 */

import fs from 'fs/promises';
import path from 'path';

async function backupGmailTokens() {
  const tokenFile = '.gmail_tokens.json';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `.gmail_tokens_backup_${timestamp}.json`;
  
  try {
    // Check if tokens exist
    await fs.access(tokenFile);
    
    // Copy to timestamped backup
    await fs.copyFile(tokenFile, backupFile);
    
    // Update main backup
    await fs.copyFile(tokenFile, '.gmail_tokens_backup.json');
    
    console.log('✅ Gmail tokens backed up successfully:');
    console.log(`   Primary: ${tokenFile}`);
    console.log(`   Backup: .gmail_tokens_backup.json`);
    console.log(`   Timestamped: ${backupFile}`);
    
    // Clean up old timestamped backups (keep last 5)
    const files = await fs.readdir('.');
    const backupFiles = files
      .filter(f => f.startsWith('.gmail_tokens_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();
      
    if (backupFiles.length > 5) {
      const toDelete = backupFiles.slice(5);
      for (const file of toDelete) {
        await fs.unlink(file);
        console.log(`   Cleaned up old backup: ${file}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backupGmailTokens();
}

export default backupGmailTokens;