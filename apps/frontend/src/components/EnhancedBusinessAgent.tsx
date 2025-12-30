/**
 * Enhanced Business Agent - World-Class UI/UX
 * 
 * Modern, beautiful interface inspired by the best BI platforms
 * Features: Glassmorphism, micro-interactions, intelligent layouts
 */

import React, { useState, useEffect, useRef } from 'react';
import { ModernCard } from './ui/ModernCard';
import { MetricCard } from './ui/MetricCard';
import { SearchInput } from './ui/SearchInput';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { apiClient } from '../utils/api';

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

interface Alert {
  id: string;
  type: 'financial' | 'project' | 'opportunity' | 'compliance';
  priority: number;
  title: string;
  description: string;
  action?: string;
  dueDate?: string;
}

export default function EnhancedBusinessAgent() {
  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'compliance' | 'grants' | 'projects'>('dashboard');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<BusinessAgentQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [grants, setGrants] = useState<any[]>([]);
  const [projectHealth, setProjectHealth] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadDashboardData = async () => {
    try {
      console.log('🔄 Loading dashboard data...');
      
      const [alertsResult, complianceResult, grantsResult, projectsResult] = await Promise.all([
        apiClient.getMonitoring(),
        apiClient.getCompliance(),
        apiClient.getGrants(),
        apiClient.getProjectHealth()
      ]);

      if (alertsResult.success && alertsResult.data) {
        setAlerts(alertsResult.data.alerts || []);
        console.log('✅ Alerts loaded:', alertsResult.data.alerts?.length || 0);
      }

      if (complianceResult.success && complianceResult.data) {
        setCompliance(complianceResult.data.compliance);
        console.log('✅ Compliance loaded:', complianceResult.data.compliance?.overall);
      }

      if (grantsResult.success && grantsResult.data) {
        setGrants(grantsResult.data.grants || []);
        console.log('✅ Grants loaded:', grantsResult.data.grants?.length || 0);
      }

      if (projectsResult.success && projectsResult.data) {
        setProjectHealth(projectsResult.data.analysis || []);
        console.log('✅ Project health loaded:', projectsResult.data.analysis?.length || 0);
      }
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
    }
  };

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      console.log('🤖 Sending query to AI Agent:', queryText);
      const result = await apiClient.queryAgent(queryText);
      
      if (result.success && result.data) {
        setChatHistory(prev => [...prev, result.data]);
        setQuery('');
        console.log('✅ Query successful');
      } else {
        console.error('❌ Query failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Query exception:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQueries = [
    { text: "What's my BAS status?", icon: "📊", category: "compliance" },
    { text: "Show me grant opportunities", icon: "💰", category: "grants" },
    { text: "Which projects need attention?", icon: "🎯", category: "projects" },
    { text: "What's my cash flow?", icon: "💸", category: "financial" },
    { text: "Find collaboration opportunities", icon: "🤝", category: "relationships" },
    { text: "Check compliance tasks", icon: "📋", category: "compliance" }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clay-50 via-white to-brand-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-clay-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-ocean-500 rounded-2xl flex items-center justify-center text-white text-2xl">
                🤖
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-ocean-600 bg-clip-text text-transparent">
                  ACT Business Agent v3
                </h1>
                <p className="text-clay-600">World-class AI business intelligence</p>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-clay-600">Online</span>
              </div>
              <div className="text-sm text-clay-500">
                {compliance && `${compliance.overall}% Compliant`}
              </div>
            </div>
          </div>

          {/* Navigation Pills */}
          <div className="flex space-x-2 mt-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'chat', label: 'AI Chat', icon: '💬' },
              { id: 'compliance', label: 'Compliance', icon: '📋' },
              { id: 'grants', label: 'Grants', icon: '💰' },
              { id: 'projects', label: 'Projects', icon: '🎯' }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  activeView === view.id
                    ? 'bg-brand-600 text-white shadow-soft'
                    : 'bg-clay-100 text-clay-700 hover:bg-clay-200'
                }`}
              >
                <span>{view.icon}</span>
                <span>{view.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Compliance Score"
                value={compliance?.overall || 0}
                subtitle="Australian Business"
                change={{ value: '+5%', type: 'positive', period: 'vs last month' }}
                icon={<span className="text-2xl">📋</span>}
                status={compliance?.overall && compliance.overall >= 90 ? 'healthy' : 'warning'}
                trend={[85, 87, 90, 92, 95]}
              />
              
              <MetricCard
                title="Grant Opportunities"
                value={grants.length}
                subtitle="Active Opportunities"
                change={{ value: '+2', type: 'positive', period: 'this week' }}
                icon={<span className="text-2xl">💰</span>}
                status="healthy"
                trend={[3, 4, 3, 5, 5]}
              />
              
              <MetricCard
                title="Project Health"
                value="87%"
                subtitle="Average Score"
                change={{ value: '+3%', type: 'positive', period: 'improving' }}
                icon={<span className="text-2xl">🎯</span>}
                status="healthy"
                trend={[82, 84, 85, 86, 87]}
              />
              
              <MetricCard
                title="Network Contacts"
                value="20.4K"
                subtitle="LinkedIn Network"
                change={{ value: '+156', type: 'positive', period: 'this month' }}
                icon={<span className="text-2xl">🤝</span>}
                status="healthy"
                trend={[19800, 19950, 20100, 20250, 20398]}
              />
            </div>

            {/* Quick Actions */}
            <ModernCard header="Quick Actions" variant="glass" size="lg">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {quickQueries.map((quickQuery, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveView('chat');
                      setQuery(quickQuery.text);
                      handleQuery(quickQuery.text);
                    }}
                    className="group p-4 bg-gradient-to-br from-white to-clay-50 border border-clay-200 rounded-2xl hover:shadow-medium hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">
                      {quickQuery.icon}
                    </div>
                    <div className="text-sm font-medium text-clay-700 group-hover:text-brand-600 transition-colors">
                      {quickQuery.text}
                    </div>
                  </button>
                ))}
              </div>
            </ModernCard>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Alerts */}
              <ModernCard header="Recent Alerts" icon="🔔" variant="elevated">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">✅</div>
                    <p className="text-clay-600">All systems running smoothly</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="p-3 bg-clay-50 rounded-xl border-l-4 border-brand-500">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-clay-900">{alert.title}</h4>
                            <p className="text-sm text-clay-600 mt-1">{alert.description}</p>
                          </div>
                          <div className="text-xs text-clay-500">
                            Priority {alert.priority}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ModernCard>

              {/* Compliance Overview */}
              <ModernCard header="Compliance Overview" icon="📊" variant="elevated">
                {compliance ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {compliance.overall}%
                      </div>
                      <p className="text-clay-600">Overall Compliance</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                        <span className="font-medium">BAS Status</span>
                        <span className="text-green-600">✅ Current</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                        <span className="font-medium">R&D Tax Incentive</span>
                        <span className="text-blue-600">{formatCurrency(compliance.details.rdTaxIncentive.potentialBenefit)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
                    <p className="text-clay-600">Loading compliance data...</p>
                  </div>
                )}
              </ModernCard>
            </div>
          </div>
        )}

        {/* Chat View */}
        {activeView === 'chat' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Chat Header */}
            <ModernCard variant="glass" size="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-ocean-500 rounded-xl flex items-center justify-center text-white">
                    🤖
                  </div>
                  <div>
                    <h2 className="font-semibold text-clay-900">AI Business Assistant</h2>
                    <p className="text-sm text-clay-600">Ask me anything about your business</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-clay-600">Online</span>
                </div>
              </div>
            </ModernCard>

            {/* Chat History */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {chatHistory.length === 0 && (
                <ModernCard variant="glass" size="lg">
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-semibold text-clay-900 mb-2">
                      Welcome to your AI Business Agent
                    </h3>
                    <p className="text-clay-600 mb-6">
                      I have access to all your business data and can help with:
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Financial analysis & BAS tracking</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Grant discovery & applications</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Project health monitoring</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Contact intelligence & CRM</span>
                      </div>
                    </div>
                  </div>
                </ModernCard>
              )}

              {chatHistory.map((item, index) => (
                <div key={index} className="space-y-3">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="max-w-2xl bg-gradient-to-r from-brand-600 to-ocean-600 text-white p-4 rounded-2xl rounded-br-md shadow-soft">
                      <p className="font-medium">{item.query}</p>
                    </div>
                  </div>

                  {/* Agent Response */}
                  <div className="flex justify-start">
                    <div className="max-w-3xl">
                      <ModernCard variant="glass" size="md">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-ocean-500 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0">
                            🤖
                          </div>
                          <div className="flex-1">
                            <div className="prose prose-sm max-w-none">
                              <p className="text-clay-800 leading-relaxed whitespace-pre-wrap">
                                {item.response}
                              </p>
                            </div>
                            
                            {/* Metadata */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-clay-100">
                              <div className="flex items-center space-x-4 text-xs text-clay-500">
                                <span>Confidence: {Math.round(item.confidence * 100)}%</span>
                                <span>Sources: {item.sources.join(', ')}</span>
                              </div>
                              <div className="text-xs text-clay-400">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </div>
                            </div>

                            {/* Suggested Actions */}
                            {item.actions.length > 0 && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                                <h4 className="text-sm font-medium text-blue-900 mb-2">Suggested Actions:</h4>
                                <div className="space-y-1">
                                  {item.actions.map((action, i) => (
                                    <div key={i} className="flex items-center space-x-2 text-sm text-blue-800">
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                      <span>{action}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </ModernCard>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <ModernCard variant="elevated" size="md">
              <SearchInput
                placeholder="Ask me anything about your business... e.g., 'What's my current cash flow?' or 'Find grant opportunities'"
                value={query}
                onChange={setQuery}
                onSearch={(q) => handleQuery(q)}
                loading={isLoading}
                suggestions={quickQueries.map(q => q.text)}
              />
            </ModernCard>

            {/* Quick Query Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickQueries.map((quickQuery, index) => (
                <button
                  key={index}
                  onClick={() => handleQuery(quickQuery.text)}
                  disabled={isLoading}
                  className="group p-4 bg-white border border-clay-200 rounded-2xl hover:shadow-medium hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                    {quickQuery.icon}
                  </div>
                  <div className="text-xs font-medium text-clay-700 group-hover:text-brand-600 transition-colors">
                    {quickQuery.text}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compliance View */}
        {activeView === 'compliance' && compliance && (
          <div className="space-y-8">
            {/* Compliance Score Hero */}
            <ModernCard variant="gradient" size="xl">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 mx-auto mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - compliance.overall / 100)}`}
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-clay-900">{compliance.overall}%</div>
                        <div className="text-sm text-clay-600">Compliant</div>
                      </div>
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-clay-900 mb-2">Australian Business Compliance</h2>
                <p className="text-clay-600">Next deadline: {new Date(compliance.dueDate).toLocaleDateString()}</p>
              </div>
            </ModernCard>

            {/* Compliance Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModernCard header="📊 BAS (Business Activity Statement)" variant="elevated">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-clay-700">Status:</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {compliance.details.bas.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-clay-700">Next Due:</span>
                    <span className="font-medium text-clay-900">{compliance.details.bas.nextDue}</span>
                  </div>
                </div>
              </ModernCard>

              <ModernCard header="💰 R&D Tax Incentive" variant="elevated">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-clay-700">Eligible:</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {compliance.details.rdTaxIncentive.eligible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-clay-700">Potential Benefit:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatCurrency(compliance.details.rdTaxIncentive.potentialBenefit)}
                    </span>
                  </div>
                </div>
              </ModernCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
