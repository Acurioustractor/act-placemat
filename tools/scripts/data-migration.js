#!/usr/bin/env node

/**
 * Data Migration Script
 * Migrates existing data between different schema versions or data sources
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DataMigrator {
  constructor() {
    this.batchSize = 1000;
  }

  // Migrate LinkedIn imports to processed contacts
  async migrateLinkedInImportsToContacts() {
    console.log(chalk.blue('🔗 Migrating LinkedIn imports to contacts...'));

    try {
      // Get all connection imports that haven't been processed
      const { data: imports, error: fetchError } = await supabase
        .from('linkedin_imports')
        .select('*')
        .eq('type', 'connections')
        .order('imported_at');

      if (fetchError) {
        throw new Error(`Failed to fetch imports: ${fetchError.message}`);
      }

      if (!imports || imports.length === 0) {
        console.log(chalk.yellow('📋 No LinkedIn imports found to migrate'));
        return;
      }

      console.log(chalk.blue(`📦 Found ${imports.length} import records to process`));

      const contacts = [];
      const processedImportIds = new Set();

      for (const importRecord of imports) {
        const payload = importRecord.payload;
        
        // Skip if we've already processed this specific import
        if (processedImportIds.has(importRecord.id)) {
          continue;
        }

        // Extract contact information from payload
        const firstName = payload['First Name'] || payload.firstName || '';
        const lastName = payload['Last Name'] || payload.lastName || '';
        
        if (!firstName && !lastName) {
          console.warn(chalk.yellow(`⚠️ Skipping import ${importRecord.id}: No name found`));
          continue;
        }

        const linkedinUrl = payload['URL'] || payload.url || payload.linkedin_url;
        const emailAddress = payload['Email Address'] || payload.email || payload.email_address;
        const company = payload['Company'] || payload.company || payload.current_company;
        const position = payload['Position'] || payload.position || payload.current_position;
        const connectedOn = payload['Connected On'] || payload.connected_on || payload.connection_date;

        // Check if this contact already exists (by LinkedIn URL or name combination)
        const existingContact = contacts.find(c => 
          (linkedinUrl && c.linkedin_url === linkedinUrl) ||
          (c.first_name === firstName && c.last_name === lastName && c.current_company === company)
        );

        if (existingContact) {
          // Update existing contact with additional data source
          if (!existingContact.raw_import_ids.includes(importRecord.id)) {
            existingContact.raw_import_ids.push(importRecord.id);
          }
          
          // Update connection source if different
          if (existingContact.connection_source !== importRecord.owner) {
            existingContact.connection_source = 'both';
          }
        } else {
          // Create new contact
          const contact = {
            first_name: firstName,
            last_name: lastName,
            email_address: emailAddress || null,
            linkedin_url: linkedinUrl || null,
            current_position: position || null,
            current_company: company || null,
            location: payload.location || null,
            connected_on: connectedOn ? new Date(connectedOn) : null,
            connection_source: importRecord.owner,
            relationship_score: 0.5, // Default score
            strategic_value: 'unknown',
            alignment_tags: [],
            raw_import_ids: [importRecord.id],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          contacts.push(contact);
        }

        processedImportIds.add(importRecord.id);
      }

      // Insert contacts in batches
      console.log(chalk.blue(`💾 Inserting ${contacts.length} processed contacts...`));

      for (let i = 0; i < contacts.length; i += this.batchSize) {
        const batch = contacts.slice(i, i + this.batchSize);
        
        const { error: insertError } = await supabase
          .from('linkedin_contacts')
          .upsert(batch, { 
            onConflict: 'linkedin_url',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.warn(chalk.yellow(`⚠️ Warning inserting batch ${i / this.batchSize + 1}: ${insertError.message}`));
        } else {
          console.log(chalk.green(`✅ Inserted batch ${i / this.batchSize + 1}/${Math.ceil(contacts.length / this.batchSize)}`));
        }
      }

      console.log(chalk.green(`🎉 Successfully migrated ${contacts.length} LinkedIn contacts!`));

    } catch (error) {
      console.error(chalk.red(`❌ Migration failed: ${error.message}`));
      throw error;
    }
  }

  // Migrate CSV data to structured format
  async migrateCSVToStructured(csvPath, tableName, mapping) {
    console.log(chalk.blue(`📊 Migrating CSV data from ${csvPath} to ${tableName}...`));

    try {
      // Read CSV file
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        console.log(chalk.yellow('📋 No data found in CSV file'));
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataLines = lines.slice(1);

      console.log(chalk.blue(`📦 Found ${dataLines.length} records in CSV`));

      const records = [];

      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const record = {};

        // Map CSV columns to database columns
        for (const [csvColumn, dbColumn] of Object.entries(mapping)) {
          const columnIndex = headers.indexOf(csvColumn);
          if (columnIndex !== -1) {
            record[dbColumn] = values[columnIndex] || null;
          }
        }

        // Add metadata
        record.created_at = new Date().toISOString();
        record.updated_at = new Date().toISOString();

        records.push(record);
      }

      // Insert records in batches
      console.log(chalk.blue(`💾 Inserting ${records.length} records...`));

      for (let i = 0; i < records.length; i += this.batchSize) {
        const batch = records.slice(i, i + this.batchSize);
        
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(batch);

        if (insertError) {
          console.warn(chalk.yellow(`⚠️ Warning inserting batch ${i / this.batchSize + 1}: ${insertError.message}`));
        } else {
          console.log(chalk.green(`✅ Inserted batch ${i / this.batchSize + 1}/${Math.ceil(records.length / this.batchSize)}`));
        }
      }

      console.log(chalk.green(`🎉 Successfully migrated ${records.length} records to ${tableName}!`));

    } catch (error) {
      console.error(chalk.red(`❌ CSV migration failed: ${error.message}`));
      throw error;
    }
  }

  // Clean up duplicate records
  async cleanupDuplicates(tableName, uniqueFields) {
    console.log(chalk.blue(`🧹 Cleaning up duplicates in ${tableName}...`));

    try {
      const fieldList = uniqueFields.join(', ');
      
      // Find duplicates using a CTE
      const { data: duplicates, error: findError } = await supabase.rpc('exec_sql', {
        sql: `
          WITH duplicates AS (
            SELECT ${fieldList}, array_agg(id ORDER BY created_at DESC) as ids
            FROM public.${tableName}
            GROUP BY ${fieldList}
            HAVING count(*) > 1
          )
          SELECT * FROM duplicates;
        `
      });

      if (findError) {
        throw new Error(`Failed to find duplicates: ${findError.message}`);
      }

      if (!duplicates || duplicates.length === 0) {
        console.log(chalk.green('✨ No duplicates found'));
        return;
      }

      console.log(chalk.yellow(`🔍 Found ${duplicates.length} sets of duplicates`));

      let deletedCount = 0;

      // Delete duplicates (keep the first/newest one)
      for (const duplicate of duplicates) {
        const idsToDelete = duplicate.ids.slice(1); // Keep first, delete rest
        
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.warn(chalk.yellow(`⚠️ Warning deleting duplicates: ${deleteError.message}`));
          } else {
            deletedCount += idsToDelete.length;
          }
        }
      }

      console.log(chalk.green(`🎉 Cleaned up ${deletedCount} duplicate records!`));

    } catch (error) {
      console.error(chalk.red(`❌ Cleanup failed: ${error.message}`));
      throw error;
    }
  }

  // Analyze data quality
  async analyzeDataQuality(tableName) {
    console.log(chalk.blue(`📊 Analyzing data quality for ${tableName}...`));

    try {
      // Get table schema
      const { data: columns, error: schemaError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = '${tableName}' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

      if (schemaError) {
        throw new Error(`Failed to get schema: ${schemaError.message}`);
      }

      // Get total record count
      const { count: totalRecords, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Failed to count records: ${countError.message}`);
      }

      console.log(chalk.blue(`📈 Data Quality Report for ${tableName}`));
      console.log(chalk.gray(`Total Records: ${totalRecords}`));
      console.log(chalk.gray('─'.repeat(50)));

      // Analyze each column
      for (const column of columns) {
        const { data: stats, error: statsError } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT 
              COUNT(*) as total_count,
              COUNT(${column.column_name}) as non_null_count,
              COUNT(*) - COUNT(${column.column_name}) as null_count,
              ROUND((COUNT(${column.column_name})::DECIMAL / COUNT(*)) * 100, 2) as fill_rate
            FROM public.${tableName};
          `
        });

        if (statsError) {
          console.warn(chalk.yellow(`⚠️ Could not analyze ${column.column_name}: ${statsError.message}`));
          continue;
        }

        const stat = stats[0];
        const fillRate = stat.fill_rate;
        const fillColor = fillRate >= 90 ? chalk.green : fillRate >= 70 ? chalk.yellow : chalk.red;

        console.log(chalk.gray(`${column.column_name.padEnd(20)} ${fillColor(fillRate + '%')} (${stat.non_null_count}/${stat.total_count})`));
      }

      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.green('✅ Data quality analysis complete'));

    } catch (error) {
      console.error(chalk.red(`❌ Analysis failed: ${error.message}`));
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const migrator = new DataMigrator();
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  try {
    switch (command) {
      case 'linkedin':
        await migrator.migrateLinkedInImportsToContacts();
        break;
      case 'csv':
        if (!arg1 || !arg2) {
          console.error(chalk.red('❌ Usage: node data-migration.js csv <csv-path> <table-name>'));
          process.exit(1);
        }
        // Example mapping - this would be customized per CSV
        const mapping = {
          'Name': 'name',
          'Email': 'email',
          'Company': 'company'
        };
        await migrator.migrateCSVToStructured(arg1, arg2, mapping);
        break;
      case 'cleanup':
        if (!arg1) {
          console.error(chalk.red('❌ Usage: node data-migration.js cleanup <table-name>'));
          process.exit(1);
        }
        // Default cleanup by common unique fields
        const uniqueFields = ['first_name', 'last_name', 'email_address'];
        await migrator.cleanupDuplicates(arg1, uniqueFields);
        break;
      case 'analyze':
        if (!arg1) {
          console.error(chalk.red('❌ Usage: node data-migration.js analyze <table-name>'));
          process.exit(1);
        }
        await migrator.analyzeDataQuality(arg1);
        break;
      default:
        console.log(chalk.blue(`
Data Migration Tool

Usage:
  node data-migration.js linkedin              - Migrate LinkedIn imports to contacts
  node data-migration.js csv <path> <table>    - Migrate CSV file to table
  node data-migration.js cleanup <table>       - Remove duplicate records
  node data-migration.js analyze <table>       - Analyze data quality

Examples:
  node data-migration.js linkedin
  node data-migration.js csv ./data.csv projects
  node data-migration.js cleanup linkedin_contacts
  node data-migration.js analyze linkedin_contacts
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

export default DataMigrator;