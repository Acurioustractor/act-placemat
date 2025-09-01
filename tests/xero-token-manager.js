#!/usr/bin/env node

/**
 * XERO TOKEN MANAGER
 * Handles Xero OAuth token refresh to ensure we always have valid access
 * Prevents fake data by maintaining real API connections
 */

import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '../apps/backend/.env' });

class XeroTokenManager {
  constructor() {
    this.clientId = '5EF385B08FFF41599C456F7B55118776'; // From your .env
    this.clientSecret = process.env.XERO_CLIENT_SECRET; // Need this
    this.refreshToken = process.env.XERO_REFRESH_TOKEN;
    this.tenantId = process.env.XERO_TENANT_ID;
    this.baseUrl = 'https://identity.xero.com';
  }

  async refreshAccessToken() {
    try {
      console.log('🔄 Refreshing Xero access token...');

      const tokenUrl = `${this.baseUrl}/connect/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      
      console.log('✅ Xero token refreshed successfully');
      console.log(`🕐 New token expires in: ${tokenData.expires_in} seconds`);

      // Update environment file
      await this.updateEnvFile(tokenData.access_token, tokenData.refresh_token);

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
      };

    } catch (error) {
      console.error('❌ Failed to refresh Xero token:', error.message);
      throw error;
    }
  }

  async updateEnvFile(newAccessToken, newRefreshToken) {
    try {
      const envPath = '../apps/backend/.env';
      let envContent = fs.readFileSync(envPath, 'utf8');

      // Update access token
      envContent = envContent.replace(
        /XERO_ACCESS_TOKEN=.*$/m,
        `XERO_ACCESS_TOKEN=${newAccessToken}`
      );

      // Update refresh token
      envContent = envContent.replace(
        /XERO_REFRESH_TOKEN=.*$/m,
        `XERO_REFRESH_TOKEN=${newRefreshToken}`
      );

      fs.writeFileSync(envPath, envContent);
      console.log('✅ Environment file updated with new tokens');

    } catch (error) {
      console.error('❌ Failed to update environment file:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Xero API connection...');

      const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
        headers: {
          'Authorization': `Bearer ${process.env.XERO_ACCESS_TOKEN}`,
          'Xero-tenant-id': this.tenantId,
          'Accept': 'application/json'
        }
      });

      if (response.status === 401) {
        console.log('🔄 Token expired, refreshing...');
        await this.refreshAccessToken();
        return await this.testConnection(); // Retry with new token
      }

      if (!response.ok) {
        throw new Error(`Xero API test failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const org = data.Organisations[0];

      console.log('✅ Xero connection successful');
      console.log(`🏢 Connected to: ${org.Name}`);
      console.log(`🌍 Base currency: ${org.BaseCurrency}`);
      console.log(`📅 Financial year end: ${org.FinancialYearEndMonth}/${org.FinancialYearEndDay}`);

      return { success: true, organisation: org };

    } catch (error) {
      console.error('❌ Xero connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async searchTransactions(searchTerm = 'goods') {
    try {
      console.log(`🔍 Searching for "${searchTerm}" transactions in Xero...`);

      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error('Xero connection failed: ' + connectionTest.error);
      }

      const searchResults = {
        searchTerm,
        searchDate: new Date().toISOString(),
        results: {
          invoices: [],
          bankTransactions: [],
          contacts: [],
          totalFound: 0
        },
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          netPosition: 0
        }
      };

      // Search invoices
      try {
        const invoicesResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
          headers: {
            'Authorization': `Bearer ${process.env.XERO_ACCESS_TOKEN}`,
            'Xero-tenant-id': this.tenantId,
            'Accept': 'application/json'
          }
        });

        if (invoicesResponse.ok) {
          const invoicesData = await invoicesResponse.json();
          
          const matchingInvoices = invoicesData.Invoices?.filter(invoice => {
            const searchText = `${invoice.Reference || ''} ${invoice.LineItems?.map(li => li.Description).join(' ') || ''}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
          }) || [];

          searchResults.results.invoices = matchingInvoices.map(inv => ({
            id: inv.InvoiceID,
            number: inv.InvoiceNumber,
            date: inv.Date,
            contact: inv.Contact?.Name,
            total: inv.Total,
            status: inv.Status,
            type: inv.Type,
            reference: inv.Reference,
            description: inv.LineItems?.map(li => li.Description).join('; ')
          }));

          // Calculate totals
          matchingInvoices.forEach(inv => {
            const amount = parseFloat(inv.Total || 0);
            if (inv.Type === 'ACCREC') { // Accounts Receivable = Income
              searchResults.summary.totalIncome += amount;
            } else {
              searchResults.summary.totalExpenses += amount;
            }
          });

          searchResults.results.totalFound += matchingInvoices.length;
          console.log(`📄 Found ${matchingInvoices.length} matching invoices`);
        }
      } catch (error) {
        console.log(`⚠️  Invoice search failed: ${error.message}`);
      }

      // Search bank transactions
      try {
        const bankResponse = await fetch('https://api.xero.com/api.xro/2.0/BankTransactions', {
          headers: {
            'Authorization': `Bearer ${process.env.XERO_ACCESS_TOKEN}`,
            'Xero-tenant-id': this.tenantId,
            'Accept': 'application/json'
          }
        });

        if (bankResponse.ok) {
          const bankData = await bankResponse.json();
          
          const matchingTransactions = bankData.BankTransactions?.filter(transaction => {
            const searchText = `${transaction.Reference || ''} ${transaction.LineItems?.map(li => li.Description).join(' ') || ''}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
          }) || [];

          searchResults.results.bankTransactions = matchingTransactions.map(trans => ({
            id: trans.BankTransactionID,
            date: trans.Date,
            reference: trans.Reference,
            total: trans.Total,
            status: trans.Status,
            type: trans.Type,
            bankAccount: trans.BankAccount?.Name,
            description: trans.LineItems?.map(li => li.Description).join('; ')
          }));

          // Calculate totals
          matchingTransactions.forEach(trans => {
            const amount = parseFloat(trans.Total || 0);
            if (trans.Type === 'RECEIVE') {
              searchResults.summary.totalIncome += amount;
            } else {
              searchResults.summary.totalExpenses += amount;
            }
          });

          searchResults.results.totalFound += matchingTransactions.length;
          console.log(`🏦 Found ${matchingTransactions.length} matching bank transactions`);
        }
      } catch (error) {
        console.log(`⚠️  Bank transaction search failed: ${error.message}`);
      }

      // Calculate final position
      searchResults.summary.netPosition = searchResults.summary.totalIncome - searchResults.summary.totalExpenses;

      console.log(`\n📊 SEARCH RESULTS FOR "${searchTerm.toUpperCase()}"`);
      console.log(`💰 Total Income: $${searchResults.summary.totalIncome.toFixed(2)}`);
      console.log(`💸 Total Expenses: $${searchResults.summary.totalExpenses.toFixed(2)}`);
      console.log(`📈 Net Position: $${searchResults.summary.netPosition.toFixed(2)}`);
      console.log(`📋 Total Transactions: ${searchResults.results.totalFound}`);

      if (searchResults.results.totalFound === 0) {
        console.log(`\n⚠️  NO TRANSACTIONS FOUND FOR "${searchTerm}"`);
        console.log('This means either:');
        console.log('1. No transactions exist with this search term');
        console.log('2. Transactions exist but use different naming');
        console.log('3. Transactions are in a different Xero account');
        console.log('\nSuggestions:');
        console.log('- Try searching for partial terms like "good" instead of "goods"');
        console.log('- Check Xero directly for transaction naming patterns');
        console.log('- Verify you\'re connected to the correct Xero organisation');
      }

      return searchResults;

    } catch (error) {
      console.error('❌ Transaction search failed:', error.message);
      throw error;
    }
  }
}

// Export for use as module
export default XeroTokenManager;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new XeroTokenManager();
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'search';
  const searchTerm = args[1] || 'goods';

  if (command === 'refresh') {
    manager.refreshAccessToken().catch(console.error);
  } else if (command === 'test') {
    manager.testConnection().catch(console.error);
  } else if (command === 'search') {
    manager.searchTransactions(searchTerm).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node xero-token-manager.js refresh');
    console.log('  node xero-token-manager.js test');
    console.log('  node xero-token-manager.js search [term]');
  }
}