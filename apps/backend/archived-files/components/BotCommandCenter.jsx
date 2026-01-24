/**
 * Unified Bot Command Center - Central Dashboard for ACT Universal Bot Platform
 * Provides real-time monitoring, control, and orchestration of all bots
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Progress, Badge, Tabs, Alert, Statistic, Space } from 'antd';
import {
  RobotOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  TeamOutlined,
  FundOutlined,
  FileTextOutlined,
  BulbOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  PauseOutlined,
  CloseOutlined,
  ExportOutlined,
  CloudDownloadOutlined
} from '@ant-design/icons';
import { Line, Bar, Pie, Radar } from '@ant-design/charts';
import botOrchestrator from '../services/botOrchestrator.js';
import './BotCommandCenter.css';

const { TabPane } = Tabs;

// Bot status indicators
const BOT_STATUS = {
  IDLE: { color: 'default', text: 'Idle' },
  RUNNING: { color: 'processing', text: 'Running' },
  SUCCESS: { color: 'success', text: 'Success' },
  ERROR: { color: 'error', text: 'Error' },
  LEARNING: { color: 'purple', text: 'Learning' }
};

// Bot catalog with metadata
const BOT_CATALOG = {
  'entity-setup-bot': {
    name: 'Entity Setup Bot',
    icon: <SafetyOutlined />,
    category: 'operations',
    description: 'Company registration and setup'
  },
  'bookkeeping-bot': {
    name: 'Bookkeeping Bot',
    icon: <FundOutlined />,
    category: 'financial',
    description: 'Automated bookkeeping with Xero'
  },
  'compliance-bot': {
    name: 'Compliance Bot',
    icon: <SafetyOutlined />,
    category: 'financial',
    description: 'GST, BAS, and payroll compliance'
  },
  'partnership-bot': {
    name: 'Partnership Bot',
    icon: <TeamOutlined />,
    category: 'relationships',
    description: 'Manage 142+ partnerships'
  },
  'community-impact-bot': {
    name: 'Community Impact Bot',
    icon: <TeamOutlined />,
    category: 'impact',
    description: 'Story collection and impact measurement'
  },
  'code-documentation-bot': {
    name: 'Code & Docs Bot',
    icon: <FileTextOutlined />,
    category: 'development',
    description: 'Automated development and documentation'
  },
  'strategic-intelligence-bot': {
    name: 'Strategic Intelligence Bot',
    icon: <BulbOutlined />,
    category: 'strategy',
    description: 'Market intelligence and opportunities'
  }
};

export const BotCommandCenter = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [botStatuses, setBotStatuses] = useState({});
  const [metrics, setMetrics] = useState({});
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orchestratorStatus, setOrchestratorStatus] = useState('healthy');
  
  // Real-time data fetching
  useEffect(() => {
    fetchBotStatuses();
    fetchMetrics();
    fetchActivities();
    fetchAlerts();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchBotStatuses();
      fetchMetrics();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchBotStatuses = async () => {
    try {
      const statuses = await botOrchestrator.getBotStatuses();
      setBotStatuses(statuses);
    } catch (error) {
      console.error('Failed to fetch bot statuses:', error);
    }
  };
  
  const fetchMetrics = async () => {
    try {
      const metricsData = await botOrchestrator.getMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };
  
  const fetchActivities = async () => {
    try {
      const recentActivities = await botOrchestrator.getRecentActivities();
      setActivities(recentActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };
  
  const fetchAlerts = async () => {
    try {
      const currentAlerts = await botOrchestrator.getAlerts();
      setAlerts(currentAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };
  
  const handleBotAction = async (botId, action) => {
    try {
      setIsRefreshing(true);
      await botOrchestrator.controlBot(botId, action);
      await fetchBotStatuses();
      setIsRefreshing(false);
    } catch (error) {
      console.error(`Failed to ${action} bot ${botId}:`, error);
      setIsRefreshing(false);
    }
  };
  
  const handleWorkflowExecution = async (workflowId) => {
    try {
      const result = await botOrchestrator.executeWorkflow(workflowId);
      console.log('Workflow executed:', result);
      await fetchActivities();
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };
  
  // Render bot status cards
  const renderBotCard = (botId) => {
    const bot = BOT_CATALOG[botId];
    const status = botStatuses[botId] || { status: 'IDLE', lastRun: null };
    const statusConfig = BOT_STATUS[status.status] || BOT_STATUS.IDLE;
    
    return (
      <Card
        key={botId}
        className="bot-card"
        hoverable
        onClick={() => setSelectedBot(botId)}
        actions={[
          <Button
            type="text"
            icon={<ThunderboltOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleBotAction(botId, 'start');
            }}
            disabled={status.status === 'RUNNING'}
          >
            Start
          </Button>,
          <Button
            type="text"
            icon={<SyncOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleBotAction(botId, 'restart');
            }}
          >
            Restart
          </Button>
        ]}
      >
        <Card.Meta
          avatar={<div className="bot-icon">{bot.icon}</div>}
          title={
            <div className="bot-title">
              {bot.name}
              <Badge status={statusConfig.color} text={statusConfig.text} />
            </div>
          }
          description={
            <div>
              <p>{bot.description}</p>
              <div className="bot-metrics">
                <span>Success Rate: {status.successRate || 0}%</span>
                <span>Last Run: {status.lastRun || 'Never'}</span>
              </div>
            </div>
          }
        />
      </Card>
    );
  };
  
  // Render overview dashboard
  const renderOverview = () => {
    const totalBots = Object.keys(BOT_CATALOG).length;
    const activeBots = Object.values(botStatuses).filter(s => s.status === 'RUNNING').length;
    const successRate = metrics.overallSuccessRate || 0;
    const totalAutomations = metrics.totalAutomations || 0;
    
    return (
      <div className="overview-dashboard">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Bots"
                value={totalBots}
                prefix={<RobotOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Active Bots"
                value={activeBots}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Success Rate"
                value={successRate}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: successRate > 90 ? '#3f8600' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Automations"
                value={totalAutomations}
                prefix={<SyncOutlined />}
              />
            </Card>
          </Col>
        </Row>
        
        <div className="bot-grid">
          <h3>Bot Fleet Status</h3>
          <Row gutter={[16, 16]}>
            {Object.keys(BOT_CATALOG).map(botId => (
              <Col xs={24} sm={12} lg={8} key={botId}>
                {renderBotCard(botId)}
              </Col>
            ))}
          </Row>
        </div>
        
        <div className="metrics-charts">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Bot Performance Trends">
                {renderPerformanceChart()}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Automation Distribution">
                {renderDistributionChart()}
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  };
  
  // Render performance chart
  const renderPerformanceChart = () => {
    const data = metrics.performanceTrends || [];
    
    const config = {
      data,
      xField: 'time',
      yField: 'value',
      seriesField: 'bot',
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000
        }
      }
    };
    
    return <Line {...config} />;
  };
  
  // Render distribution chart
  const renderDistributionChart = () => {
    const data = Object.entries(BOT_CATALOG).map(([id, bot]) => ({
      type: bot.name,
      value: metrics.botUsage?.[id] || 0
    }));
    
    const config = {
      data,
      angleField: 'value',
      colorField: 'type',
      radius: 0.8,
      label: {
        type: 'outer',
        content: '{name} {percentage}'
      }
    };
    
    return <Pie {...config} />;
  };
  
  // Render activities panel
  const renderActivities = () => {
    return (
      <div className="activities-panel">
        <h3>Recent Bot Activities</h3>
        <div className="activity-list">
          {activities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">
                {BOT_CATALOG[activity.botId]?.icon}
              </div>
              <div className="activity-content">
                <div className="activity-title">
                  {BOT_CATALOG[activity.botId]?.name} - {activity.action}
                </div>
                <div className="activity-description">
                  {activity.description}
                </div>
                <div className="activity-time">
                  {activity.timestamp}
                </div>
              </div>
              <div className="activity-status">
                <Badge status={BOT_STATUS[activity.status]?.color} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render workflows panel
  const renderWorkflows = () => {
    const workflows = [
      {
        id: 'monthly-compliance',
        name: 'Monthly Compliance Run',
        description: 'GST calculation, BAS preparation, and payroll processing',
        bots: ['bookkeeping-bot', 'compliance-bot'],
        schedule: 'Monthly on 1st'
      },
      {
        id: 'grant-intelligence',
        name: 'Grant Intelligence Scan',
        description: 'Identify and score grant opportunities',
        bots: ['strategic-intelligence-bot'],
        schedule: 'Weekly on Monday'
      },
      {
        id: 'impact-reporting',
        name: 'Impact Report Generation',
        description: 'Collect stories and generate impact reports',
        bots: ['community-impact-bot', 'code-documentation-bot'],
        schedule: 'Quarterly'
      },
      {
        id: 'partnership-review',
        name: 'Partnership Health Check',
        description: 'Review and score all partnerships',
        bots: ['partnership-bot'],
        schedule: 'Monthly on 15th'
      }
    ];
    
    return (
      <div className="workflows-panel">
        <h3>Automated Workflows</h3>
        <Row gutter={[16, 16]}>
          {workflows.map(workflow => (
            <Col xs={24} lg={12} key={workflow.id}>
              <Card
                title={workflow.name}
                extra={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleWorkflowExecution(workflow.id)}
                  >
                    Execute Now
                  </Button>
                }
              >
                <p>{workflow.description}</p>
                <div className="workflow-details">
                  <div>
                    <strong>Bots:</strong> {workflow.bots.map(b => BOT_CATALOG[b]?.name).join(', ')}
                  </div>
                  <div>
                    <strong>Schedule:</strong> {workflow.schedule}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };
  
  // Render learning panel
  const renderLearning = () => {
    const learningMetrics = {
      totalLearningCycles: metrics.learningCycles || 0,
      improvementRate: metrics.improvementRate || 0,
      accuracyGain: metrics.accuracyGain || 0,
      adaptations: metrics.adaptations || []
    };
    
    return (
      <div className="learning-panel">
        <h3>Bot Learning & Improvement</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Learning Cycles"
                value={learningMetrics.totalLearningCycles}
                prefix={<BulbOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Improvement Rate"
                value={learningMetrics.improvementRate}
                suffix="%"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Accuracy Gain"
                value={learningMetrics.accuracyGain}
                suffix="%"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
        
        <Card title="Recent Adaptations" className="adaptations-card">
          <div className="adaptation-list">
            {learningMetrics.adaptations.map((adaptation, index) => (
              <div key={index} className="adaptation-item">
                <div className="adaptation-bot">
                  {BOT_CATALOG[adaptation.botId]?.name}
                </div>
                <div className="adaptation-description">
                  {adaptation.description}
                </div>
                <div className="adaptation-impact">
                  Impact: <Badge status="success" text={`+${adaptation.impact}%`} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        <Card title="Learning Patterns">
          {renderLearningPatterns()}
        </Card>
      </div>
    );
  };
  
  // Render learning patterns chart
  const renderLearningPatterns = () => {
    const data = metrics.learningPatterns || [];
    
    const config = {
      data,
      xField: 'month',
      yField: 'improvement',
      seriesField: 'category',
      isGroup: true,
      columnStyle: {
        radius: [20, 20, 0, 0]
      }
    };
    
    return <Bar {...config} />;
  };
  
  // Render controls panel
  const renderControls = () => {
    return (
      <div className="controls-panel">
        <h3>System Controls</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Orchestrator Controls">
              <div className="control-buttons">
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => botOrchestrator.startAll()}
                  block
                >
                  Start All Bots
                </Button>
                <Button
                  type="default"
                  icon={<ClockCircleOutlined />}
                  onClick={() => botOrchestrator.pauseAll()}
                  block
                >
                  Pause All Bots
                </Button>
                <Button
                  type="danger"
                  onClick={() => botOrchestrator.stopAll()}
                  block
                >
                  Stop All Bots
                </Button>
                <Button
                  type="default"
                  icon={<SyncOutlined />}
                  onClick={() => botOrchestrator.resetAll()}
                  block
                >
                  Reset System
                </Button>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Policy Engine">
              <div className="policy-status">
                <div className="policy-item">
                  <span>Community Benefit (40%)</span>
                  <Badge status="success" text="Enforced" />
                </div>
                <div className="policy-item">
                  <span>Data Sovereignty</span>
                  <Badge status="success" text="Active" />
                </div>
                <div className="policy-item">
                  <span>Transparency Audit</span>
                  <Badge status="success" text="Enabled" />
                </div>
                <div className="policy-item">
                  <span>HITL Framework</span>
                  <Badge status="processing" text="Monitoring" />
                </div>
              </div>
              <Button type="primary" block style={{ marginTop: 16 }}>
                Configure Policies
              </Button>
            </Card>
          </Col>
        </Row>
        
        <Card title="Export & Backup">
          <p>Export bot configurations and learning models for community ownership</p>
          <div className="export-controls">
            <Button icon={<FileTextOutlined />}>
              Export Bot Configurations
            </Button>
            <Button icon={<BulbOutlined />}>
              Export Learning Models
            </Button>
            <Button icon={<SafetyOutlined />}>
              Backup System State
            </Button>
          </div>
        </Card>
      </div>
    );
  };
  
  // Render alerts
  const renderAlerts = () => {
    if (alerts.length === 0) return null;
    
    return (
      <div className="alerts-section">
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            message={alert.title}
            description={alert.description}
            type={alert.type}
            showIcon
            closable
            onClose={() => {
              setAlerts(alerts.filter((_, i) => i !== index));
            }}
          />
        ))}
      </div>
    );
  };
  
  // Main render
  return (
    <div className="bot-command-center">
      <div className="command-center-header">
        <h1>
          <RobotOutlined /> ACT Universal Bot Command Center
        </h1>
        <div className="header-actions">
          <Badge status={orchestratorStatus === 'healthy' ? 'success' : 'error'}>
            <span>Orchestrator: {orchestratorStatus}</span>
          </Badge>
          <Button
            icon={<SyncOutlined spin={isRefreshing} />}
            onClick={() => {
              setIsRefreshing(true);
              Promise.all([
                fetchBotStatuses(),
                fetchMetrics(),
                fetchActivities(),
                fetchAlerts()
              ]).then(() => setIsRefreshing(false));
            }}
          >
            Refresh
          </Button>
        </div>
      </div>
      
      {renderAlerts()}
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={<span><DashboardOutlined /> Overview</span>} key="overview">
          {renderOverview()}
        </TabPane>
        <TabPane tab={<span><ClockCircleOutlined /> Activities</span>} key="activities">
          {renderActivities()}
        </TabPane>
        <TabPane tab={<span><ThunderboltOutlined /> Workflows</span>} key="workflows">
          {renderWorkflows()}
        </TabPane>
        <TabPane tab={<span><BulbOutlined /> Learning</span>} key="learning">
          {renderLearning()}
        </TabPane>
        <TabPane tab={<span><SafetyOutlined /> Controls</span>} key="controls">
          {renderControls()}
        </TabPane>
      </Tabs>
      
      {selectedBot && (
        <BotDetailModal
          bot={BOT_CATALOG[selectedBot]}
          botId={selectedBot}
          status={botStatuses[selectedBot]}
          onClose={() => setSelectedBot(null)}
          onAction={handleBotAction}
        />
      )}
    </div>
  );
};

// Bot detail modal component
const BotDetailModal = ({ bot, botId, status, onClose, onAction }) => {
  if (!bot) return null;
  
  return (
    <div className="bot-detail-modal" onClick={onClose}>
      <div className="bot-detail-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {bot.icon} {bot.name}
            <span className="community-benefit-badge">Community Benefit</span>
          </h2>
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
        </div>
        
        <div className="modal-body">
          <p className="bot-description">{bot.description}</p>
          
          <div className="bot-status-section">
            <h3>Current Status</h3>
            <Badge status={BOT_STATUS[status?.status || 'IDLE'].color} 
                   text={BOT_STATUS[status?.status || 'IDLE'].text} />
            <p>Last Run: {status?.lastRun || 'Never'}</p>
            <p>Success Rate: {status?.successRate || 0}%</p>
          </div>
          
          <div className="bot-capabilities-section">
            <h3>Capabilities</h3>
            <div className="capabilities-list">
              {BOT_CATALOG[botId]?.capabilities?.map((cap, idx) => (
                <Badge key={idx} color="blue">{cap}</Badge>
              )) || <span>Loading capabilities...</span>}
            </div>
          </div>
          
          <div className="bot-metrics-section">
            <h3>Performance Metrics</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="Total Runs" value={status?.totalRuns || 0} />
              </Col>
              <Col span={8}>
                <Statistic title="Avg Response" value={`${status?.avgResponse || 0}ms`} />
              </Col>
              <Col span={8}>
                <Statistic title="Uptime" value={`${status?.uptime || 0}%`} />
              </Col>
            </Row>
          </div>
          
          <div className="bot-actions-section">
            <h3>Actions</h3>
            <Space wrap>
              <Button type="primary" icon={<ThunderboltOutlined />}
                      onClick={() => onAction(botId, 'start')}
                      disabled={status?.status === 'RUNNING'}>
                Start Bot
              </Button>
              <Button icon={<PauseOutlined />}
                      onClick={() => onAction(botId, 'pause')}
                      disabled={status?.status !== 'RUNNING'}>
                Pause Bot
              </Button>
              <Button icon={<SyncOutlined />}
                      onClick={() => onAction(botId, 'restart')}>
                Restart Bot
              </Button>
              <Button danger
                      onClick={() => onAction(botId, 'stop')}
                      disabled={status?.status === 'IDLE'}>
                Stop Bot
              </Button>
            </Space>
          </div>
          
          <div className="bot-export-section">
            <h3>Export for Community Ownership</h3>
            <p>Export this bot's configuration and learning models for community use.</p>
            <Space>
              <Button icon={<ExportOutlined />}>Export Configuration</Button>
              <Button icon={<CloudDownloadOutlined />}>Export Learning Model</Button>
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotCommandCenter;