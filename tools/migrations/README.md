# Database Migration and Seeding Tools

This directory contains tools for managing database schema migrations and data seeding for the ACT Placemat platform.

## Overview

- **Migration Runner**: Manages database schema changes with version tracking
- **Seed Data**: Provides sample and test data for development and testing
- **Data Migration**: Tools for migrating data between different formats and schemas

## Quick Start

```bash
# Check migration status
npm run db:status

# Run pending migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed

# Create a new migration
npm run db:create-migration "add user preferences table"
```

## Migration Runner

The migration runner (`migration-runner.js`) provides a robust system for managing database schema changes.

### Features

- ✅ Version tracking with checksum validation
- ✅ Rollback-safe transaction handling  
- ✅ Execution time monitoring
- ✅ Automatic dependency ordering
- ✅ Duplicate migration prevention

### Migration File Format

Migrations are stored in `apps/backend/database/migrations/` with the naming convention:
```
YYYY-MM-DD-HHMM-description.sql
```

Example migration file:
```sql
-- Add user preferences table
-- Created: 2024-08-22T01:30:00Z

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON public.user_preferences (user_id);

COMMIT;
```

### Commands

```bash
# Show current migration status
npm run db:status

# Run all pending migrations
npm run db:migrate

# Create a new migration file
npm run db:create-migration "description of changes"
```

## Seed Data

Seed files provide sample data for development and testing. They're located in `tools/seeds/` and can be either JavaScript functions or JSON data files.

### JavaScript Seed Format

```javascript
// tools/seeds/01-example-seed.js
export default async function seedExample(supabase) {
  console.log('🌱 Seeding example data...');
  
  const data = [
    { name: 'Example 1', value: 'test' },
    { name: 'Example 2', value: 'demo' }
  ];

  const { error } = await supabase
    .from('example_table')
    .insert(data);

  if (error) {
    throw new Error(`Seed failed: ${error.message}`);
  }

  console.log(`✅ Inserted ${data.length} example records`);
}
```

### JSON Seed Format

```json
{
  "table": "example_table",
  "data": [
    {
      "name": "Example 1",
      "value": "test",
      "created_at": "2024-08-22T01:30:00Z"
    }
  ]
}
```

### Available Seeds

1. **01-linkedin-contacts-sample.js**: Sample LinkedIn contacts with relationships
2. **02-projects-sample.json**: Community project examples
3. **03-opportunities-sample.js**: Funding opportunity examples

### Commands

```bash
# Run all seed files
npm run db:seed

# Run specific seed (manual)
node tools/migrations/migration-runner.js seed
```

## Data Migration

The data migration tool (`tools/scripts/data-migration.js`) handles data transformations and migrations between different formats.

### Features

- ✅ LinkedIn import processing
- ✅ CSV to database migration
- ✅ Duplicate record cleanup
- ✅ Data quality analysis
- ✅ Batch processing for large datasets

### Commands

```bash
# Migrate LinkedIn imports to processed contacts
npm run data:migrate:linkedin

# Migrate CSV file to database table
npm run data:migrate csv path/to/file.csv table_name

# Clean up duplicate records
npm run data:cleanup table_name

# Analyze data quality
npm run data:analyze table_name
```

### LinkedIn Data Migration

Processes raw LinkedIn CSV imports into structured contact records:

```bash
npm run data:migrate:linkedin
```

This command:
1. Reads from `linkedin_imports` table
2. Processes and deduplicates contact information
3. Creates structured records in `linkedin_contacts`
4. Links back to original import records

### CSV Migration

Generic CSV to database migration:

```bash
npm run data:migrate csv ./data/contacts.csv contacts
```

Requires customizing the column mapping in the script for your specific CSV format.

### Data Quality Analysis

Analyzes table data quality and provides reports:

```bash
npm run data:analyze linkedin_contacts
```

Provides:
- Record counts
- Column fill rates
- Null value analysis
- Data completeness metrics

## Environment Setup

Ensure you have the required environment variables:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The tools will automatically load environment variables from:
- Current directory `.env`
- Repository root `.env`
- Process environment

## Error Handling

All tools include comprehensive error handling:

- **Migration failures**: Automatically rolled back, no partial state
- **Seed failures**: Individual seed failures don't stop the entire process
- **Data migration errors**: Batch processing continues with warnings
- **Network issues**: Automatic retry with exponential backoff

## Best Practices

### Creating Migrations

1. **Use transactions**: Wrap schema changes in `BEGIN`/`COMMIT`
2. **Make idempotent**: Use `IF NOT EXISTS` clauses
3. **Test locally**: Run migrations on development database first
4. **Descriptive names**: Use clear, specific migration names
5. **Small changes**: Keep migrations focused on single concerns

### Writing Seeds

1. **Use upserts**: Handle existing data gracefully
2. **Make realistic**: Use representative sample data
3. **Document purpose**: Include comments explaining the seed's purpose
4. **Test thoroughly**: Ensure seeds work on clean databases

### Data Migration

1. **Backup first**: Always backup production data before migration
2. **Test on copies**: Run migrations on database copies first
3. **Monitor progress**: Use batch processing for large datasets
4. **Validate results**: Check data integrity after migration

## Troubleshooting

### Common Issues

**Migration fails with "relation already exists"**
- Ensure you're using `IF NOT EXISTS` clauses
- Check if migration was partially applied

**Seed data conflicts**
- Use `upsert` with proper conflict resolution
- Check unique constraints and primary keys

**Permission errors**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Ensure the service role has necessary permissions

**Large dataset timeouts**
- Increase batch size in migration scripts
- Use connection pooling for bulk operations

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true npm run db:migrate
```

### Recovery

If migrations fail:

1. Check the `schema_migrations` table for partial state
2. Manually rollback any partial changes
3. Fix the migration file
4. Re-run migrations

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Database Migrations
  run: |
    npm run db:migrate
    npm run db:seed
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Pre-deployment Checks

```bash
# Check migration status
npm run db:status

# Validate all pending migrations
npm run db:migrate --dry-run  # (feature to be implemented)
```

## Contributing

When adding new migrations or seeds:

1. Follow the naming conventions
2. Test on clean database
3. Document any special requirements
4. Update this README if adding new features

## Security Considerations

- **Service Role Key**: Only use in secure environments
- **Data Validation**: Validate all input data before insertion
- **Access Control**: Respect Row Level Security policies
- **Audit Trail**: Migration history is automatically tracked

## Performance Optimization

- **Batch Processing**: Large datasets are processed in configurable batches
- **Index Creation**: Create indexes after bulk data insertion
- **Connection Pooling**: Reuse database connections where possible
- **Memory Management**: Process large files in streams