/**
 * ACT Business Agent - World-Class AI Assistant Interface
 * 
 * Unified interface for the ACT Business Agent v3
 * Provides intelligent business insights, compliance tracking, and strategic guidance
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface BusinessAgentQuery {
  query: string;
  intent: string;
  response: string;
  confidence: number;
  sources: string[];
  actions: string[];
  timestamp: string;
}

interface ComplianceStatus {
  overall: number;
  details: {
    bas: { status: string; nextDue: string };
    payg: { status: string };
    superannuation: { status: string };
    rdTaxIncentive: { eligible: boolean; potentialBenefit: number };
    indigenousPrograms: any[];
  };
  nextActions: string[];
  dueDate: string;
}

interface GrantOpportunity {
  id: string;
  name: string;
  amount: string;
  deadline: string;
  relevanceScore: number;
  description: string;
}

interface ProjectHealth {
  projectId: string;
  projectName: string;
  healthScore: number;
  risks: string[];
  opportunities: string[];
  recommendations: string[];
}

interface Alert {
  id: string;
  type: 'financial' | 'project' | 'opportunity' | 'compliance';
  priority: number;
  title: string;
  description: string;
  action?: string;
  dueDate?: string;
}

export default function ACTBusinessAgent() {
  const [activeTab, setActiveTab] = useState<'chat' | 'monitoring' | 'compliance' | 'grants' | 'projects'>('chat');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<BusinessAgentQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [grants, setGrants] = useState<GrantOpportunity[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([]);

  // Load initial data
  useEffect(() => {
    loadMonitoringData();
    loadComplianceData();
    loadGrantsData();
    loadProjectHealthData();
  }, []);

  const loadMonitoringData = async () => {
    try {
      const response = await fetch('/api/v3/agent/monitoring');
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    }
  };

  const loadComplianceData = async () => {
    try {
      const response = await fetch('/api/v3/agent/compliance');
      const data = await response.json();
      if (data.success) {
        setCompliance(data.compliance);
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    }
  };

  const loadGrantsData = async () => {
    try {
      const response = await fetch('/api/v3/agent/grants');
      const data = await response.json();
      if (data.success) {
        setGrants(data.grants);
      }
    } catch (error) {
      console.error('Failed to load grants data:', error);
    }
  };

  const loadProjectHealthData = async () => {
    try {
      const response = await fetch('/api/v3/agent/projects/health');
      const data = await response.json();
      if (data.success) {
        setProjectHealth(data.analysis);
      }
    } catch (error) {
      console.error('Failed to load project health data:', error);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v3/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => [...prev, data]);
        setQuery('');
      } else {
        console.error('Query failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to send query:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertColor = (priority: number) => {
    if (priority >= 9) return 'bg-red-100 border-red-300 text-red-800';
    if (priority >= 7) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-blue-100 border-blue-300 text-blue-800';
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🤖 ACT Business Agent
        </h1>
        <p className="text-gray-600">
          World-class AI assistant for A Curious Tractor business intelligence
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'chat', label: '💬 Chat', desc: 'Ask questions' },
          { id: 'monitoring', label: '🔍 Monitoring', desc: `${alerts.length} alerts` },
          { id: 'compliance', label: '📋 Compliance', desc: compliance ? `${compliance.overall}%` : 'Loading...' },
          { id: 'grants', label: '💰 Grants', desc: `${grants.length} opportunities` },
          { id: 'projects', label: '🎯 Projects', desc: `${projectHealth.length} analyzed` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div>{tab.label}</div>
            <div className="text-xs opacity-75">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="space-y-6">
          {/* Chat History */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {chatHistory.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="font-medium text-blue-900">You asked:</div>
                  <div className="text-blue-800">{item.query}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900">ACT Agent:</div>
                    <div className="text-xs text-gray-500">
                      {item.confidence * 100}% confidence • {item.sources.join(', ')}
                    </div>
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap">{item.response}</div>
                  {item.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {item.actions.map((action, i) => (
                          <li key={i} className="flex items-center">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Query Input */}
          <form onSubmit={handleQuery} className="space-y-4">
            <div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything about your business... 
Examples:
• What's my current cash flow?
• Are there any grants I should apply for?
• How are my projects performing?
• What compliance tasks are due?"
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Thinking...
                </>
              ) : (
                '🚀 Ask ACT Agent'
              )}
            </Button>
          </form>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'What\'s my BAS status?',
              'Show me grant opportunities',
              'Analyze project health',
              'Check compliance tasks'
            ].map((quickQuery) => (
              <Button
                key={quickQuery}
                variant="outline"
                size="sm"
                onClick={() => setQuery(quickQuery)}
                disabled={isLoading}
                className="text-left"
              >
                {quickQuery}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Proactive Monitoring</h2>
            <Button onClick={loadMonitoringData} size="sm">
              🔄 Refresh
            </Button>
          </div>

          {alerts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-green-600 text-4xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
              <p className="text-gray-600">No high-priority alerts at the moment.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`p-4 border-l-4 ${getAlertColor(alert.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-medium">{alert.title}</h3>
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-white bg-opacity-50">
                          Priority {alert.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm opacity-90">{alert.description}</p>
                      {alert.dueDate && (
                        <p className="mt-2 text-xs opacity-75">
                          Due: {new Date(alert.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {alert.action && (
                      <Button size="sm" variant="outline">
                        {alert.action}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Australian Business Compliance</h2>
            <Button onClick={loadComplianceData} size="sm">
              🔄 Refresh
            </Button>
          </div>

          {compliance ? (
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className="p-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {compliance.overall}%
                  </div>
                  <div className="text-lg text-gray-600">Compliance Score</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Next due: {new Date(compliance.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </Card>

              {/* Compliance Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="font-medium mb-3">📊 BAS (Business Activity Statement)</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium text-green-600">{compliance.details.bas.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Due:</span>
                      <span>{compliance.details.bas.nextDue}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-3">💰 R&D Tax Incentive</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Eligible:</span>
                      <span className="font-medium text-green-600">
                        {compliance.details.rdTaxIncentive.eligible ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Potential Benefit:</span>
                      <span className="font-medium">
                        {formatCurrency(compliance.details.rdTaxIncentive.potentialBenefit)}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-3">👥 PAYG</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium text-green-600">{compliance.details.payg.status}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-3">🏦 Superannuation</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium text-green-600">{compliance.details.superannuation.status}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Next Actions */}
              {compliance.nextActions.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-medium mb-3">📋 Recommended Actions</h3>
                  <ul className="space-y-2">
                    {compliance.nextActions.map((action, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
              <p>Loading compliance data...</p>
            </div>
          )}
        </div>
      )}

      {/* Grants Tab */}
      {activeTab === 'grants' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Grant Opportunities</h2>
            <Button onClick={loadGrantsData} size="sm">
              🔄 Refresh
            </Button>
          </div>

          {grants.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Grants Found</h3>
              <p className="text-gray-600">We'll keep monitoring for new opportunities.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {grants.map((grant) => (
                <Card key={grant.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-lg">{grant.name}</h3>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">{grant.amount}</div>
                      <div className="text-xs text-gray-500">
                        {grant.relevanceScore}% match
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{grant.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Deadline: {new Date(grant.deadline).toLocaleDateString()}
                    </span>
                    <Button size="sm">
                      Learn More
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Project Health Analysis</h2>
            <Button onClick={loadProjectHealthData} size="sm">
              🔄 Refresh
            </Button>
          </div>

          {projectHealth.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Analyzed</h3>
              <p className="text-gray-600">Project health analysis will appear here.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {projectHealth.map((project) => (
                <Card key={project.projectId} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-lg">{project.projectName}</h3>
                      <div className="text-sm text-gray-500">ID: {project.projectId}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getHealthColor(project.healthScore)}`}>
                        {project.healthScore}%
                      </div>
                      <div className="text-xs text-gray-500">Health Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {project.risks.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">⚠️ Risks</h4>
                        <ul className="text-sm space-y-1">
                          {project.risks.map((risk, index) => (
                            <li key={index} className="text-red-700">• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {project.opportunities.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-600 mb-2">🚀 Opportunities</h4>
                        <ul className="text-sm space-y-1">
                          {project.opportunities.map((opportunity, index) => (
                            <li key={index} className="text-green-700">• {opportunity}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {project.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-600 mb-2">💡 Recommendations</h4>
                        <ul className="text-sm space-y-1">
                          {project.recommendations.map((recommendation, index) => (
                            <li key={index} className="text-blue-700">• {recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
