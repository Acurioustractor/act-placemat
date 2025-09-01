#!/usr/bin/env node

/**
 * QUICK XERO TOKEN REFRESH TEST
 * Tests token refresh with your actual credentials
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: './apps/backend/.env' });

async function testXeroRefresh() {
  console.log('🔄 Testing Xero Token Refresh...\n');

  // Check if we have all required credentials
  const clientId = '5EF385B08FFF41599C456F7B55118776';
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const refreshToken = process.env.XERO_REFRESH_TOKEN;
  const tenantId = process.env.XERO_TENANT_ID;

  console.log('📋 Credentials Check:');
  console.log(`   Client ID: ${clientId ? '✅ Present' : '❌ Missing'}`);
  console.log(`   Client Secret: ${clientSecret ? '✅ Present' : '❌ Missing'}`);
  console.log(`   Refresh Token: ${refreshToken ? '✅ Present' : '❌ Missing'}`);
  console.log(`   Tenant ID: ${tenantId ? '✅ Present' : '❌ Missing'}\n`);

  if (!clientSecret) {
    console.log('❌ MISSING CLIENT SECRET');
    console.log('Please add this line to apps/backend/.env:');
    console.log('XERO_CLIENT_SECRET=your_secret_from_xero_developer_portal\n');
    console.log('Get your client secret from: https://developer.xero.com/myapps');
    return;
  }

  if (!refreshToken) {
    console.log('❌ MISSING REFRESH TOKEN');
    console.log('Your refresh token has expired or is missing.');
    console.log('You need to re-authenticate with Xero to get a new refresh token.');
    return;
  }

  try {
    console.log('🔄 Attempting token refresh...');

    const tokenUrl = 'https://identity.xero.com/connect/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Token refresh failed: ${response.status}`);
      console.log(`Error: ${errorText}\n`);
      
      if (response.status === 400) {
        console.log('💡 This usually means:');
        console.log('   1. Client secret is incorrect');
        console.log('   2. Refresh token has expired');
        console.log('   3. App configuration issue in Xero developer portal');
      }
      return;
    }

    const tokenData = await response.json();
    console.log('✅ Token refresh successful!\n');
    console.log(`🕐 New token expires in: ${tokenData.expires_in} seconds (${Math.round(tokenData.expires_in/60)} minutes)`);
    console.log(`🔑 Access token length: ${tokenData.access_token.length} characters`);
    console.log(`🔄 New refresh token: ${tokenData.refresh_token ? 'Received' : 'Not provided'}\n`);

    // Test the new token with a simple API call
    console.log('🧪 Testing new token with Xero API...');
    
    const testResponse = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Xero-tenant-id': tenantId,
        'Accept': 'application/json'
      }
    });

    if (testResponse.ok) {
      const orgData = await testResponse.json();
      const org = orgData.Organisations[0];
      console.log('✅ API test successful!');
      console.log(`🏢 Connected to: ${org.Name}`);
      console.log(`💰 Base currency: ${org.BaseCurrency}`);
      console.log(`📅 Financial year: ${org.FinancialYearEndMonth}/${org.FinancialYearEndDay}\n`);

      // Now test searching for goods transactions
      console.log('🔍 Searching for "goods" transactions...');
      
      const invoicesResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Xero-tenant-id': tenantId,
          'Accept': 'application/json'
        }
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        const totalInvoices = invoicesData.Invoices?.length || 0;
        
        const goodsInvoices = invoicesData.Invoices?.filter(invoice => {
          const searchText = `${invoice.Reference || ''} ${invoice.LineItems?.map(li => li.Description).join(' ') || ''}`.toLowerCase();
          return searchText.includes('goods') || searchText.includes('good');
        }) || [];

        console.log(`📄 Total invoices in Xero: ${totalInvoices}`);
        console.log(`🎯 Invoices matching "goods": ${goodsInvoices.length}\n`);

        if (goodsInvoices.length > 0) {
          console.log('✅ FOUND GOODS TRANSACTIONS:');
          goodsInvoices.forEach((invoice, i) => {
            console.log(`   ${i+1}. ${invoice.InvoiceNumber} - $${invoice.Total} - ${invoice.Contact?.Name}`);
            console.log(`      "${invoice.LineItems?.[0]?.Description || 'No description'}"`);
          });
        } else {
          console.log('ℹ️  NO GOODS TRANSACTIONS FOUND');
          console.log('   This means your Xero account doesn\'t have transactions with "goods" in the description or reference.');
          console.log('   To test with real data, create an invoice in Xero with:');
          console.log('   - Reference: "Goods Project Phase 1"');
          console.log('   - Description: "Goods platform development"');
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Update your .env file with the new access token');
        console.log('2. Refresh your financial dashboard');
        console.log('3. See live data instead of "No Data Found"');

        return {
          success: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          organisation: org.Name,
          goodsTransactions: goodsInvoices.length
        };

      } else {
        console.log('❌ Invoice search failed');
      }

    } else {
      console.log('❌ API test failed');
      console.log(`Status: ${testResponse.status}`);
    }

  } catch (error) {
    console.log('❌ Token refresh failed with error:');
    console.log(error.message);
  }
}

// Run the test
testXeroRefresh().catch(console.error);