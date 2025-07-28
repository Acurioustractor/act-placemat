# Financial Tracking Integration Design

## Overview

This document outlines the implementation of comprehensive financial tracking capabilities for the ACT Placemat platform, integrating with existing Notion financial fields and providing advanced analytics, budgeting, and forecasting features.

## Financial Data Architecture

### Data Sources

1. **Notion Database Fields** (Existing):
   - Revenue Actual
   - Revenue Potential
   - Actual Incoming
   - Potential Incoming

2. **New Financial Extensions**:
   - Expense tracking
   - Budget allocations
   - Cash flow projections
   - Financial milestones
   - Grant tracking
   - Invoice management

### Extended Database Schema

```sql
-- Financial transactions table
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    opportunity_id VARCHAR(255),
    transaction_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'AUD',
    description TEXT,
    transaction_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_type CHECK (transaction_type IN ('income', 'expense', 'transfer')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue'))
);

-- Budgets table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    quarter INTEGER,
    total_amount DECIMAL(12, 2) NOT NULL,
    allocated_amount DECIMAL(12, 2) DEFAULT 0,
    spent_amount DECIMAL(12, 2) DEFAULT 0,
    budget_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_budget_type CHECK (budget_type IN ('annual', 'quarterly', 'project', 'department'))
);

-- Budget line items
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    allocated_amount DECIMAL(12, 2) NOT NULL,
    spent_amount DECIMAL(12, 2) DEFAULT 0,
    remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    notes TEXT
);

-- Financial projections
CREATE TABLE financial_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255),
    projection_date DATE NOT NULL,
    projected_revenue DECIMAL(12, 2),
    projected_expenses DECIMAL(12, 2),
    confidence_level INTEGER CHECK (confidence_level BETWEEN 0 AND 100),
    assumptions TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grants tracking
CREATE TABLE grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id VARCHAR(255) NOT NULL,
    grant_name VARCHAR(255) NOT NULL,
    grantor VARCHAR(255) NOT NULL,
    amount_requested DECIMAL(12, 2),
    amount_awarded DECIMAL(12, 2),
    grant_period_start DATE,
    grant_period_end DATE,
    reporting_requirements TEXT,
    milestones JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_transactions_project ON financial_transactions(project_id);
CREATE INDEX idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_budgets_project ON budgets(project_id);
CREATE INDEX idx_projections_date ON financial_projections(projection_date);
```

## Financial Components

### 1. Financial Dashboard Component

```javascript
// components/FinancialDashboard.js
class FinancialDashboard {
    constructor() {
        this.charts = {};
        this.metrics = {};
        this.filters = {
            dateRange: 'ytd',
            projects: [],
            categories: []
        };
    }

    async initialize() {
        await this.loadFinancialData();
        this.renderDashboard();
        this.setupRealTimeUpdates();
    }

    async loadFinancialData() {
        const [revenue, expenses, budgets, projections] = await Promise.all([
            this.fetchRevenue(),
            this.fetchExpenses(),
            this.fetchBudgets(),
            this.fetchProjections()
        ]);

        this.calculateMetrics({ revenue, expenses, budgets, projections });
    }

    calculateMetrics(data) {
        this.metrics = {
            totalRevenue: this.sumRevenue(data.revenue),
            totalExpenses: this.sumExpenses(data.expenses),
            netIncome: this.calculateNetIncome(data.revenue, data.expenses),
            burnRate: this.calculateBurnRate(data.expenses),
            runway: this.calculateRunway(data.revenue, data.expenses),
            budgetUtilization: this.calculateBudgetUtilization(data.budgets),
            revenueGrowth: this.calculateGrowthRate(data.revenue),
            cashFlow: this.calculateCashFlow(data)
        };
    }

    renderDashboard() {
        return `
            <div class="financial-dashboard">
                <div class="metrics-grid">
                    ${this.renderMetricCard('Total Revenue', this.metrics.totalRevenue, 'currency', 'positive')}
                    ${this.renderMetricCard('Total Expenses', this.metrics.totalExpenses, 'currency', 'negative')}
                    ${this.renderMetricCard('Net Income', this.metrics.netIncome, 'currency', this.metrics.netIncome >= 0 ? 'positive' : 'negative')}
                    ${this.renderMetricCard('Burn Rate', this.metrics.burnRate, 'currency', 'neutral')}
                    ${this.renderMetricCard('Runway', this.metrics.runway, 'months', 'neutral')}
                    ${this.renderMetricCard('Budget Used', this.metrics.budgetUtilization, 'percentage', 'neutral')}
                </div>

                <div class="charts-grid">
                    <div class="chart-container">
                        <h3>Revenue vs Expenses</h3>
                        <canvas id="revenue-expenses-chart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>Cash Flow Projection</h3>
                        <canvas id="cashflow-chart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>Budget Allocation</h3>
                        <canvas id="budget-chart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>Revenue by Source</h3>
                        <canvas id="revenue-sources-chart"></canvas>
                    </div>
                </div>

                <div class="financial-tables">
                    ${this.renderTransactionsTable()}
                    ${this.renderBudgetTable()}
                </div>
            </div>
        `;
    }

    renderMetricCard(title, value, type, sentiment) {
        const formatted = this.formatValue(value, type);
        const icon = this.getMetricIcon(sentiment);
        
        return `
            <div class="metric-card ${sentiment}">
                <div class="metric-header">
                    <span class="metric-title">${title}</span>
                    <span class="metric-icon">${icon}</span>
                </div>
                <div class="metric-value">${formatted}</div>
                <div class="metric-trend">${this.renderTrend(title)}</div>
            </div>
        `;
    }

    formatValue(value, type) {
        switch (type) {
            case 'currency':
                return new Intl.NumberFormat('en-AU', {
                    style: 'currency',
                    currency: 'AUD'
                }).format(value);
            case 'percentage':
                return `${value.toFixed(1)}%`;
            case 'months':
                return `${value} months`;
            default:
                return value;
        }
    }
}
```

### 2. Revenue Tracking Service

```javascript
// services/revenue.service.js
class RevenueService {
    constructor() {
        this.notionIntegration = new PlacematNotionIntegration();
    }

    async syncRevenueFromNotion() {
        const projects = await this.notionIntegration.getProjects();
        const opportunities = await this.notionIntegration.getOpportunities();

        const revenueData = this.aggregateRevenue(projects, opportunities);
        await this.updateLocalRevenue(revenueData);
        
        return revenueData;
    }

    aggregateRevenue(projects, opportunities) {
        const revenue = {
            actual: 0,
            potential: 0,
            pipeline: 0,
            bySource: {},
            byProject: {},
            byMonth: {},
            projections: []
        };

        // Aggregate project revenue
        projects.forEach(project => {
            revenue.actual += project.revenueActual || 0;
            revenue.potential += project.revenuePotential || 0;
            
            revenue.byProject[project.id] = {
                name: project.name,
                actual: project.revenueActual || 0,
                potential: project.revenuePotential || 0,
                incoming: project.actualIncoming || 0
            };
        });

        // Aggregate opportunity pipeline
        opportunities.forEach(opp => {
            const weighted = (opp.amount || 0) * (opp.probability / 100);
            revenue.pipeline += weighted;
            
            const source = opp.type || 'Other';
            revenue.bySource[source] = (revenue.bySource[source] || 0) + weighted;
        });

        // Calculate monthly breakdown
        revenue.byMonth = this.calculateMonthlyRevenue(projects, opportunities);
        
        // Generate projections
        revenue.projections = this.generateProjections(revenue);

        return revenue;
    }

    calculateMonthlyRevenue(projects, opportunities) {
        const monthly = {};
        const currentDate = new Date();
        
        // Historical data from projects
        projects.forEach(project => {
            // Simplified - would need actual transaction dates
            const month = currentDate.toISOString().substr(0, 7);
            monthly[month] = (monthly[month] || 0) + (project.revenueActual || 0);
        });

        // Future projections from opportunities
        opportunities.forEach(opp => {
            if (opp.expectedCloseDate) {
                const month = new Date(opp.expectedCloseDate).toISOString().substr(0, 7);
                const weighted = (opp.amount || 0) * (opp.probability / 100);
                monthly[month] = (monthly[month] || 0) + weighted;
            }
        });

        return monthly;
    }

    generateProjections(revenue) {
        const projections = [];
        const historicalGrowth = this.calculateHistoricalGrowth(revenue.byMonth);
        
        for (let i = 1; i <= 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            
            const projection = {
                date: date.toISOString().substr(0, 7),
                optimistic: this.projectRevenue(revenue.actual, historicalGrowth * 1.2, i),
                realistic: this.projectRevenue(revenue.actual, historicalGrowth, i),
                pessimistic: this.projectRevenue(revenue.actual, historicalGrowth * 0.8, i),
                pipeline: this.projectPipeline(revenue.pipeline, i)
            };
            
            projections.push(projection);
        }
        
        return projections;
    }

    projectRevenue(base, growthRate, months) {
        return base * Math.pow(1 + growthRate / 12, months);
    }

    async recordTransaction(transactionData) {
        const transaction = await db.query(
            `INSERT INTO financial_transactions 
             (project_id, transaction_type, category, amount, transaction_date, description, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                transactionData.projectId,
                transactionData.type,
                transactionData.category,
                transactionData.amount,
                transactionData.date,
                transactionData.description,
                transactionData.status || 'completed'
            ]
        );

        // Update related budgets
        await this.updateBudgetSpending(transactionData);
        
        // Trigger notifications if needed
        await this.checkFinancialAlerts(transactionData);

        return transaction.rows[0];
    }
}
```

### 3. Budget Management System

```javascript
// services/budget.service.js
class BudgetService {
    async createBudget(budgetData) {
        const budget = await db.query(
            `INSERT INTO budgets 
             (project_id, name, fiscal_year, total_amount, budget_type, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [...Object.values(budgetData)]
        );

        // Create default budget categories
        await this.createDefaultCategories(budget.rows[0].id);

        return budget.rows[0];
    }

    async allocateBudget(budgetId, allocations) {
        const promises = allocations.map(allocation => 
            db.query(
                `INSERT INTO budget_items (budget_id, category, allocated_amount)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (budget_id, category) 
                 DO UPDATE SET allocated_amount = $3`,
                [budgetId, allocation.category, allocation.amount]
            )
        );

        await Promise.all(promises);
        await this.updateBudgetTotals(budgetId);
    }

    async trackSpending(transactionData) {
        if (!transactionData.projectId) return;

        // Find active budget for project
        const budget = await this.getActiveBudget(transactionData.projectId);
        if (!budget) return;

        // Update budget item spending
        await db.query(
            `UPDATE budget_items 
             SET spent_amount = spent_amount + $1
             WHERE budget_id = $2 AND category = $3`,
            [transactionData.amount, budget.id, transactionData.category]
        );

        // Check budget alerts
        await this.checkBudgetAlerts(budget.id);
    }

    async generateBudgetReport(budgetId) {
        const budget = await this.getBudgetDetails(budgetId);
        const items = await this.getBudgetItems(budgetId);
        const transactions = await this.getBudgetTransactions(budgetId);

        return {
            summary: {
                totalBudget: budget.total_amount,
                allocated: budget.allocated_amount,
                spent: budget.spent_amount,
                remaining: budget.total_amount - budget.spent_amount,
                utilizationRate: (budget.spent_amount / budget.allocated_amount) * 100,
                projectedOverrun: this.projectOverrun(budget, transactions)
            },
            categories: items.map(item => ({
                name: item.category,
                allocated: item.allocated_amount,
                spent: item.spent_amount,
                remaining: item.remaining_amount,
                percentUsed: (item.spent_amount / item.allocated_amount) * 100,
                trend: this.calculateSpendingTrend(item, transactions)
            })),
            alerts: await this.getBudgetAlerts(budgetId),
            recommendations: this.generateRecommendations(budget, items, transactions)
        };
    }

    projectOverrun(budget, transactions) {
        const burnRate = this.calculateBurnRate(transactions);
        const remainingBudget = budget.total_amount - budget.spent_amount;
        const monthsRemaining = this.getMonthsRemaining(budget);
        
        const projectedSpend = burnRate * monthsRemaining;
        return Math.max(0, projectedSpend - remainingBudget);
    }

    async checkBudgetAlerts(budgetId) {
        const budget = await this.getBudgetDetails(budgetId);
        const items = await this.getBudgetItems(budgetId);
        const alerts = [];

        // Overall budget alerts
        const utilizationRate = (budget.spent_amount / budget.total_amount) * 100;
        if (utilizationRate > 90) {
            alerts.push({
                type: 'critical',
                message: `Budget is ${utilizationRate.toFixed(1)}% utilized`,
                budgetId: budget.id
            });
        } else if (utilizationRate > 75) {
            alerts.push({
                type: 'warning',
                message: `Budget is ${utilizationRate.toFixed(1)}% utilized`,
                budgetId: budget.id
            });
        }

        // Category-specific alerts
        items.forEach(item => {
            const categoryUtilization = (item.spent_amount / item.allocated_amount) * 100;
            if (categoryUtilization > 100) {
                alerts.push({
                    type: 'critical',
                    message: `${item.category} is over budget by ${this.formatCurrency(item.spent_amount - item.allocated_amount)}`,
                    category: item.category
                });
            }
        });

        // Send notifications
        if (alerts.length > 0) {
            await this.sendBudgetAlerts(alerts);
        }

        return alerts;
    }
}
```

### 4. Financial Analytics Engine

```javascript
// services/financial-analytics.js
class FinancialAnalytics {
    async generateInsights() {
        const data = await this.gatherFinancialData();
        
        return {
            health: this.assessFinancialHealth(data),
            trends: this.analyzeTrends(data),
            forecasts: this.generateForecasts(data),
            recommendations: this.generateRecommendations(data),
            risks: this.identifyRisks(data)
        };
    }

    assessFinancialHealth(data) {
        const metrics = {
            liquidityRatio: this.calculateLiquidityRatio(data),
            debtToEquity: this.calculateDebtToEquity(data),
            profitMargin: this.calculateProfitMargin(data),
            cashFlowHealth: this.assessCashFlow(data),
            revenueStability: this.assessRevenueStability(data)
        };

        const score = this.calculateHealthScore(metrics);
        
        return {
            score,
            status: this.getHealthStatus(score),
            metrics,
            improvements: this.suggestImprovements(metrics)
        };
    }

    analyzeTrends(data) {
        return {
            revenue: {
                trend: this.calculateTrend(data.revenue.monthly),
                seasonality: this.detectSeasonality(data.revenue.monthly),
                growth: this.calculateGrowthRate(data.revenue.monthly),
                volatility: this.calculateVolatility(data.revenue.monthly)
            },
            expenses: {
                trend: this.calculateTrend(data.expenses.monthly),
                categories: this.analyzeExpenseCategories(data.expenses),
                efficiency: this.calculateOperationalEfficiency(data)
            },
            profitability: {
                trend: this.calculateProfitabilityTrend(data),
                margins: this.calculateMargins(data),
                breakeven: this.calculateBreakeven(data)
            }
        };
    }

    generateForecasts(data) {
        const models = {
            linear: this.linearRegression(data),
            exponential: this.exponentialSmoothing(data),
            seasonal: this.seasonalDecomposition(data),
            ml: this.mlForecast(data) // Advanced ML model
        };

        return {
            revenue: {
                nextMonth: models.linear.revenue.nextMonth,
                nextQuarter: models.seasonal.revenue.nextQuarter,
                nextYear: models.ml.revenue.nextYear,
                confidence: this.calculateConfidence(models)
            },
            expenses: {
                nextMonth: models.linear.expenses.nextMonth,
                nextQuarter: models.seasonal.expenses.nextQuarter,
                nextYear: models.ml.expenses.nextYear
            },
            cashFlow: {
                projection: this.projectCashFlow(models),
                runwayMonths: this.calculateRunway(data, models),
                criticalDate: this.findCriticalDate(models)
            }
        };
    }

    identifyRisks(data) {
        const risks = [];

        // Revenue concentration risk
        const revenueConcentration = this.calculateRevenueConcentration(data);
        if (revenueConcentration > 0.5) {
            risks.push({
                type: 'high',
                category: 'revenue',
                description: 'High revenue concentration risk',
                mitigation: 'Diversify revenue sources'
            });
        }

        // Cash flow risk
        if (data.cashFlow.current < data.expenses.monthly * 3) {
            risks.push({
                type: 'critical',
                category: 'liquidity',
                description: 'Low cash reserves',
                mitigation: 'Increase cash buffer or secure credit line'
            });
        }

        // Budget overrun risk
        const overrunProjects = this.identifyBudgetOverruns(data);
        if (overrunProjects.length > 0) {
            risks.push({
                type: 'medium',
                category: 'budget',
                description: `${overrunProjects.length} projects at risk of budget overrun`,
                mitigation: 'Review and adjust project budgets'
            });
        }

        return risks;
    }

    generateRecommendations(data) {
        const recommendations = [];
        const analysis = this.analyzeTrends(data);

        // Revenue recommendations
        if (analysis.revenue.growth < 0.05) { // Less than 5% growth
            recommendations.push({
                priority: 'high',
                area: 'revenue',
                action: 'Explore new revenue streams',
                impact: 'Increase revenue growth by 10-15%',
                effort: 'medium'
            });
        }

        // Expense recommendations
        const inefficientCategories = this.findInefficientSpending(data);
        inefficientCategories.forEach(category => {
            recommendations.push({
                priority: 'medium',
                area: 'expenses',
                action: `Optimize ${category.name} spending`,
                impact: `Save ${this.formatCurrency(category.potential_savings)}`,
                effort: 'low'
            });
        });

        // Cash flow recommendations
        if (data.cashFlow.volatility > 0.3) {
            recommendations.push({
                priority: 'high',
                area: 'cash_flow',
                action: 'Implement cash flow smoothing strategies',
                impact: 'Reduce volatility by 50%',
                effort: 'medium'
            });
        }

        return recommendations.sort((a, b) => 
            this.getPriorityScore(a.priority) - this.getPriorityScore(b.priority)
        );
    }
}
```

### 5. Financial Reporting Components

```javascript
// components/FinancialReports.js
class FinancialReports {
    async generateMonthlyReport(month, year) {
        const data = await this.gatherMonthlyData(month, year);
        
        return {
            executive_summary: this.generateExecutiveSummary(data),
            revenue_analysis: this.analyzeRevenue(data),
            expense_breakdown: this.breakdownExpenses(data),
            project_financials: this.analyzeProjectFinancials(data),
            budget_performance: this.analyzeBudgetPerformance(data),
            cash_flow_statement: this.generateCashFlowStatement(data),
            balance_sheet: this.generateBalanceSheet(data),
            key_metrics: this.calculateKeyMetrics(data),
            visualizations: this.generateVisualizations(data)
        };
    }

    generateExecutiveSummary(data) {
        return {
            period: `${data.month} ${data.year}`,
            highlights: [
                `Total Revenue: ${this.formatCurrency(data.revenue.total)}`,
                `Total Expenses: ${this.formatCurrency(data.expenses.total)}`,
                `Net Income: ${this.formatCurrency(data.revenue.total - data.expenses.total)}`,
                `Cash Position: ${this.formatCurrency(data.cash.ending)}`
            ],
            key_achievements: this.identifyAchievements(data),
            concerns: this.identifyConcerns(data),
            outlook: this.generateOutlook(data)
        };
    }

    async exportReport(reportData, format = 'pdf') {
        switch (format) {
            case 'pdf':
                return this.exportPDF(reportData);
            case 'excel':
                return this.exportExcel(reportData);
            case 'csv':
                return this.exportCSV(reportData);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
}
```

## Integration with Notion

### Syncing Financial Data

```javascript
// services/notion-financial-sync.js
class NotionFinancialSync {
    async syncFinancialData() {
        // Fetch from Notion
        const projects = await this.notion.fetchProjects();
        const opportunities = await this.notion.fetchOpportunities();
        
        // Process financial fields
        const financialUpdates = [];
        
        projects.forEach(project => {
            if (project.revenueActual || project.actualIncoming) {
                financialUpdates.push({
                    type: 'revenue',
                    projectId: project.id,
                    amount: project.revenueActual || 0,
                    incoming: project.actualIncoming || 0,
                    potential: project.revenuePotential || 0
                });
            }
        });

        opportunities.forEach(opp => {
            if (opp.stage === 'Closed Won') {
                financialUpdates.push({
                    type: 'won_opportunity',
                    opportunityId: opp.id,
                    amount: opp.amount,
                    projectId: opp.relatedProject
                });
            }
        });

        // Update local financial records
        await this.processFinancialUpdates(financialUpdates);
        
        // Trigger recalculations
        await this.recalculateFinancials();
    }

    async updateNotionFinancials(updates) {
        // Write back to Notion
        const promises = updates.map(update => {
            if (update.type === 'project_revenue') {
                return this.notion.updateProject(update.projectId, {
                    'Revenue Actual': update.amount,
                    'Last Financial Update': new Date().toISOString()
                });
            }
        });

        await Promise.all(promises);
    }
}
```

## Financial Dashboard UI

```html
<!-- financial-dashboard.html -->
<div class="financial-dashboard-container">
    <!-- Quick Stats -->
    <div class="quick-stats">
        <div class="stat-card revenue">
            <h3>Total Revenue</h3>
            <div class="stat-value">$0.00</div>
            <div class="stat-change positive">+12.5%</div>
        </div>
        <div class="stat-card expenses">
            <h3>Total Expenses</h3>
            <div class="stat-value">$0.00</div>
            <div class="stat-change negative">+8.3%</div>
        </div>
        <div class="stat-card profit">
            <h3>Net Profit</h3>
            <div class="stat-value">$0.00</div>
            <div class="stat-change positive">+24.1%</div>
        </div>
        <div class="stat-card runway">
            <h3>Runway</h3>
            <div class="stat-value">0 months</div>
            <div class="stat-change neutral">Based on burn rate</div>
        </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
        <div class="chart-card full-width">
            <h3>Revenue & Expenses Trend</h3>
            <canvas id="revenue-expenses-trend"></canvas>
        </div>
        
        <div class="chart-card half-width">
            <h3>Revenue by Source</h3>
            <canvas id="revenue-sources"></canvas>
        </div>
        
        <div class="chart-card half-width">
            <h3>Expense Categories</h3>
            <canvas id="expense-categories"></canvas>
        </div>
    </div>

    <!-- Budget Performance -->
    <div class="budget-section">
        <h3>Budget Performance</h3>
        <div class="budget-items">
            <!-- Dynamic budget items -->
        </div>
    </div>

    <!-- Transactions Table -->
    <div class="transactions-section">
        <h3>Recent Transactions</h3>
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Project</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="transactions-tbody">
                <!-- Dynamic rows -->
            </tbody>
        </table>
    </div>
</div>
```

## Security Considerations

1. **Data Encryption**: All financial data encrypted at rest
2. **Access Control**: Role-based permissions for financial data
3. **Audit Trail**: Complete audit log of all financial transactions
4. **Data Validation**: Strict validation of financial inputs
5. **Compliance**: Built-in compliance with financial regulations

## Implementation Timeline

### Week 1: Foundation
- Set up financial database tables
- Create basic transaction recording
- Implement Notion sync for financial fields

### Week 2: Analytics & Reporting
- Build financial analytics engine
- Create dashboard components
- Implement reporting system

### Week 3: Advanced Features
- Add budget management
- Implement forecasting
- Create financial alerts

### Week 4: Integration & Testing
- Complete Notion integration
- Add export capabilities
- Comprehensive testing

## Next Steps

1. Create financial database schema
2. Build transaction management API
3. Develop financial dashboard UI
4. Implement Notion synchronization
5. Add analytics and reporting
6. Create budget management system
7. Build forecasting engine
8. Add financial alerts and notifications