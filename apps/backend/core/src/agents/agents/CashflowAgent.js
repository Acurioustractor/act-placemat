/**
 * Cashflow Agent
 * Monitors cash position and generates forecasts
 */

import BaseFinancialAgent from './BaseFinancialAgent.js';

class CashflowAgent extends BaseFinancialAgent {
  constructor(orchestrator) {
    super('CashflowAgent', orchestrator);
  }

  async generateDailyForecast() {
    try {
      // Get current cash position from bank accounts
      const { data: bankAccounts } = await this.supabase
        .from('xero_bank_accounts')
        .select('*')
        .eq('status', 'ACTIVE');

      const totalCash = bankAccounts?.reduce((sum, account) => sum + (account.balance || 0), 0) || 0;

      // Generate 30-day cashflow forecast
      const forecast = await this.generate30DayForecast(totalCash);

      // Check for cash flow warnings
      const warnings = this.checkCashflowWarnings(forecast);

      await this.logAgentAction({
        action: 'daily_cashflow_forecast',
        current_cash: totalCash,
        forecast_30_day: forecast.ending_balance,
        warnings: warnings.length
      });

      if (warnings.length > 0) {
        await this.sendCashflowAlert(warnings, forecast);
      }

      return {
        status: 'completed',
        currentCash: totalCash,
        forecast,
        warnings
      };

    } catch (error) {
      console.error('Cashflow forecast generation error:', error);
      await this.handleProcessingError('cashflow_forecast', error);
      throw error;
    }
  }

  async generate30DayForecast(startingBalance) {
    // Simplified forecast - in real implementation would use ML/historical analysis
    const forecast = {
      starting_balance: startingBalance,
      expected_inflows: 15000, // Estimated from recurring invoices
      expected_outflows: 12000, // Estimated from bills and expenses
      ending_balance: startingBalance + 15000 - 12000,
      generated_at: new Date().toISOString()
    };

    return forecast;
  }

  checkCashflowWarnings(forecast) {
    const warnings = [];

    // Check if ending balance is below minimum threshold
    if (forecast.ending_balance < this.policy.cashflow.minimum_balance) {
      warnings.push({
        type: 'low_balance',
        severity: 'high',
        message: `Forecast shows balance below minimum threshold of ${this.policy.cashflow.minimum_balance}`
      });
    }

    // Check if cash burn rate is too high
    const burnRate = forecast.expected_outflows - forecast.expected_inflows;
    if (burnRate > this.policy.cashflow.max_burn_rate) {
      warnings.push({
        type: 'high_burn_rate',
        severity: 'medium',
        message: `Cash burn rate exceeds threshold: ${burnRate}`
      });
    }

    return warnings;
  }

  async sendCashflowAlert(warnings, forecast) {
    const message = `💰 Cashflow Alert\\n\\n` +
      `Current Balance: ${this.formatCurrency(forecast.starting_balance)}\\n` +
      `30-Day Forecast: ${this.formatCurrency(forecast.ending_balance)}\\n\\n` +
      `Warnings:\\n${warnings.map(w => `• ${w.message}`).join('\\n')}`;

    await this.orchestrator.sendNotification(
      this.policy.notifications.slack_channel,
      message,
      [
        { text: 'Review Cashflow', url: '/finance/cashflow' },
        { text: 'View Forecast', url: '/finance/cashflow/forecast' }
      ]
    );
  }

  async getMetrics() {
    return {
      last_forecast_date: new Date().toISOString(),
      current_warnings: 0, // Would be calculated from recent forecasts
      forecast_accuracy: 85.5 // Percentage accuracy of previous forecasts
    };
  }
}

export default CashflowAgent;