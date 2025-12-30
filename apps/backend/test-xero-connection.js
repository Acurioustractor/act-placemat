/**
 * Test Xero Connection with Fresh Tokens
 * Verifies the OAuth tokens work by fetching bank transactions
 */

import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const accessToken = process.env.XERO_ACCESS_TOKEN;
const tenantId = process.env.XERO_TENANT_ID;

if (!accessToken || !tenantId) {
  console.error('❌ Missing XERO_ACCESS_TOKEN or XERO_TENANT_ID');
  process.exit(1);
}

console.log('🔍 Testing Xero API Connection...\n');
console.log(`   Tenant ID: ${tenantId}`);
console.log(`   Access Token: ${accessToken.substring(0, 50)}...\n`);

async function testXeroConnection() {
  try {
    // Test 1: Get Bank Transactions
    console.log('1️⃣  Fetching bank transactions...');

    const bankTxResponse = await fetch(
      `https://api.xero.com/api.xro/2.0/BankTransactions`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          'Accept': 'application/json'
        }
      }
    );

    if (!bankTxResponse.ok) {
      const errorText = await bankTxResponse.text();
      console.error(`   ❌ Failed: ${bankTxResponse.status}`);
      console.error(`   Error: ${errorText}\n`);

      if (bankTxResponse.status === 401) {
        console.log('   💡 Token is invalid or expired. Run OAuth flow again.');
      }
      return;
    }

    const bankTxData = await bankTxResponse.json();
    const transactions = bankTxData.BankTransactions || [];

    console.log(`   ✅ Success! Found ${transactions.length} bank transactions\n`);

    if (transactions.length > 0) {
      const recent = transactions.slice(0, 3);
      console.log('   📋 Recent transactions:');
      recent.forEach((tx, i) => {
        const date = tx.Date ? new Date(tx.Date).toLocaleDateString() : 'Unknown';
        const contact = tx.Contact?.Name || 'Unknown';
        const total = tx.Total || 0;
        console.log(`   ${i + 1}. ${date} - ${contact} - $${total}`);
      });
      console.log('');
    }

    // Test 2: Get Contacts (Suppliers)
    console.log('2️⃣  Fetching contacts (suppliers)...');

    const contactsResponse = await fetch(
      `https://api.xero.com/api.xro/2.0/Contacts?where=IsSupplier==true`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          'Accept': 'application/json'
        }
      }
    );

    if (!contactsResponse.ok) {
      console.error(`   ❌ Failed: ${contactsResponse.status}\n`);
      return;
    }

    const contactsData = await contactsResponse.json();
    const contacts = contactsData.Contacts || [];

    console.log(`   ✅ Success! Found ${contacts.length} suppliers\n`);

    if (contacts.length > 0) {
      const sampleContacts = contacts.slice(0, 5);
      console.log('   📋 Sample suppliers:');
      sampleContacts.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.Name}`);
      });
      console.log('');
    }

    // Summary
    console.log('━'.repeat(60));
    console.log('✅ XERO CONNECTION SUCCESSFUL!\n');
    console.log('📊 Summary:');
    console.log(`   • Bank Transactions: ${transactions.length}`);
    console.log(`   • Suppliers: ${contacts.length}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Subscription tracker can now analyze Xero data');
    console.log('   2. Amounts will be populated from bank transactions');
    console.log('   3. Vendors will be matched between Gmail and Xero');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error(error);
  }
}

testXeroConnection()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
