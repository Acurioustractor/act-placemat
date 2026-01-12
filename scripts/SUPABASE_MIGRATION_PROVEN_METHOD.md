# 🔒 PROVEN SUPABASE MIGRATION METHOD

**This is the ONLY method that works. Use this EVERY time.**

## ❌ What DOESN'T Work

1. ❌ Supabase Studio SQL Editor (user can't log in)
2. ❌ Supabase REST API `/rest/v1/rpc/exec` (endpoint doesn't exist)
3. ❌ Pooler connection with JWT token (authentication fails)
4. ❌ Supabase CLI `db push` (various auth issues)
5. ❌ Node.js `pg` client with wrong credentials

## ✅ What WORKS - Direct `psql` Connection

### Connection Details

```bash
DB_HOST="aws-0-ap-southeast-2.pooler.supabase.com"
DB_PORT="5432"                                    # NOT 6543!
DB_NAME="postgres"
DB_USER="postgres.tednluwflfhxyucgwigh"          # Note the "postgres." prefix
DB_PASSWORD="vixwek-Hafsaz-0ganxa"                # From Supabase dashboard settings
```

### Method 1: Shell Script (Recommended)

Use the proven script pattern from [scripts/apply-email-migration-psql.sh](scripts/apply-email-migration-psql.sh):

```bash
#!/bin/bash
set -e

MIGRATION_FILE="/path/to/migration.sql"

# Database connection
DB_HOST="aws-0-ap-southeast-2.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.tednluwflfhxyucgwigh"

# Check password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "❌ Set SUPABASE_DB_PASSWORD environment variable"
  exit 1
fi

PASSWORD="${SUPABASE_DB_PASSWORD}"

# Execute migration
PGPASSWORD="$PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$MIGRATION_FILE"
```

Run with:
```bash
export SUPABASE_DB_PASSWORD='vixwek-Hafsaz-0ganxa'
./scripts/apply-your-migration-psql.sh
```

### Method 2: Direct psql Command

```bash
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql \
  -h aws-0-ap-southeast-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.tednluwflfhxyucgwigh \
  -d postgres \
  -f /path/to/migration.sql
```

### Method 3: Node.js pg Client (For programmatic use)

```javascript
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'aws-0-ap-southeast-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.tednluwflfhxyucgwigh',
  password: 'vixwek-Hafsaz-0ganxa'
});

await client.connect();
const sql = readFileSync('/path/to/migration.sql', 'utf8');
await client.query(sql);
await client.end();
```

## 🔑 Critical Details

1. **Port**: MUST be `5432`, NOT `6543` (6543 is for pooler mode but requires different auth)
2. **User**: MUST have `postgres.` prefix: `postgres.tednluwflfhxyucgwigh`
3. **Password**: Get from Supabase Dashboard → Project Settings → Database → Database Password
4. **Host**: Use the ap-southeast-2 region pooler (matches project region)

## 📝 How to Create New Migration Scripts

Copy the proven pattern:

```bash
cp scripts/apply-email-migration-psql.sh scripts/apply-YOUR-NEW-migration-psql.sh
```

Then update:
1. `MIGRATION_FILE` path
2. Table verification query (optional)
3. chmod +x the script

## 🚨 Remember

- **DO NOT** try Supabase Studio
- **DO NOT** try different connection string formats
- **DO NOT** experiment with other methods
- **USE** this proven method every single time

## 🎉 Success Pattern

Email Intelligence migration (Jan 2026):
- Used: `scripts/apply-email-migration-psql.sh`
- Result: ✅ Created `email_financial_documents` table with all indexes and views
- Extracted: 192 subscriptions across 4 accounts
- Saved: 100% success rate (192/192)

## 📚 Related Files

- Working script: [scripts/apply-email-migration-psql.sh](scripts/apply-email-migration-psql.sh)
- Original template: [scripts/apply-migration-psql.sh](scripts/apply-migration-psql.sh)
- Migration SQL: [supabase/migrations/20260130000002_email_financial_intelligence.sql](../supabase/migrations/20260130000002_email_financial_intelligence.sql)
