/**
 * Direct Xero Reconciliation - No Token Manager Dependency
 * Uses fresh auth flow and direct Xero API calls
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';
import { FuzzyMatcher } from './subscription-tracker/services/reconciliation/fuzzyMatcher.js';
import express from 'express';
import fs from 'fs';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';
const PORT = 4000;  // MUST match XERO_REDIRECT_URI

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const fuzzyMatcher = new FuzzyMatcher({
  vendorThreshold: 0.7,
  amountTolerance: 0.05,
  dateDaysWindow: 60,  // 60 days window (email vs bank clearing)
  minConfidence: 0.6
});

console.log('💰 DIRECT XERO RECONCILIATION');
console.log('='.repeat(80));
console.log('');

// Check if we have valid Xero tokens
let xeroAccessToken = process.env.XERO_ACCESS_TOKEN;
let xeroRefreshToken = process.env.XERO_REFRESH_TOKEN;
const xeroTenantId = process.env.XERO_TENANT_ID;

if (!xeroRefreshToken || !xeroTenantId) {
  console.log('⚠️  No Xero credentials found. Starting auth flow...\n');
  await startAuthFlow();
} else {
  // Try to use existing token or refresh
  try {
    await runReconciliation();
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n⚠️  Token expired. Refreshing...\n');
      await refreshTokens();
      await runReconciliation();
    } else {
      throw error;
    }
  }
}

async function startAuthFlow() {
  return new Promise((resolve, reject) => {
    const app = express();
    let server;

    app.get('/connect', (req, res) => {
      const scopes = [
        'offline_access',
        'accounting.transactions.read',
        'accounting.reports.read',
        'accounting.contacts.read',
        'accounting.settings.read'
      ];

      const authUrl = new URL('https://login.xero.com/identity/connect/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', process.env.XERO_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `http://localhost:${PORT}/api/xero/callback`);
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('state', 'direct_flow');

      console.log(`🔗 Redirecting to Xero...`);
      res.redirect(authUrl.toString());
    });

    app.get('/api/xero/callback', async (req, res) => {
      const { code, error } = req.query;

      if (error) {
        console.error(`❌ OAuth error: ${error}`);
        res.status(400).send(`Error: ${error}`);
        server.close();
        return reject(new Error(error));
      }

      try {
        // Exchange code for tokens
        const tokenUrl = 'https://identity.xero.com/connect/token';
        const auth = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `http://localhost:${PORT}/api/xero/callback`
          }).toString()
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
        }

        xeroAccessToken = tokenData.access_token;
        xeroRefreshToken = tokenData.refresh_token;

        // Get tenant ID
        const connectionsResponse = await fetch('https://api.xero.com/connections', {
          headers: {
            'Authorization': `Bearer ${xeroAccessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const connections = await connectionsResponse.json();
        const tenantId = connections[0]?.tenantId;

        console.log(`\n✅ Authenticated! Tenant: ${connections[0]?.tenantName}`);
        console.log(`   Tenant ID: ${tenantId}\n`);

        // Save to .env
        const envPath = '/Users/benknight/Code/ACT Placemat/.env';
        let envContent = fs.readFileSync(envPath, 'utf8');

        envContent = envContent.replace(/^XERO_ACCESS_TOKEN=.*$/m, `XERO_ACCESS_TOKEN=${xeroAccessToken}`);
        envContent = envContent.replace(/^XERO_REFRESH_TOKEN=.*$/m, `XERO_REFRESH_TOKEN=${xeroRefreshToken}`);

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Tokens saved to .env\n');

        res.send('<h1>✅ Connected!</h1><p>You can close this window and return to the terminal.</p>');

        server.close();
        setTimeout(async () => {
          await runReconciliation();
          resolve();
        }, 1000);

      } catch (error) {
        console.error('❌ Auth error:', error.message);
        res.status(500).send(`Error: ${error.message}`);
        server.close();
        reject(error);
      }
    });

    server = app.listen(PORT, () => {
      console.log(`\n📍 Open this URL to authenticate:`);
      console.log(`   http://localhost:${PORT}/connect\n`);
    });
  });
}

async function refreshTokens() {
  const tokenUrl = 'https://identity.xero.com/connect/token';
  const auth = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: xeroRefreshToken
    }).toString()
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  xeroAccessToken = data.access_token;
  xeroRefreshToken = data.refresh_token;

  console.log('✅ Tokens refreshed\n');
}

async function runReconciliation() {
  console.log('Step 1: Fetching unmatched subscriptions...\n');

  const { data: unmatchedDocs, error: docsError } = await supabase
    .from('email_financial_documents')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .is('xero_transaction_id', null)
    .order('transaction_date', { ascending: false });

  if (docsError) throw docsError;

  console.log(`✅ Found ${unmatchedDocs.length} unmatched documents\n`);

  if (unmatchedDocs.length === 0) {
    console.log('🎉 All documents already reconciled!');
    process.exit(0);
  }

  console.log('Step 2: Fetching Xero transactions...\n');

  // Fetch bank transactions from Xero
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - 18);

  const xeroResponse = await fetch(
    `https://api.xero.com/api.xro/2.0/BankTransactions?where=Type%3D%3D%22SPEND%22%20AND%20Status%3D%3D%22AUTHORISED%22`,
    {
      headers: {
        'Authorization': `Bearer ${xeroAccessToken}`,
        'xero-tenant-id': xeroTenantId,
        'Accept': 'application/json'
      }
    }
  );

  if (!xeroResponse.ok) {
    const errorText = await xeroResponse.text();
    throw new Error(`Xero API error (${xeroResponse.status}): ${errorText}`);
  }

  const xeroData = await xeroResponse.json();
  const xeroTransactions = xeroData.BankTransactions || [];

  console.log(`✅ Found ${xeroTransactions.length} Xero transactions\n`);

  // Transform to our format
  const transactions = xeroTransactions.map(txn => ({
    transaction_id: txn.BankTransactionID,
    contact_name: txn.Contact?.Name || 'Unknown',
    amount: parseFloat(txn.Total) || 0,
    date: txn.Date,
    reference: txn.Reference || '',
    description: txn.Reference || txn.Contact?.Name || ''
  }));

  console.log('Step 3: Running fuzzy matching...\n');

  const matchResults = fuzzyMatcher.batchMatch(
    unmatchedDocs.map(doc => ({
      ...doc,
      vendor: doc.vendor,
      amount: doc.amount,
      receipt_date: doc.transaction_date,
      date: doc.transaction_date
    })),
    transactions
  );

  console.log('\nStep 4: Updating database...\n');

  let autoMatched = 0;
  let manualReview = 0;
  let unmatched = 0;

  for (const result of matchResults) {
    const { receipt, match } = result;

    if (match.matched && match.transaction) {
      const status = match.confidence >= 0.8 ? 'auto_matched' : 'manual_review';

      const { error } = await supabase
        .from('email_financial_documents')
        .update({
          xero_transaction_id: match.transaction.transaction_id,
          reconciliation_confidence: match.confidence,
          reconciliation_date: new Date().toISOString(),
          reconciliation_status: status,
          reconciliation_notes: JSON.stringify({
            breakdown: match.breakdown,
            xero_contact: match.transaction.contact_name,
            xero_amount: match.transaction.amount
          })
        })
        .eq('id', receipt.id);

      if (!error) {
        if (status === 'auto_matched') {
          console.log(`  ✅ ${receipt.vendor} → ${match.transaction.contact_name} (${(match.confidence * 100).toFixed(1)}%)`);
          autoMatched++;
        } else {
          console.log(`  ⚠️  ${receipt.vendor} → ${match.transaction.contact_name} (${(match.confidence * 100).toFixed(1)}%)`);
          manualReview++;
        }
      }
    } else {
      unmatched++;
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('🎉 RECONCILIATION COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log(`✅ Auto-matched:   ${autoMatched}`);
  console.log(`⚠️  Manual review:  ${manualReview}`);
  console.log(`❌ Unmatched:      ${unmatched}`);
  console.log('');
  console.log(`Match rate: ${(((autoMatched + manualReview) / matchResults.length) * 100).toFixed(1)}%`);
  console.log('');

  process.exit(0);
}
