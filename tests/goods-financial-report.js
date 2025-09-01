#!/usr/bin/env node

/**
 * GOODS PROJECT FINANCIAL REPORT GENERATOR
 * Searches Xero for all Goods-related transactions and generates comprehensive financial report
 * 
 * This demonstrates the power of your Xero integration + AI analysis capabilities
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: './apps/backend/.env' });

class GoodsFinancialAnalyzer {
  constructor() {
    this.xeroConfig = {
      tenantId: process.env.XERO_TENANT_ID,
      accessToken: process.env.XERO_ACCESS_TOKEN,
      refreshToken: process.env.XERO_REFRESH_TOKEN
    };
    
    this.baseUrl = 'https://api.xero.com/api.xro/2.0';
    this.report = {
      generatedAt: new Date().toISOString(),
      projectName: 'Goods Project',
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        netPosition: 0,
        transactionCount: 0
      },
      income: [],
      expenses: [],
      insights: []
    };
  }

  async makeXeroRequest(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.xeroConfig.accessToken}`,
          'Xero-tenant-id': this.xeroConfig.tenantId,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Xero API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Xero API request failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async searchInvoices() {
    console.log('🔍 Searching invoices for Goods project...');
    
    try {
      // Search for invoices containing "goods" in description or reference
      const invoicesData = await this.makeXeroRequest('/Invoices');
      const goodsInvoices = invoicesData.Invoices?.filter(invoice => {
        const searchText = `${invoice.Reference || ''} ${invoice.LineItems?.map(li => li.Description).join(' ') || ''}`.toLowerCase();
        return searchText.includes('goods') || searchText.includes('good');
      }) || [];

      for (const invoice of goodsInvoices) {
        const amount = parseFloat(invoice.Total || 0);
        const isIncome = invoice.Type === 'ACCREC'; // Accounts Receivable = Income

        const transaction = {
          id: invoice.InvoiceID,
          date: invoice.Date,
          type: invoice.Type,
          number: invoice.InvoiceNumber,
          reference: invoice.Reference,
          contact: invoice.Contact?.Name,
          description: invoice.LineItems?.map(li => li.Description).join('; '),
          amount: amount,
          status: invoice.Status,
          dueDate: invoice.DueDate
        };

        if (isIncome) {
          this.report.income.push(transaction);
          this.report.summary.totalIncome += amount;
        } else {
          this.report.expenses.push(transaction);
          this.report.summary.totalExpenses += amount;
        }

        this.report.summary.transactionCount++;
      }

      console.log(`✅ Found ${goodsInvoices.length} Goods-related invoices`);
    } catch (error) {
      console.error('❌ Failed to search invoices:', error.message);
    }
  }

  async searchBankTransactions() {
    console.log('🔍 Searching bank transactions for Goods project...');
    
    try {
      const bankTransData = await this.makeXeroRequest('/BankTransactions');
      const goodsTransactions = bankTransData.BankTransactions?.filter(transaction => {
        const searchText = `${transaction.Reference || ''} ${transaction.LineItems?.map(li => li.Description).join(' ') || ''}`.toLowerCase();
        return searchText.includes('goods') || searchText.includes('good');
      }) || [];

      for (const transaction of goodsTransactions) {
        const amount = parseFloat(transaction.Total || 0);
        const isExpense = transaction.Type === 'SPEND';

        const transactionRecord = {
          id: transaction.BankTransactionID,
          date: transaction.Date,
          type: transaction.Type,
          reference: transaction.Reference,
          account: transaction.BankAccount?.Name,
          description: transaction.LineItems?.map(li => li.Description).join('; '),
          amount: amount,
          status: transaction.Status
        };

        if (isExpense) {
          this.report.expenses.push(transactionRecord);
          this.report.summary.totalExpenses += amount;
        } else {
          this.report.income.push(transactionRecord);
          this.report.summary.totalIncome += amount;
        }

        this.report.summary.transactionCount++;
      }

      console.log(`✅ Found ${goodsTransactions.length} Goods-related bank transactions`);
    } catch (error) {
      console.error('❌ Failed to search bank transactions:', error.message);
    }
  }

  async searchExpenses() {
    console.log('🔍 Searching expense claims for Goods project...');
    
    try {
      const expensesData = await this.makeXeroRequest('/ExpenseClaims');
      const goodsExpenses = expensesData.ExpenseClaims?.filter(expense => {
        const searchText = `${expense.Reference || ''} ${expense.Receipts?.map(r => r.LineItems?.map(li => li.Description).join(' ')).join(' ') || ''}`.toLowerCase();
        return searchText.includes('goods') || searchText.includes('good');
      }) || [];

      for (const expense of goodsExpenses) {
        const amount = parseFloat(expense.Total || 0);

        const expenseRecord = {
          id: expense.ExpenseClaimID,
          date: expense.UpdatedDateUTC,
          type: 'EXPENSE_CLAIM',
          reference: expense.Reference,
          user: expense.User?.FirstName + ' ' + expense.User?.LastName,
          description: expense.Receipts?.map(r => r.LineItems?.map(li => li.Description).join('; ')).join(' | '),
          amount: amount,
          status: expense.Status
        };

        this.report.expenses.push(expenseRecord);
        this.report.summary.totalExpenses += amount;
        this.report.summary.transactionCount++;
      }

      console.log(`✅ Found ${goodsExpenses.length} Goods-related expense claims`);
    } catch (error) {
      console.error('❌ Failed to search expense claims:', error.message);
    }
  }

  async searchContacts() {
    console.log('🔍 Searching contacts related to Goods project...');
    
    try {
      const contactsData = await this.makeXeroRequest('/Contacts');
      const goodsContacts = contactsData.Contacts?.filter(contact => {
        const searchText = `${contact.Name || ''} ${contact.FirstName || ''} ${contact.LastName || ''}`.toLowerCase();
        return searchText.includes('goods') || searchText.includes('good');
      }) || [];

      this.report.goodsContacts = goodsContacts.map(contact => ({
        id: contact.ContactID,
        name: contact.Name,
        email: contact.EmailAddress,
        phone: contact.Phones?.[0]?.PhoneNumber,
        isSupplier: contact.IsSupplier,
        isCustomer: contact.IsCustomer
      }));

      console.log(`✅ Found ${goodsContacts.length} Goods-related contacts`);
    } catch (error) {
      console.error('❌ Failed to search contacts:', error.message);
    }
  }

  generateInsights() {
    console.log('🧠 Generating AI-powered insights...');
    
    this.report.summary.netPosition = this.report.summary.totalIncome - this.report.summary.totalExpenses;
    
    // Expense categorization
    const expensesByType = {};
    this.report.expenses.forEach(expense => {
      const type = expense.type || 'Other';
      expensesByType[type] = (expensesByType[type] || 0) + expense.amount;
    });

    // Income analysis
    const incomeByMonth = {};
    this.report.income.forEach(income => {
      const month = new Date(income.date).toISOString().substring(0, 7);
      incomeByMonth[month] = (incomeByMonth[month] || 0) + income.amount;
    });

    // Generate insights
    this.report.insights = [
      {
        type: 'financial_position',
        title: 'Overall Financial Position',
        message: this.report.summary.netPosition >= 0 
          ? `Goods project is profitable with a net positive position of $${this.report.summary.netPosition.toFixed(2)}`
          : `Goods project has a net loss of $${Math.abs(this.report.summary.netPosition).toFixed(2)}`
      },
      {
        type: 'expense_breakdown',
        title: 'Expense Categories',
        data: expensesByType
      },
      {
        type: 'income_trends',
        title: 'Income by Month',
        data: incomeByMonth
      },
      {
        type: 'transaction_volume',
        title: 'Transaction Activity',
        message: `Found ${this.report.summary.transactionCount} total transactions related to Goods project`
      }
    ];

    if (this.report.income.length === 0) {
      this.report.insights.push({
        type: 'warning',
        title: 'No Income Recorded',
        message: 'No income transactions found for Goods project. Consider reviewing revenue recording practices.'
      });
    }

    if (this.report.summary.totalExpenses > this.report.summary.totalIncome * 1.5) {
      this.report.insights.push({
        type: 'alert',
        title: 'High Expense Ratio',
        message: 'Expenses significantly exceed income. Review cost management strategies.'
      });
    }
  }

  generateHTMLReport() {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Goods Project Financial Report</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 2.5em; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
            .summary-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .summary-card h3 { margin: 0 0 10px 0; color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
            .summary-card .amount { font-size: 1.8em; font-weight: bold; margin: 0; }
            .positive { color: #28a745; }
            .negative { color: #dc3545; }
            .neutral { color: #6c757d; }
            .section { padding: 30px; }
            .section h2 { margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .transaction-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .transaction-table th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; }
            .transaction-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
            .transaction-table tr:hover { background: #f8f9fa; }
            .insight { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .insight.warning { background: #fff3e0; border-left-color: #ff9800; }
            .insight.alert { background: #ffebee; border-left-color: #f44336; }
            .insight h4 { margin: 0 0 8px 0; color: #333; }
            .insight p { margin: 0; color: #666; }
            .no-data { text-align: center; color: #666; font-style: italic; padding: 40px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Goods Project Financial Report</h1>
                <p>Generated: ${new Date(this.report.generatedAt).toLocaleDateString()} • Powered by ACT Xero Integration</p>
            </div>
            
            <div class="summary">
                <div class="summary-card">
                    <h3>Total Income</h3>
                    <p class="amount positive">$${this.report.summary.totalIncome.toFixed(2)}</p>
                </div>
                <div class="summary-card">
                    <h3>Total Expenses</h3>
                    <p class="amount negative">$${this.report.summary.totalExpenses.toFixed(2)}</p>
                </div>
                <div class="summary-card">
                    <h3>Net Position</h3>
                    <p class="amount ${this.report.summary.netPosition >= 0 ? 'positive' : 'negative'}">$${this.report.summary.netPosition.toFixed(2)}</p>
                </div>
                <div class="summary-card">
                    <h3>Transactions</h3>
                    <p class="amount neutral">${this.report.summary.transactionCount}</p>
                </div>
            </div>

            <div class="section">
                <h2>💰 Income Transactions</h2>
                ${this.report.income.length > 0 ? `
                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Contact/Account</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.report.income.map(income => `
                        <tr>
                            <td>${new Date(income.date).toLocaleDateString()}</td>
                            <td>${income.description || income.reference || 'N/A'}</td>
                            <td>${income.contact || income.account || 'N/A'}</td>
                            <td class="positive">$${income.amount.toFixed(2)}</td>
                            <td>${income.status}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<div class="no-data">No income transactions found for Goods project</div>'}
            </div>

            <div class="section">
                <h2>💸 Expense Transactions</h2>
                ${this.report.expenses.length > 0 ? `
                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Contact/Account</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.report.expenses.map(expense => `
                        <tr>
                            <td>${new Date(expense.date).toLocaleDateString()}</td>
                            <td>${expense.description || expense.reference || 'N/A'}</td>
                            <td>${expense.contact || expense.account || expense.user || 'N/A'}</td>
                            <td class="negative">$${expense.amount.toFixed(2)}</td>
                            <td>${expense.status}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<div class="no-data">No expense transactions found for Goods project</div>'}
            </div>

            <div class="section">
                <h2>🧠 AI-Powered Insights</h2>
                ${this.report.insights.map(insight => `
                <div class="insight ${insight.type}">
                    <h4>${insight.title}</h4>
                    <p>${insight.message || ''}</p>
                    ${insight.data ? `<pre>${JSON.stringify(insight.data, null, 2)}</pre>` : ''}
                </div>
                `).join('')}
            </div>

            ${this.report.goodsContacts && this.report.goodsContacts.length > 0 ? `
            <div class="section">
                <h2>👥 Related Contacts</h2>
                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.report.goodsContacts.map(contact => `
                        <tr>
                            <td>${contact.name}</td>
                            <td>${contact.email || 'N/A'}</td>
                            <td>${contact.phone || 'N/A'}</td>
                            <td>${[contact.isCustomer && 'Customer', contact.isSupplier && 'Supplier'].filter(Boolean).join(', ') || 'Contact'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        </div>
    </body>
    </html>
    `;

    return html;
  }

  async generateReport() {
    console.log('🚀 Starting Goods Project Financial Analysis...\n');

    try {
      // Search all Xero data sources
      await Promise.all([
        this.searchInvoices(),
        this.searchBankTransactions(),
        this.searchExpenses(),
        this.searchContacts()
      ]);

      // Generate insights
      this.generateInsights();

      // Save JSON report
      const jsonPath = 'goods-financial-report.json';
      fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));

      // Generate HTML report
      const html = this.generateHTMLReport();
      const htmlPath = 'goods-financial-report.html';
      fs.writeFileSync(htmlPath, html);

      console.log('\n✅ Goods Financial Report Generated Successfully!');
      console.log(`📊 Summary:`);
      console.log(`   💰 Total Income: $${this.report.summary.totalIncome.toFixed(2)}`);
      console.log(`   💸 Total Expenses: $${this.report.summary.totalExpenses.toFixed(2)}`);
      console.log(`   📈 Net Position: $${this.report.summary.netPosition.toFixed(2)}`);
      console.log(`   📋 Transactions: ${this.report.summary.transactionCount}`);
      console.log(`\n📄 Reports saved:`);
      console.log(`   📊 JSON: ${jsonPath}`);
      console.log(`   🌐 HTML: ${htmlPath}`);

      return this.report;

    } catch (error) {
      console.error('❌ Failed to generate Goods financial report:', error);
      throw error;
    }
  }
}

// Run report generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new GoodsFinancialAnalyzer();
  analyzer.generateReport().catch(console.error);
}

export default GoodsFinancialAnalyzer;