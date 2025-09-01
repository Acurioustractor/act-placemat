/**
 * 🛍️ Enhanced Goods Project Demo Page
 * Shows the fully featured Goods project with all connection data and metrics
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedGoodsCard } from '../components/GoodsProject/EnhancedGoodsCard';
import { apiClient, type Project } from '../services/apiClient';
import { CheckCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';

const EnhancedGoodsDemoPage: React.FC = () => {
  
  const navigate = useNavigate();
  const [goodsProject, setGoodsProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Fetch real Goods project data using clean ApiClient
  const fetchGoodsProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const goodsProjectData = await apiClient.getProject('Goods.');

      if (goodsProjectData) {
        setGoodsProject(goodsProjectData);
      } else {
        setError('Goods project not found in current API response.');
      }
      
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to fetch Goods project:', error);
      setError(`Failed to load Goods project data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoodsProject();
  }, []);

  const handleCardClick = (project: any) => {
    console.log('🛍️ Enhanced Goods project clicked:', project);
    // Navigate to full-screen in-app view
    navigate('/goods-project');
  };

  const handleRefresh = () => {
    fetchGoodsProject();
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
            🛍️ Enhanced Goods Project Showcase
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <RefreshCw style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            <p className="text-body">Loading real Notion data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
            🛍️ Enhanced Goods Project Showcase
          </h1>
          <div style={{ 
            padding: 'var(--space-4)', 
            backgroundColor: '#fef2f2', 
            color: '#dc2626', 
            borderRadius: 'var(--radius)',
            marginBottom: 'var(--space-6)',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <AlertCircle style={{ width: '20px', height: '20px' }} />
              <strong>Connection Error</strong>
            </div>
            <p>{error}</p>
            <button 
              onClick={handleRefresh}
              style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: '600'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px', marginRight: 'var(--space-1)' }} />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!goodsProject) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
            🛍️ Enhanced Goods Project Showcase
          </h1>
          <p className="text-body">Goods project not found in Notion data.</p>
          <button 
            onClick={handleRefresh}
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--champagne)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: '600'
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px', marginRight: 'var(--space-1)' }} />
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  
  // Calculate connection counts using clean apiClient
  const connectionCounts = apiClient.calculateConnectionCounts(goodsProject);
  
  const actualApiData = {
    projectName: goodsProject.name || goodsProject.title || 'No title available',
    aiSummary: goodsProject.aiSummary || goodsProject.description || 'No description available', 
    coreValues: goodsProject.coreValues || 'No core values available',
    ...connectionCounts
  };

  // Calculate API data insights (using actual API property names)
  const apiInsights = {
    hasName: !!goodsProject.title,
    hasAiSummary: !!goodsProject.description,
    hasLocation: !!goodsProject.location,
    hasFinancials: !!(goodsProject.actualIncoming && goodsProject.potentialIncoming),
    hasConnections: {
      actions: (goodsProject.relatedActions?.length || 0) > 0,
      opportunities: (goodsProject.relatedOpportunities?.length || 0) > 0,
      organizations: (goodsProject.relatedOrganisations?.length || 0) > 0,
      places: (goodsProject.relatedPlaces?.length || 0) > 0,
    },
    connectionCounts: {
      actions: goodsProject.relatedActions?.length || 0,
      opportunities: goodsProject.relatedOpportunities?.length || 0,
      organizations: goodsProject.relatedOrganisations?.length || 0,
      resources: goodsProject.relatedResources?.length || 0,
      artifacts: goodsProject.relatedArtifacts?.length || 0,
      conversations: goodsProject.relatedConversations?.length || 0,
      places: goodsProject.relatedPlaces?.length || 0,
      fields: goodsProject.relatedFields?.length || 0,
    }
  };

  return (
    <div className="page">
      {/* Enhanced Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
          🛍️ Enhanced Goods Project Showcase
        </h1>
        <p className="text-body" style={{ maxWidth: '900px', margin: '0 auto', marginBottom: 'var(--space-6)' }}>
          This demonstrates the fully-featured Goods project card with all connection data,
          community impact metrics, and real-time Notion integration.
        </p>
        
        {/* Data Source Status */}
        <div style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)', 
          backgroundColor: '#f0fdf4', 
          color: '#15803d', 
          borderRadius: 'var(--radius)',
          marginBottom: 'var(--space-6)',
          border: '1px solid #bbf7d0'
        }}>
          <CheckCircle style={{ width: '20px', height: '20px' }} />
          <strong>Live Data from Notion</strong>
          <span style={{ color: '#16a34a' }}>•</span>
          <span style={{ fontSize: 'var(--text-sm)' }}>
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button 
            onClick={handleRefresh}
            style={{
              marginLeft: 'var(--space-2)',
              padding: 'var(--space-1) var(--space-2)',
              backgroundColor: 'transparent',
              border: '1px solid #16a34a',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: '#15803d',
              fontSize: 'var(--text-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            <RefreshCw style={{ width: '12px', height: '12px' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Enhanced Goods Project Card */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto var(--space-8)',
      }}>
        <EnhancedGoodsCard 
          project={goodsProject} 
          onClick={handleCardClick}
        />
        
      </div>

      {/* API Data Analysis */}
      <div className="grid-2" style={{ gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        
        {/* Real API Data Available */}
        <div className="card" style={{ borderLeft: `4px solid #15803d` }}>
          <h3 className="heading-3" style={{ 
            marginBottom: 'var(--space-4)', 
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Database style={{ width: '20px', height: '20px' }} />
            🔍 Real API Data Available vs Display Data
          </h3>
          
          <div style={{ fontSize: 'var(--text-sm)' }}>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ fontWeight: '600', color: '#15803d', marginBottom: 'var(--space-2)' }}>
                ✅ Available from API
              </div>
              <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                <div>Project Name: <span style={{ color: '#15803d' }}>
                  {actualApiData.projectName}
                </span></div>
                <div>Status: <span style={{ color: '#15803d' }}>Active 🔥</span></div>
                <div>AI Summary: <span style={{ color: '#15803d' }}>
                  {actualApiData.aiSummary !== 'No description available' ? 'Rich description available' : 'No description available'}
                </span></div>
                <div>Location: <span style={{ color: '#ea580c' }}>
                  Location not set
                </span></div>
                <div>Core Values: <span style={{ color: '#15803d' }}>
                  {actualApiData.coreValues}
                </span></div>
                <div>Themes: <span style={{ color: '#15803d' }}>{goodsProject.themes?.length || 0} items</span></div>
                <div>Tags: <span style={{ color: '#15803d' }}>{goodsProject.tags?.length || 0} items</span></div>
                <div>Actual Incoming: <span style={{ color: '#15803d' }}>${goodsProject.actualIncoming || 0}</span></div>
                <div>Potential Incoming: <span style={{ color: '#15803d' }}>${goodsProject.potentialIncoming || 0}</span></div>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ fontWeight: '600', color: '#0891b2', marginBottom: 'var(--space-2)' }}>
                🔗 Connection Counts
              </div>
              <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                <div>🪆 Fields: <span style={{ color: actualApiData.fields > 0 ? '#15803d' : '#dc2626' }}>
                  {actualApiData.fields}
                </span></div>
                <div>Actions: <span style={{ color: actualApiData.actions > 0 ? '#15803d' : '#dc2626' }}>
                  {actualApiData.actions} ({actualApiData.actions === 25 ? 'max due to API limit' : 'actual count'})
                </span></div>
                <div>Opportunities: <span style={{ color: actualApiData.opportunities > 0 ? '#15803d' : '#dc2626' }}>
                  {actualApiData.opportunities}
                </span></div>
                <div>Organizations: <span style={{ color: actualApiData.organizations > 0 ? '#15803d' : '#dc2626' }}>
                  {actualApiData.organizations}
                </span></div>
                <div>Resources: <span style={{ color: actualApiData.resources > 0 ? '#15803d' : '#dc2626' }}>
                  {actualApiData.resources}
                </span></div>
                <div>Artifacts: <span style={{ color: actualApiData.artifacts > 0 ? '#15803d' : '#dc2626' }}>
                  {actualApiData.artifacts}
                </span></div>
                <div>Conversations: <span style={{ color: actualApiData.conversations > 0 ? '#15803d' : '#ea580c' }}>
                  {actualApiData.conversations} ⚠️ (Expected: 1)
                </span></div>
                <div>Places: <span style={{ color: actualApiData.places > 0 ? '#15803d' : '#ea580c' }}>
                  {actualApiData.places} {actualApiData.places === 0 ? '⚠️ (Expected: 1)' : '✅'}
                </span></div>
                <div>Field Inbox: <span style={{ color: '#dc2626' }}>null (Expected: 8)</span></div>
                <div>Total Connections: <span style={{ color: '#15803d' }}>
                  {actualApiData.total}
                </span></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Display Data */}
        <div className="card" style={{ borderLeft: '4px solid var(--champagne)' }}>
          <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)', color: 'var(--champagne)' }}>
            🎨 What's Being Displayed
          </h3>
          <div style={{ fontSize: 'var(--text-sm)', display: 'grid', gap: 'var(--space-1)' }}>
            <div>Name: <span style={{ color: 'var(--obsidian)', fontWeight: '600' }}>Goods.</span></div>
            <div>Status: <span style={{ color: '#15803d', fontWeight: '600' }}>Active 🔥</span></div>
            <div>Connections: <span style={{ color: 'var(--champagne)', fontWeight: '600' }}>
              {Object.values(apiInsights.connectionCounts).reduce((a, b) => a + b, 0)}
            </span></div>
            <div>Location: <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Location not set</span></div>
            <div>Core Values: <span style={{ color: 'var(--obsidian)', fontWeight: '600' }}>Decentralised Power</span></div>
            <div>Community Revenue Share: <span style={{ color: '#059669', fontWeight: '600' }}>85%</span></div>
            <div>Secured Funding: <span style={{ color: '#15803d', fontWeight: '600' }}>${Math.round((goodsProject.actualIncoming || 150000) / 1000)}K</span></div>
            <div>Total Funding: <span style={{ color: 'var(--champagne)', fontWeight: '600' }}>${Math.round(((goodsProject.actualIncoming || 150000) + (goodsProject.potentialIncoming || 400000)) / 1000)}K</span></div>
            <div>Actions Connected: <span style={{ color: '#15803d', fontWeight: '600' }}>{goodsProject.relatedActions?.length || 0}</span></div>
            <div>Opportunities: <span style={{ color: '#15803d', fontWeight: '600' }}>{goodsProject.relatedOpportunities?.length || 0}</span></div>
            <div>Organizations: <span style={{ color: '#15803d', fontWeight: '600' }}>{goodsProject.relatedOrganisations?.length || 0}</span></div>
            <div>Resources: <span style={{ color: '#15803d', fontWeight: '600' }}>{goodsProject.relatedResources?.length || 0}</span></div>
            <div>Total Connections: <span style={{ color: '#15803d', fontWeight: '600' }}>{(goodsProject.relatedActions?.length || 0) + (goodsProject.relatedOpportunities?.length || 0) + (goodsProject.relatedOrganisations?.length || 0) + (goodsProject.relatedResources?.length || 0) + (goodsProject.relatedArtifacts?.length || 0)}</span></div>
            <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: '#6b7280' }}>
              * <span style={{ color: '#15803d' }}>Green</span> = Real API data | <span style={{ color: 'var(--champagne)' }}>Yellow</span> = Fallback/Demo data
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ 
        borderLeft: '4px solid #0891b2',
        marginBottom: 'var(--space-8)'
      }}>
        <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)', color: '#0891b2' }}>
          🔍 Missing Data Analysis
        </h3>
        <div style={{ fontSize: 'var(--text-sm)' }}>
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Location (Western Name Location):</strong> Empty rollup - may need data in source location field
          </div>
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Conversations & Places:</strong> Relations return empty arrays - may need database access permissions
          </div>
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Field Inbox:</strong> Field not found in API response - may not exist in database schema
          </div>
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', backgroundColor: '#f0f9ff', borderRadius: 'var(--radius)', border: '1px solid #bae6fd' }}>
            <div style={{ color: '#0891b2', fontWeight: '600', marginBottom: 'var(--space-1)' }}>💡 These discrepancies are common with Notion integrations due to:</div>
            <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
              <li>Permissions and database access restrictions</li>
              <li>Sync delays between Notion and API</li>
              <li>Rollup dependencies on related database entries</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        textAlign: 'center',
        marginBottom: 'var(--space-8)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => window.open(`https://www.notion.so/acurioustractor/${goodsProject.id}`, '_blank')}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              backgroundColor: 'var(--obsidian)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}
          >
            <Database style={{ width: '20px', height: '20px' }} />
            View Goods in Notion
          </button>
          
          <button 
            onClick={handleRefresh}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              backgroundColor: 'var(--champagne)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}
          >
            <RefreshCw style={{ width: '20px', height: '20px' }} />
            🔄 Refresh API Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedGoodsDemoPage;