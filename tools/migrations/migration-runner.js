#!/usr/bin/env node

/**
 * Database Migration Runner
 * Manages database schema migrations and data seeding
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class MigrationRunner {
  constructor() {
    this.migrationsPath = path.resolve(process.cwd(), 'apps/backend/database/migrations');
    this.seedsPath = path.resolve(process.cwd(), 'tools/seeds');
  }

  // Initialize migrations tracking table
  async initializeMigrationsTable() {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
          version TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT now(),
          checksum TEXT,
          execution_time_ms INTEGER
        );
        
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
        ON public.schema_migrations (executed_at);
      `
    });

    if (error) {
      throw new Error(`Failed to initialize migrations table: ${error.message}`);
    }

    console.log(chalk.green('✅ Migrations table initialized'));
  }

  // Get list of applied migrations
  async getAppliedMigrations() {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version, name, executed_at')
      .order('version');

    if (error) {
      throw new Error(`Failed to get applied migrations: ${error.message}`);
    }

    return data || [];
  }

  // Get list of pending migrations
  async getPendingMigrations() {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    const migrationFiles = await fs.readdir(this.migrationsPath);
    const pendingMigrations = [];

    for (const file of migrationFiles.sort()) {
      if (!file.endsWith('.sql')) continue;

      const version = this.extractVersionFromFilename(file);
      if (version && !appliedVersions.has(version)) {
        pendingMigrations.push({
          version,
          name: this.extractNameFromFilename(file),
          filename: file,
          path: path.join(this.migrationsPath, file)
        });
      }
    }

    return pendingMigrations;
  }

  // Extract version from filename (e.g., "2024-01-15-1000" from "2024-01-15-1000-initial-schema.sql")
  extractVersionFromFilename(filename) {
    const match = filename.match(/^(\d{4}-\d{2}-\d{2}-\d{4})/);
    return match ? match[1] : null;
  }

  // Extract name from filename
  extractNameFromFilename(filename) {
    const version = this.extractVersionFromFilename(filename);
    if (!version) return filename;
    
    return filename
      .replace(`${version}-`, '')
      .replace('.sql', '')
      .replace(/-/g, ' ');
  }

  // Calculate checksum for migration content
  async calculateChecksum(content) {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Execute a single migration
  async executeMigration(migration) {
    const startTime = Date.now();
    
    console.log(chalk.blue(`📦 Executing migration: ${migration.name}`));
    
    try {
      const content = await fs.readFile(migration.path, 'utf-8');
      const checksum = await this.calculateChecksum(content);

      // Execute the migration SQL
      const { error: migrationError } = await supabase.rpc('exec_sql', {
        sql: content
      });

      if (migrationError) {
        throw new Error(`Migration failed: ${migrationError.message}`);
      }

      const executionTime = Date.now() - startTime;

      // Record successful migration
      const { error: recordError } = await supabase
        .from('schema_migrations')
        .insert({
          version: migration.version,
          name: migration.name,
          checksum,
          execution_time_ms: executionTime
        });

      if (recordError) {
        throw new Error(`Failed to record migration: ${recordError.message}`);
      }

      console.log(chalk.green(`✅ Migration completed in ${executionTime}ms`));
      return true;

    } catch (error) {
      console.error(chalk.red(`❌ Migration failed: ${error.message}`));
      throw error;
    }
  }

  // Run all pending migrations
  async runMigrations() {
    console.log(chalk.blue('\n🚀 Starting database migrations...\n'));

    await this.initializeMigrationsTable();
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log(chalk.yellow('📋 No pending migrations found'));
      return;
    }

    console.log(chalk.blue(`📦 Found ${pendingMigrations.length} pending migrations:`));
    pendingMigrations.forEach(m => {
      console.log(chalk.gray(`  - ${m.version}: ${m.name}`));
    });
    console.log();

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    console.log(chalk.green('\n✅ All migrations completed successfully!\n'));
  }

  // Get list of seed files
  async getSeedFiles() {
    try {
      const seedFiles = await fs.readdir(this.seedsPath);
      return seedFiles
        .filter(file => file.endsWith('.js') || file.endsWith('.json'))
        .sort()
        .map(file => ({
          name: file.replace(/\.(js|json)$/, ''),
          filename: file,
          path: path.join(this.seedsPath, file)
        }));
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(chalk.yellow('📋 No seeds directory found'));
        return [];
      }
      throw error;
    }
  }

  // Execute a seed file
  async executeSeed(seed) {
    console.log(chalk.blue(`🌱 Executing seed: ${seed.name}`));

    try {
      if (seed.filename.endsWith('.js')) {
        // Dynamic import for ES modules
        const seedModule = await import(seed.path);
        const seedFunction = seedModule.default || seedModule.seed;
        
        if (typeof seedFunction === 'function') {
          await seedFunction(supabase);
        } else {
          throw new Error('Seed file must export a default function');
        }
      } else if (seed.filename.endsWith('.json')) {
        // JSON data seed
        const data = JSON.parse(await fs.readFile(seed.path, 'utf-8'));
        
        // Assume JSON structure: { "table": "table_name", "data": [...] }
        if (data.table && data.data) {
          const { error } = await supabase
            .from(data.table)
            .insert(data.data);
          
          if (error) {
            throw new Error(`Failed to insert seed data: ${error.message}`);
          }
        } else {
          throw new Error('JSON seed must have "table" and "data" properties');
        }
      }

      console.log(chalk.green(`✅ Seed completed: ${seed.name}`));

    } catch (error) {
      console.error(chalk.red(`❌ Seed failed: ${error.message}`));
      throw error;
    }
  }

  // Run all seeds
  async runSeeds() {
    console.log(chalk.blue('\n🌱 Starting database seeding...\n'));

    const seedFiles = await this.getSeedFiles();

    if (seedFiles.length === 0) {
      console.log(chalk.yellow('📋 No seed files found'));
      return;
    }

    console.log(chalk.blue(`🌱 Found ${seedFiles.length} seed files:`));
    seedFiles.forEach(s => {
      console.log(chalk.gray(`  - ${s.name}`));
    });
    console.log();

    for (const seed of seedFiles) {
      await this.executeSeed(seed);
    }

    console.log(chalk.green('\n✅ All seeds completed successfully!\n'));
  }

  // Show migration status
  async showStatus() {
    console.log(chalk.blue('\n📊 Migration Status\n'));

    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();

    console.log(chalk.green(`✅ Applied migrations: ${applied.length}`));
    applied.forEach(m => {
      console.log(chalk.gray(`  - ${m.version}: ${m.name} (${m.executed_at})`));
    });

    console.log(chalk.yellow(`⏳ Pending migrations: ${pending.length}`));
    pending.forEach(m => {
      console.log(chalk.gray(`  - ${m.version}: ${m.name}`));
    });

    console.log();
  }

  // Create a new migration file
  async createMigration(name) {
    const timestamp = new Date().toISOString()
      .slice(0, 16)
      .replace('T', '-')
      .replace(':', '');
    
    const filename = `${timestamp}-${name.replace(/\s+/g, '-').toLowerCase()}.sql`;
    const filepath = path.join(this.migrationsPath, filename);

    const template = `-- ${name}
-- Created: ${new Date().toISOString()}

BEGIN;

-- Add your migration SQL here
-- Example:
-- CREATE TABLE IF NOT EXISTS example_table (
--   id BIGSERIAL PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );

COMMIT;
`;

    await fs.writeFile(filepath, template);
    console.log(chalk.green(`✅ Created migration: ${filename}`));
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'migrate':
        await runner.runMigrations();
        break;
      case 'seed':
        await runner.runSeeds();
        break;
      case 'status':
        await runner.showStatus();
        break;
      case 'create':
        if (!arg) {
          console.error(chalk.red('❌ Migration name required'));
          process.exit(1);
        }
        await runner.createMigration(arg);
        break;
      case 'reset':
        console.log(chalk.yellow('⚠️  Database reset not implemented for safety'));
        break;
      default:
        console.log(chalk.blue(`
Database Migration Runner

Usage:
  node migration-runner.js migrate  - Run pending migrations
  node migration-runner.js seed     - Run seed files
  node migration-runner.js status   - Show migration status
  node migration-runner.js create <name> - Create new migration file

Examples:
  node migration-runner.js migrate
  node migration-runner.js seed
  node migration-runner.js create "add user preferences table"
        `));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MigrationRunner;