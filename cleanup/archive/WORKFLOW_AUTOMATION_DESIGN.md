# Workflow Automation Architecture Design

## Overview

This document outlines the design of a comprehensive workflow automation system for the ACT Placemat platform. The system will enable automated business processes, reduce manual tasks, and ensure consistent execution of repetitive operations across the ecosystem.

## Architecture Overview

### Core Components

1. **Workflow Engine**: Event-driven automation execution
2. **Trigger System**: Monitor events and initiate workflows
3. **Action Library**: Reusable automation actions
4. **Workflow Designer**: Visual workflow creation interface
5. **Execution Monitor**: Real-time workflow tracking
6. **Integration Hub**: Connect external services

## Database Schema

```sql
-- Workflow definitions
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_trigger CHECK (trigger_type IN ('event', 'schedule', 'webhook', 'manual'))
);

-- Workflow steps
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_config JSONB NOT NULL,
    condition JSONB,
    retry_config JSONB,
    timeout_seconds INTEGER DEFAULT 300,
    UNIQUE(workflow_id, step_number)
);

-- Workflow executions
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    trigger_data JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    execution_data JSONB,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- Step executions
CREATE TABLE step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES workflow_steps(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Workflow templates
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    template_config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id)
);

-- Scheduled workflows
CREATE TABLE workflow_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Australia/Sydney',
    next_run_at TIMESTAMP,
    last_run_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_step_executions ON step_executions(execution_id);
CREATE INDEX idx_schedules_next_run ON workflow_schedules(next_run_at);
```

## Workflow Engine

### Core Engine Implementation

```javascript
// services/workflow-engine.js
class WorkflowEngine {
    constructor() {
        this.executors = new Map();
        this.triggers = new Map();
        this.runningExecutions = new Map();
        this.eventEmitter = new EventEmitter();
        
        this.registerDefaultActions();
        this.setupTriggerMonitoring();
    }

    async executeWorkflow(workflowId, triggerData = {}) {
        const workflow = await this.loadWorkflow(workflowId);
        if (!workflow.is_active) {
            throw new Error('Workflow is not active');
        }

        // Create execution record
        const execution = await this.createExecution(workflowId, triggerData);
        
        try {
            // Execute workflow steps
            await this.runWorkflow(workflow, execution, triggerData);
            
            // Mark as completed
            await this.completeExecution(execution.id);
            
            // Trigger completion events
            this.eventEmitter.emit('workflow.completed', { workflow, execution });
            
        } catch (error) {
            // Handle failure
            await this.failExecution(execution.id, error.message);
            this.eventEmitter.emit('workflow.failed', { workflow, execution, error });
            throw error;
        }
        
        return execution;
    }

    async runWorkflow(workflow, execution, context) {
        const steps = await this.loadWorkflowSteps(workflow.id);
        let stepContext = { ...context };

        for (const step of steps) {
            // Check conditions
            if (step.condition && !this.evaluateCondition(step.condition, stepContext)) {
                continue;
            }

            // Execute step
            const stepExecution = await this.executeStep(step, execution.id, stepContext);
            
            // Update context with step output
            stepContext = {
                ...stepContext,
                [`step_${step.step_number}`]: stepExecution.output_data
            };
        }
    }

    async executeStep(step, executionId, context) {
        const stepExecution = await this.createStepExecution(step.id, executionId, context);
        
        try {
            // Get action executor
            const executor = this.executors.get(step.action_type);
            if (!executor) {
                throw new Error(`Unknown action type: ${step.action_type}`);
            }

            // Execute with retry logic
            const output = await this.executeWithRetry(
                () => executor(step.action_config, context),
                step.retry_config
            );

            // Update step execution
            await this.completeStepExecution(stepExecution.id, output);
            
            return { ...stepExecution, output_data: output };
            
        } catch (error) {
            await this.failStepExecution(stepExecution.id, error.message);
            throw error;
        }
    }

    async executeWithRetry(fn, retryConfig = {}) {
        const maxRetries = retryConfig.max_retries || 3;
        const retryDelay = retryConfig.retry_delay || 1000;
        const backoffMultiplier = retryConfig.backoff_multiplier || 2;

        let lastError;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                    const delay = retryDelay * Math.pow(backoffMultiplier, i);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    evaluateCondition(condition, context) {
        // Simple condition evaluator
        // In production, use a proper expression evaluator
        const { field, operator, value } = condition;
        const actualValue = this.getValueFromContext(field, context);

        switch (operator) {
            case 'equals':
                return actualValue === value;
            case 'not_equals':
                return actualValue !== value;
            case 'greater_than':
                return actualValue > value;
            case 'less_than':
                return actualValue < value;
            case 'contains':
                return String(actualValue).includes(value);
            case 'in':
                return Array.isArray(value) && value.includes(actualValue);
            default:
                return true;
        }
    }

    getValueFromContext(path, context) {
        return path.split('.').reduce((obj, key) => obj?.[key], context);
    }
}
```

### Action Library

```javascript
// services/workflow-actions.js
class WorkflowActions {
    constructor() {
        this.actions = new Map();
        this.registerDefaultActions();
    }

    registerDefaultActions() {
        // Notion Actions
        this.register('notion.create_project', async (config, context) => {
            const projectData = this.interpolateData(config.project_data, context);
            return await notionService.createProject(projectData);
        });

        this.register('notion.update_project', async (config, context) => {
            const { project_id, updates } = config;
            const interpolatedUpdates = this.interpolateData(updates, context);
            return await notionService.updateProject(project_id, interpolatedUpdates);
        });

        this.register('notion.create_opportunity', async (config, context) => {
            const oppData = this.interpolateData(config.opportunity_data, context);
            return await notionService.createOpportunity(oppData);
        });

        // Email Actions
        this.register('email.send', async (config, context) => {
            const emailData = this.interpolateData(config, context);
            return await emailService.send({
                to: emailData.to,
                subject: emailData.subject,
                body: emailData.body,
                template: emailData.template
            });
        });

        this.register('email.send_template', async (config, context) => {
            const { template_id, recipients, variables } = config;
            const interpolatedVars = this.interpolateData(variables, context);
            return await emailService.sendTemplate(template_id, recipients, interpolatedVars);
        });

        // Slack Actions
        this.register('slack.send_message', async (config, context) => {
            const { channel, message, attachments } = config;
            const interpolatedMessage = this.interpolateString(message, context);
            return await slackService.sendMessage(channel, interpolatedMessage, attachments);
        });

        // Data Actions
        this.register('data.transform', async (config, context) => {
            const { input_field, transformation, output_field } = config;
            const inputData = this.getValueFromContext(input_field, context);
            const transformed = this.applyTransformation(inputData, transformation);
            return { [output_field]: transformed };
        });

        this.register('data.aggregate', async (config, context) => {
            const { source_field, aggregation_type } = config;
            const data = this.getValueFromContext(source_field, context);
            return this.aggregate(data, aggregation_type);
        });

        // HTTP Actions
        this.register('http.request', async (config, context) => {
            const { method, url, headers, body } = config;
            const interpolatedConfig = this.interpolateData({ url, headers, body }, context);
            
            const response = await fetch(interpolatedConfig.url, {
                method,
                headers: interpolatedConfig.headers,
                body: JSON.stringify(interpolatedConfig.body)
            });

            return {
                status: response.status,
                body: await response.json(),
                headers: Object.fromEntries(response.headers.entries())
            };
        });

        // Conditional Actions
        this.register('control.condition', async (config, context) => {
            const { conditions, then_actions, else_actions } = config;
            const conditionMet = this.evaluateConditions(conditions, context);
            
            const actionsToRun = conditionMet ? then_actions : else_actions;
            const results = [];
            
            for (const action of actionsToRun) {
                const result = await this.executeAction(action, context);
                results.push(result);
            }
            
            return { condition_met: conditionMet, results };
        });

        // Loop Actions
        this.register('control.loop', async (config, context) => {
            const { items_field, loop_actions, max_iterations = 100 } = config;
            const items = this.getValueFromContext(items_field, context);
            const results = [];

            for (let i = 0; i < Math.min(items.length, max_iterations); i++) {
                const loopContext = {
                    ...context,
                    loop: { index: i, item: items[i], total: items.length }
                };

                for (const action of loop_actions) {
                    const result = await this.executeAction(action, loopContext);
                    results.push(result);
                }
            }

            return results;
        });

        // Wait Actions
        this.register('control.wait', async (config) => {
            const { duration_seconds } = config;
            await new Promise(resolve => setTimeout(resolve, duration_seconds * 1000));
            return { waited: duration_seconds };
        });

        // Database Actions
        this.register('database.query', async (config, context) => {
            const { query, parameters } = config;
            const interpolatedParams = this.interpolateData(parameters, context);
            return await db.query(query, interpolatedParams);
        });

        // File Actions
        this.register('file.upload', async (config, context) => {
            const { source_url, destination_path } = config;
            const interpolatedPath = this.interpolateString(destination_path, context);
            return await fileService.upload(source_url, interpolatedPath);
        });

        // Analytics Actions
        this.register('analytics.track', async (config, context) => {
            const { event_name, properties } = config;
            const interpolatedProps = this.interpolateData(properties, context);
            return await analyticsService.track(event_name, interpolatedProps);
        });
    }

    register(actionType, executor) {
        this.actions.set(actionType, executor);
    }

    interpolateData(data, context) {
        if (typeof data === 'string') {
            return this.interpolateString(data, context);
        } else if (Array.isArray(data)) {
            return data.map(item => this.interpolateData(item, context));
        } else if (data && typeof data === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(data)) {
                result[key] = this.interpolateData(value, context);
            }
            return result;
        }
        return data;
    }

    interpolateString(str, context) {
        return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getValueFromContext(path.trim(), context);
            return value !== undefined ? value : match;
        });
    }
}
```

### Trigger System

```javascript
// services/workflow-triggers.js
class WorkflowTriggers {
    constructor(workflowEngine) {
        this.engine = workflowEngine;
        this.eventHandlers = new Map();
        this.webhookHandlers = new Map();
        this.scheduledJobs = new Map();
        
        this.setupEventListeners();
        this.setupScheduler();
        this.setupWebhooks();
    }

    async setupEventListeners() {
        // Notion event triggers
        notionEvents.on('project.created', async (data) => {
            await this.handleEvent('notion.project.created', data);
        });

        notionEvents.on('project.updated', async (data) => {
            await this.handleEvent('notion.project.updated', data);
        });

        notionEvents.on('opportunity.stage_changed', async (data) => {
            await this.handleEvent('notion.opportunity.stage_changed', data);
        });

        // System event triggers
        systemEvents.on('user.registered', async (data) => {
            await this.handleEvent('system.user.registered', data);
        });

        systemEvents.on('budget.exceeded', async (data) => {
            await this.handleEvent('system.budget.exceeded', data);
        });

        // Financial event triggers
        financialEvents.on('payment.received', async (data) => {
            await this.handleEvent('financial.payment.received', data);
        });

        financialEvents.on('invoice.overdue', async (data) => {
            await this.handleEvent('financial.invoice.overdue', data);
        });
    }

    async handleEvent(eventType, eventData) {
        // Find all workflows triggered by this event
        const workflows = await db.query(
            `SELECT * FROM workflows 
             WHERE trigger_type = 'event' 
             AND trigger_config->>'event_type' = $1
             AND is_active = true`,
            [eventType]
        );

        // Execute each workflow
        for (const workflow of workflows.rows) {
            try {
                await this.engine.executeWorkflow(workflow.id, {
                    trigger: { type: 'event', event: eventType },
                    event_data: eventData
                });
            } catch (error) {
                console.error(`Failed to execute workflow ${workflow.id}:`, error);
                await this.notifyError(workflow, error);
            }
        }
    }

    async setupScheduler() {
        // Use node-cron for scheduling
        const cron = require('node-cron');
        
        // Load all scheduled workflows
        const schedules = await db.query(
            `SELECT ws.*, w.* 
             FROM workflow_schedules ws
             JOIN workflows w ON ws.workflow_id = w.id
             WHERE ws.is_active = true AND w.is_active = true`
        );

        for (const schedule of schedules.rows) {
            this.scheduleWorkflow(schedule);
        }

        // Check for schedules every minute
        cron.schedule('* * * * *', async () => {
            await this.checkScheduledWorkflows();
        });
    }

    scheduleWorkflow(schedule) {
        const cron = require('node-cron');
        
        const job = cron.schedule(schedule.cron_expression, async () => {
            try {
                await this.engine.executeWorkflow(schedule.workflow_id, {
                    trigger: { type: 'schedule', schedule_id: schedule.id }
                });
                
                // Update last run time
                await db.query(
                    'UPDATE workflow_schedules SET last_run_at = CURRENT_TIMESTAMP WHERE id = $1',
                    [schedule.id]
                );
            } catch (error) {
                console.error(`Scheduled workflow failed:`, error);
            }
        }, {
            timezone: schedule.timezone
        });

        this.scheduledJobs.set(schedule.id, job);
    }

    async setupWebhooks() {
        // Register webhook endpoints
        app.post('/webhooks/workflow/:webhookId', async (req, res) => {
            try {
                const { webhookId } = req.params;
                const workflows = await this.getWebhookWorkflows(webhookId);
                
                for (const workflow of workflows) {
                    await this.engine.executeWorkflow(workflow.id, {
                        trigger: { type: 'webhook', webhook_id: webhookId },
                        webhook_data: req.body,
                        headers: req.headers
                    });
                }
                
                res.json({ success: true, workflows_triggered: workflows.length });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
}
```

### Workflow Designer UI

```javascript
// components/WorkflowDesigner.js
class WorkflowDesigner {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.workflow = {
            name: '',
            description: '',
            trigger: null,
            steps: []
        };
        this.selectedStep = null;
        
        this.init();
    }

    init() {
        this.render();
        this.setupDragAndDrop();
        this.loadActionLibrary();
    }

    render() {
        this.container.innerHTML = `
            <div class="workflow-designer">
                <div class="designer-header">
                    <input type="text" id="workflow-name" placeholder="Workflow Name" />
                    <textarea id="workflow-description" placeholder="Description"></textarea>
                </div>

                <div class="designer-body">
                    <div class="action-library">
                        <h3>Actions</h3>
                        <div class="action-categories">
                            <div class="category" data-category="notion">
                                <h4>Notion</h4>
                                <div class="action-items" id="notion-actions"></div>
                            </div>
                            <div class="category" data-category="email">
                                <h4>Email</h4>
                                <div class="action-items" id="email-actions"></div>
                            </div>
                            <div class="category" data-category="data">
                                <h4>Data</h4>
                                <div class="action-items" id="data-actions"></div>
                            </div>
                            <div class="category" data-category="control">
                                <h4>Control Flow</h4>
                                <div class="action-items" id="control-actions"></div>
                            </div>
                        </div>
                    </div>

                    <div class="workflow-canvas">
                        <div class="trigger-section">
                            <h3>Trigger</h3>
                            <div id="trigger-config"></div>
                        </div>
                        
                        <div class="steps-section">
                            <h3>Steps</h3>
                            <div id="workflow-steps"></div>
                        </div>
                    </div>

                    <div class="step-config">
                        <h3>Step Configuration</h3>
                        <div id="step-config-content"></div>
                    </div>
                </div>

                <div class="designer-footer">
                    <button onclick="workflowDesigner.testWorkflow()">Test</button>
                    <button onclick="workflowDesigner.saveWorkflow()">Save</button>
                    <button onclick="workflowDesigner.deployWorkflow()">Deploy</button>
                </div>
            </div>
        `;
    }

    loadActionLibrary() {
        const actions = {
            notion: [
                { id: 'create_project', name: 'Create Project', icon: '📄' },
                { id: 'update_project', name: 'Update Project', icon: '✏️' },
                { id: 'create_opportunity', name: 'Create Opportunity', icon: '💰' },
                { id: 'update_opportunity', name: 'Update Opportunity', icon: '📊' }
            ],
            email: [
                { id: 'send_email', name: 'Send Email', icon: '📧' },
                { id: 'send_template', name: 'Send Template', icon: '📨' }
            ],
            data: [
                { id: 'transform', name: 'Transform Data', icon: '🔄' },
                { id: 'aggregate', name: 'Aggregate', icon: '📊' },
                { id: 'filter', name: 'Filter', icon: '🔍' }
            ],
            control: [
                { id: 'condition', name: 'If/Then', icon: '❓' },
                { id: 'loop', name: 'For Each', icon: '🔁' },
                { id: 'wait', name: 'Wait', icon: '⏱️' }
            ]
        };

        Object.entries(actions).forEach(([category, items]) => {
            const container = document.getElementById(`${category}-actions`);
            items.forEach(action => {
                const element = this.createActionElement(action, category);
                container.appendChild(element);
            });
        });
    }

    createActionElement(action, category) {
        const div = document.createElement('div');
        div.className = 'action-item';
        div.draggable = true;
        div.dataset.actionType = `${category}.${action.id}`;
        div.innerHTML = `
            <span class="action-icon">${action.icon}</span>
            <span class="action-name">${action.name}</span>
        `;
        
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('actionType', div.dataset.actionType);
        });
        
        return div;
    }

    setupDragAndDrop() {
        const stepsContainer = document.getElementById('workflow-steps');
        
        stepsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        });

        stepsContainer.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('drag-over');
        });

        stepsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            
            const actionType = e.dataTransfer.getData('actionType');
            this.addStep(actionType);
        });
    }

    addStep(actionType) {
        const step = {
            id: this.generateId(),
            action_type: actionType,
            config: {},
            condition: null
        };

        this.workflow.steps.push(step);
        this.renderSteps();
        this.selectStep(step.id);
    }

    renderSteps() {
        const container = document.getElementById('workflow-steps');
        container.innerHTML = '';

        this.workflow.steps.forEach((step, index) => {
            const stepElement = this.createStepElement(step, index);
            container.appendChild(stepElement);
        });
    }

    createStepElement(step, index) {
        const div = document.createElement('div');
        div.className = 'workflow-step';
        div.dataset.stepId = step.id;
        div.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div class="step-content">
                <div class="step-type">${step.action_type}</div>
                <div class="step-summary">${this.getStepSummary(step)}</div>
            </div>
            <div class="step-actions">
                <button onclick="workflowDesigner.configureStep('${step.id}')">⚙️</button>
                <button onclick="workflowDesigner.deleteStep('${step.id}')">🗑️</button>
            </div>
        `;

        div.addEventListener('click', () => this.selectStep(step.id));
        
        return div;
    }

    configureStep(stepId) {
        const step = this.workflow.steps.find(s => s.id === stepId);
        if (!step) return;

        this.selectedStep = step;
        this.renderStepConfig(step);
    }

    renderStepConfig(step) {
        const container = document.getElementById('step-config-content');
        const actionSchema = this.getActionSchema(step.action_type);
        
        container.innerHTML = `
            <h4>${step.action_type}</h4>
            <form id="step-config-form">
                ${this.renderConfigFields(actionSchema, step.config)}
                <button type="submit">Save Configuration</button>
            </form>
        `;

        document.getElementById('step-config-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStepConfig();
        });
    }

    async testWorkflow() {
        const testData = {
            trigger: this.workflow.trigger,
            test_data: this.getTestData()
        };

        try {
            const response = await fetch('/api/workflows/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflow: this.workflow, testData })
            });

            const result = await response.json();
            this.showTestResults(result);
        } catch (error) {
            alert(`Test failed: ${error.message}`);
        }
    }

    async saveWorkflow() {
        try {
            const response = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.workflow)
            });

            const saved = await response.json();
            alert(`Workflow saved with ID: ${saved.id}`);
            this.workflow.id = saved.id;
        } catch (error) {
            alert(`Save failed: ${error.message}`);
        }
    }

    async deployWorkflow() {
        if (!this.workflow.id) {
            alert('Please save the workflow first');
            return;
        }

        try {
            const response = await fetch(`/api/workflows/${this.workflow.id}/deploy`, {
                method: 'POST'
            });

            if (response.ok) {
                alert('Workflow deployed successfully');
            } else {
                throw new Error('Deployment failed');
            }
        } catch (error) {
            alert(`Deploy failed: ${error.message}`);
        }
    }
}
```

## Pre-built Workflow Templates

### 1. Opportunity Won Automation

```json
{
    "name": "Opportunity Won - Project Setup",
    "description": "Automatically set up project when opportunity is won",
    "trigger": {
        "type": "event",
        "config": {
            "event_type": "notion.opportunity.stage_changed",
            "conditions": [
                { "field": "new_stage", "operator": "equals", "value": "Closed Won" }
            ]
        }
    },
    "steps": [
        {
            "action_type": "notion.create_project",
            "config": {
                "project_data": {
                    "name": "{{event_data.opportunity.name}} - Project",
                    "area": "{{event_data.opportunity.area}}",
                    "status": "Active",
                    "funding": "Funded",
                    "lead": "{{event_data.opportunity.primary_contact}}",
                    "revenue_potential": "{{event_data.opportunity.amount}}"
                }
            }
        },
        {
            "action_type": "email.send_template",
            "config": {
                "template_id": "project_kickoff",
                "recipients": ["{{event_data.opportunity.primary_contact.email}}"],
                "variables": {
                    "project_name": "{{step_1.name}}",
                    "amount": "{{event_data.opportunity.amount}}"
                }
            }
        },
        {
            "action_type": "slack.send_message",
            "config": {
                "channel": "#wins",
                "message": "🎉 New project won: {{step_1.name}} worth {{event_data.opportunity.amount}}"
            }
        }
    ]
}
```

### 2. Weekly Financial Report

```json
{
    "name": "Weekly Financial Report",
    "description": "Generate and send weekly financial reports",
    "trigger": {
        "type": "schedule",
        "config": {
            "cron_expression": "0 9 * * MON",
            "timezone": "Australia/Sydney"
        }
    },
    "steps": [
        {
            "action_type": "data.aggregate",
            "config": {
                "source": "financial_transactions",
                "date_range": "last_week",
                "group_by": ["category", "project"],
                "calculations": ["sum", "count", "average"]
            }
        },
        {
            "action_type": "report.generate",
            "config": {
                "template": "weekly_financial",
                "data": "{{step_1}}",
                "format": "pdf"
            }
        },
        {
            "action_type": "email.send",
            "config": {
                "to": ["finance@act.org.au", "management@act.org.au"],
                "subject": "Weekly Financial Report - {{date.week}}",
                "body": "Please find attached the weekly financial report.",
                "attachments": ["{{step_2.file_url}}"]
            }
        }
    ]
}
```

### 3. Budget Alert Automation

```json
{
    "name": "Budget Overspend Alert",
    "description": "Alert when project exceeds budget threshold",
    "trigger": {
        "type": "event",
        "config": {
            "event_type": "financial.transaction.created"
        }
    },
    "steps": [
        {
            "action_type": "data.query",
            "config": {
                "query": "SELECT budget_utilization FROM project_budgets WHERE project_id = '{{event_data.project_id}}'"
            }
        },
        {
            "action_type": "control.condition",
            "config": {
                "conditions": [
                    { "field": "step_1.budget_utilization", "operator": "greater_than", "value": 90 }
                ],
                "then_actions": [
                    {
                        "action_type": "email.send_template",
                        "config": {
                            "template_id": "budget_alert",
                            "recipients": ["{{project.lead.email}}", "finance@act.org.au"]
                        }
                    },
                    {
                        "action_type": "notion.update_project",
                        "config": {
                            "project_id": "{{event_data.project_id}}",
                            "updates": {
                                "tags": { "add": ["Budget Alert"] }
                            }
                        }
                    }
                ]
            }
        }
    ]
}
```

## Monitoring and Analytics

### Workflow Analytics Dashboard

```javascript
// services/workflow-analytics.js
class WorkflowAnalytics {
    async getWorkflowMetrics(timeRange = '7d') {
        const metrics = await db.query(`
            SELECT 
                w.id,
                w.name,
                COUNT(DISTINCT we.id) as total_executions,
                COUNT(DISTINCT CASE WHEN we.status = 'completed' THEN we.id END) as successful_executions,
                COUNT(DISTINCT CASE WHEN we.status = 'failed' THEN we.id END) as failed_executions,
                AVG(EXTRACT(EPOCH FROM (we.completed_at - we.started_at))) as avg_duration_seconds,
                MAX(we.started_at) as last_execution
            FROM workflows w
            LEFT JOIN workflow_executions we ON w.id = we.workflow_id
            WHERE we.started_at > NOW() - INTERVAL $1
            GROUP BY w.id, w.name
            ORDER BY total_executions DESC
        `, [timeRange]);

        return metrics.rows;
    }

    async getExecutionDetails(executionId) {
        const execution = await db.query(`
            SELECT 
                we.*,
                w.name as workflow_name,
                array_agg(
                    json_build_object(
                        'step_number', ws.step_number,
                        'action_type', ws.action_type,
                        'status', se.status,
                        'duration', EXTRACT(EPOCH FROM (se.completed_at - se.started_at)),
                        'error', se.error_message
                    ) ORDER BY ws.step_number
                ) as steps
            FROM workflow_executions we
            JOIN workflows w ON we.workflow_id = w.id
            LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
            LEFT JOIN step_executions se ON se.execution_id = we.id AND se.step_id = ws.id
            WHERE we.id = $1
            GROUP BY we.id, w.name
        `, [executionId]);

        return execution.rows[0];
    }

    async getPerformanceMetrics() {
        return {
            execution_rate: await this.getExecutionRate(),
            success_rate: await this.getSuccessRate(),
            average_duration: await this.getAverageDuration(),
            error_patterns: await this.getErrorPatterns(),
            bottlenecks: await this.identifyBottlenecks()
        };
    }
}
```

## Security Considerations

1. **Workflow Permissions**: Role-based access to create/edit workflows
2. **Execution Limits**: Rate limiting and resource quotas
3. **Data Isolation**: Workflows can only access authorized data
4. **Audit Trail**: Complete logging of all workflow executions
5. **Secret Management**: Secure storage of API keys and credentials

## Implementation Roadmap

### Phase 1: Core Engine (Week 1)
- Workflow execution engine
- Basic action library
- Database schema setup

### Phase 2: Triggers & Scheduling (Week 2)
- Event trigger system
- Cron scheduler
- Webhook support

### Phase 3: Designer UI (Week 3)
- Visual workflow designer
- Action configuration forms
- Testing interface

### Phase 4: Advanced Features (Week 4)
- Complex control flows
- Error handling
- Performance optimization
- Analytics dashboard

## Next Steps

1. Set up workflow database tables
2. Implement core workflow engine
3. Create basic action library
4. Build trigger system
5. Develop workflow designer UI
6. Add monitoring and analytics
7. Create workflow templates
8. Test with real-world scenarios