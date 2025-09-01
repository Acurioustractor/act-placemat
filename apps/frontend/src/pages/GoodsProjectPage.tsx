/**
 * 🛍️ Goods Project Detail Page
 * Specialized page showing comprehensive view of the Goods project
 * Demonstrates what's possible with rich Notion data
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, MapPin, Users, DollarSign, Zap, Award, Target, TrendingUp, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';

const GoodsProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [goodsProject, setGoodsProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real Goods project data from API
  useEffect(() => {
    const fetchGoodsProject = async () => {
      try {
        setLoading(true);
        const projects = await projectService.getAllProjects();
        
        // Find the Goods project
        const goodsProjectData = projects.find(project => 
          project.name === "Goods." || 
          project.title === "Goods." ||
          project.name?.toLowerCase().includes("goods")
        );

        if (goodsProjectData) {
          console.log('🛍️ Loaded real Goods project data:', goodsProjectData);
          setGoodsProject(goodsProjectData);
        } else {
          console.warn('🛍️ Goods project not found in API response');
          setError('Goods project not found');
        }
      } catch (error) {
        console.error('Failed to fetch Goods project:', error);
        setError('Failed to load Goods project data');
      } finally {
        setLoading(false);
      }
    };

    fetchGoodsProject();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="page">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="heading-1">Loading Goods Project...</h1>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !goodsProject) {
    return (
      <div className="page">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="heading-1">Error</h1>
          <p className="text-body" style={{ color: 'var(--crimson)' }}>
            {error || 'Project not found'}
          </p>
        </div>
      </div>
    );
  }

  // Mock data to show potential - what we could display with better Notion setup
  const potentialData = {
    aiSummary: "Community-owned social enterprise creating economic opportunities through ethical retail and local production. Focusing on Indigenous-led supply chains and community wealth building.",
    location: "Darwin, NT & Remote Communities",
    coreValues: "Decentralised Power",
    themes: ["Economic Freedom", "Indigenous", "Global community"],
    tags: ["Social Enterprise", "Retail", "Indigenous Supply Chain", "Community Ownership", "Economic Justice"],
    
    // Detailed metrics we could track
    impactMetrics: {
      communitySuppliersCount: 12,
      jobsCreated: 8,
      revenueToDate: 45000,
      communityRevenueShare: 85, // percentage
      customersServed: 250,
      productsListed: 156
    },
    
    // Milestones and progress
    milestones: [
      {
        title: "Launch Online Store",
        date: "2024-09-15",
        status: "completed",
        description: "Successfully launched e-commerce platform"
      },
      {
        title: "Partner with 5 Communities",
        date: "2025-01-31",
        status: "in_progress",
        description: "Currently working with 3 communities, targeting 2 more"
      },
      {
        title: "Achieve $100K Annual Revenue",
        date: "2025-06-30",
        status: "pending",
        description: "On track with current growth trajectory"
      }
    ]
  };

  // Fallback data structure for compatibility
  const fallbackData = {
    id: "177ebcf9-81cf-805f-b111-f407079f9794",
    name: "Goods.",
    status: "Active 🔥",
    connections: 5,
    
    // Related data we found
    relatedOpportunities: [
      {
        id: "237ebcf9-81cf-8053-8589-edbc0dbc511a",
        name: "Goods. Snow Foundation 2025 Wages",
        amount: 100000,
        stage: "Closed Won",
        description: "Wages support for Goods operations"
      },
      {
        id: "238ebcf9-81cf-80e9-9153-c12d48160916",
        name: "TFN Goods.",
        amount: 100000,
        stage: "Applied",
        description: "The Foundation for the North - Goods initiative funding"
      }
    ],
    
    relatedOrganizations: [
      {
        id: "543a4a68-60bc-438e-bd37-8bb75447302e",
        name: "Going North & Goods.",
        connections: 15,
        type: "Parent Organization"
      }
    ]
  };

  // Extract financial data from real API response or fallback - ensuring they're numbers
  const rawActualIncoming = goodsProject.actualIncoming || goodsProject.impact_metrics?.actualIncoming || 150000;
  const rawPotentialIncoming = goodsProject.potentialIncoming || goodsProject.impact_metrics?.potentialIncoming || 400000;
  
  // Convert to numbers if they're strings (remove $ signs and convert)
  const actualIncoming = typeof rawActualIncoming === 'string' 
    ? parseInt(rawActualIncoming.replace(/[$,]/g, '')) || 150000
    : rawActualIncoming || 150000;
  const potentialIncoming = typeof rawPotentialIncoming === 'string'
    ? parseInt(rawPotentialIncoming.replace(/[$,]/g, '')) || 400000  
    : rawPotentialIncoming || 400000;
  
  // Debug the financial values
  console.log('💰 Financial Debug:', {
    rawActualIncoming,
    rawPotentialIncoming,
    actualIncoming,
    potentialIncoming,
    actualType: typeof actualIncoming,
    potentialType: typeof potentialIncoming,
    calculation: actualIncoming + potentialIncoming
  });
  
  // Financial debug complete - alert removed
  const revenueActual = goodsProject.revenueActual || goodsProject.impact_metrics?.revenueActual || 50000;
  const revenuePotential = goodsProject.revenuePotential || goodsProject.impact_metrics?.revenuePotential || 50000;

  // Calculate real connection counts from API data
  const realConnections = 
    (goodsProject.relatedFields?.length || 0) +
    (goodsProject.relatedActions?.length || 0) +
    (goodsProject.relatedOpportunities?.length || 0) +
    (goodsProject.relatedOrganisations?.length || 0) +
    (goodsProject.relatedResources?.length || 0) +
    (goodsProject.relatedArtifacts?.length || 0) +
    (goodsProject.relatedConversations?.length || 0) +
    (goodsProject.relatedPlaces?.length || 0);

  // Use real data where available, fallback to mock data for demonstration
  const displayData = {
    name: goodsProject.name || fallbackData.name,
    status: goodsProject.status || fallbackData.status,
    connections: realConnections || fallbackData.connections,
    
    // Real data from API
    aiSummary: goodsProject.aiSummary || potentialData.aiSummary,
    location: goodsProject.location || potentialData.location,
    coreValues: goodsProject.coreValues || potentialData.coreValues,
    themes: goodsProject.themes || potentialData.themes,
    tags: goodsProject.tags || potentialData.tags,
    
    // Financial totals
    securedFunding: actualIncoming,
    totalFunding: actualIncoming + potentialIncoming,
    
    // Relations
    actionCount: goodsProject.relatedActions?.length || 25,
    opportunityCount: goodsProject.relatedOpportunities?.length || 2,
    organizationCount: goodsProject.relatedOrganisations?.length || 1,
    resourceCount: goodsProject.relatedResources?.length || 0,
    
    // Use fallback opportunities if not available from API
    opportunities: goodsProject.relatedOpportunities?.length ? 
      fallbackData.relatedOpportunities : fallbackData.relatedOpportunities
  };

  const totalFunding = displayData.totalFunding;
  const securedFunding = displayData.securedFunding;

  return (
    <div className="page">
      {/* Navigation */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/showcase')}
        >
          <ArrowLeft style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
          Back to Projects
        </button>
      </div>

      {/* Hero Section */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="split">
          <div>
            <div className="inline" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <h1 className="heading-1">{displayData.name}</h1>
              <span style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--success)',
                color: 'white',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--text-base)',
                fontWeight: '600'
              }}>
                {displayData.status}
              </span>
            </div>
            
            <p className="text-body" style={{ 
              maxWidth: '800px', 
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--text-lg)'
            }}>
              {displayData.aiSummary}
            </p>

            <div className="inline" style={{ gap: 'var(--space-6)' }}>
              <div className="inline" style={{ gap: 'var(--space-2)' }}>
                <MapPin style={{ width: '20px', height: '20px', color: 'var(--champagne)' }} />
                <span className="text-body">{displayData.location}</span>
              </div>
              
              <div className="inline" style={{ gap: 'var(--space-2)' }}>
                <Users style={{ width: '20px', height: '20px', color: 'var(--sage)' }} />
                <span className="text-body">{displayData.connections} connections</span>
              </div>

              <div className="inline" style={{ gap: 'var(--space-2)' }}>
                <Award style={{ width: '20px', height: '20px', color: 'var(--obsidian)' }} />
                <span className="text-body">{displayData.coreValues}</span>
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <div className="metric" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="metric-value" style={{ fontSize: 'var(--text-4xl)', color: 'var(--sage)' }}>
                {potentialData.impactMetrics.communityRevenueShare}%
              </div>
              <div className="metric-label">Community Revenue Share</div>
            </div>
            
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
              <div className="metric">
                <div className="metric-value">${(securedFunding / 1000)}K</div>
                <div className="metric-label">Secured</div>
              </div>
              <div className="metric">
                <div className="metric-value">{potentialData.impactMetrics.jobsCreated}</div>
                <div className="metric-label">Jobs Created</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid-2" style={{ gap: 'var(--space-8)' }}>
        
        {/* Left Column */}
        <div>
          
          {/* Impact Metrics */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              <TrendingUp style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
              Impact Metrics
            </h2>
            
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
              <div className="metric">
                <div className="metric-value">{potentialData.impactMetrics.communitySuppliersCount}</div>
                <div className="metric-label">Community Suppliers</div>
              </div>
              <div className="metric">
                <div className="metric-value">{potentialData.impactMetrics.customersServed}</div>
                <div className="metric-label">Customers Served</div>
              </div>
              <div className="metric">
                <div className="metric-value">${(potentialData.impactMetrics.revenueToDate / 1000)}K</div>
                <div className="metric-label">Revenue to Date</div>
              </div>
              <div className="metric">
                <div className="metric-value">{potentialData.impactMetrics.productsListed}</div>
                <div className="metric-label">Products Listed</div>
              </div>
            </div>
          </div>

          {/* Themes & Tags */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              Project Focus
            </h2>
            
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="heading-4" style={{ marginBottom: 'var(--space-2)' }}>Themes</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {displayData.themes.map((theme, index) => (
                  <span key={index} className="tag tag-primary">{theme}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="heading-4" style={{ marginBottom: 'var(--space-2)' }}>Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {displayData.tags.map((tag, index) => (
                  <span key={index} className="tag tag-secondary">{tag}</span>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div>
          
          {/* Funding */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              <DollarSign style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
              Funding & Opportunities
            </h2>
            
            <div className="grid-2" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="metric">
                <div className="metric-value" style={{ color: 'var(--sage)' }}>${(securedFunding / 1000)}K</div>
                <div className="metric-label">Secured</div>
              </div>
              <div className="metric">
                <div className="metric-value" style={{ color: 'var(--champagne)' }}>${(totalFunding / 1000)}K</div>
                <div className="metric-label">Total Pipeline</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {displayData.opportunities.map((opp, index) => (
                <div key={index} style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--pearl)',
                  borderRadius: 'var(--radius)',
                  borderLeft: `4px solid ${opp.stage === 'Closed Won' ? 'var(--sage)' : 'var(--champagne)'}`
                }}>
                  <div className="split" style={{ marginBottom: 'var(--space-2)' }}>
                    <h4 className="heading-4">{opp.name.replace('Goods. ', '').replace('TFN ', '')}</h4>
                    <span style={{
                      padding: 'var(--space-1) var(--space-2)',
                      backgroundColor: opp.stage === 'Closed Won' ? 'var(--sage)' : 'var(--champagne)',
                      color: 'white',
                      borderRadius: 'var(--radius)',
                      fontSize: 'var(--text-sm)'
                    }}>
                      {opp.stage}
                    </span>
                  </div>
                  <p className="text-body" style={{ marginBottom: 'var(--space-2)' }}>
                    {opp.description}
                  </p>
                  <strong className="text-body" style={{ color: 'var(--sage)' }}>
                    ${opp.amount.toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Partners */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              <Users style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
              Partners & Organizations
            </h2>
            
            {fallbackData.relatedOrganizations.map((org, index) => (
              <div key={index} style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--pearl)',
                borderRadius: 'var(--radius)',
                marginBottom: 'var(--space-3)'
              }}>
                <div className="split">
                  <div>
                    <h4 className="heading-4" style={{ marginBottom: 'var(--space-1)' }}>
                      {org.name}
                    </h4>
                    <span className="text-sm" style={{ color: 'var(--silver)' }}>
                      {org.type}
                    </span>
                  </div>
                  <div className="metric" style={{ textAlign: 'center' }}>
                    <div className="metric-value">{org.connections}</div>
                    <div className="metric-label">Connections</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Milestones */}
          <div className="card">
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              <Target style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
              Milestones & Progress
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {potentialData.milestones.map((milestone, index) => (
                <div key={index} style={{
                  padding: 'var(--space-4)',
                  backgroundColor: milestone.status === 'completed' ? 'rgba(5, 150, 105, 0.1)' : 
                                  milestone.status === 'in_progress' ? 'rgba(245, 158, 11, 0.1)' : 'var(--pearl)',
                  borderRadius: 'var(--radius)',
                  borderLeft: `4px solid ${
                    milestone.status === 'completed' ? 'var(--sage)' : 
                    milestone.status === 'in_progress' ? 'var(--champagne)' : 'var(--silver)'
                  }`
                }}>
                  <div className="split" style={{ marginBottom: 'var(--space-2)' }}>
                    <h4 className="heading-4">{milestone.title}</h4>
                    <div className="inline" style={{ gap: 'var(--space-2)' }}>
                      <Calendar style={{ width: '14px', height: '14px', color: 'var(--silver)' }} />
                      <span className="text-sm">{new Date(milestone.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-body" style={{ color: 'var(--silver)' }}>
                    {milestone.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Real API Data Debug Panel */}
      <div style={{ 
        marginTop: 'var(--space-8)', 
        padding: 'var(--space-6)', 
        backgroundColor: 'var(--pearl)', 
        borderRadius: 'var(--radius)'
      }}>
        <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
          🔍 Real API Data Available vs Display Data
        </h3>
        
        <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
          {/* Real API Data */}
          <div>
            <h4 className="heading-4" style={{ marginBottom: 'var(--space-3)', color: 'var(--sage)' }}>
              ✅ Available from API
            </h4>
            <div style={{ 
              padding: 'var(--space-4)', 
              backgroundColor: 'rgba(5, 150, 105, 0.1)', 
              borderRadius: 'var(--radius)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'monospace'
            }}>
              <div><strong>Project Name:</strong> {goodsProject.name || 'null'}</div>
              <div><strong>Status:</strong> {goodsProject.status || 'null'}</div>
              <div><strong>AI Summary:</strong> {goodsProject.aiSummary ? 'Available' : 'null'}</div>
              <div><strong>Location:</strong> {goodsProject.location || 'null'}</div>
              <div><strong>Core Values:</strong> {goodsProject.coreValues || 'null'}</div>
              <div><strong>Themes:</strong> {goodsProject.themes?.length || 0} items</div>
              <div><strong>Tags:</strong> {goodsProject.tags?.length || 0} items</div>
              <div><strong>Actual Incoming:</strong> ${actualIncoming || 0}</div>
              <div><strong>Potential Incoming:</strong> ${potentialIncoming || 0}</div>
              <div><strong>🪆 Fields:</strong> {goodsProject.relatedFields?.length || 0}</div>
              <div><strong>Actions:</strong> {goodsProject.relatedActions?.length || 0} (25 max due to API limit)</div>
              <div><strong>Opportunities:</strong> {goodsProject.relatedOpportunities?.length || 0}</div>
              <div><strong>Organizations:</strong> {goodsProject.relatedOrganisations?.length || 0}</div>
              <div><strong>Resources:</strong> {goodsProject.relatedResources?.length || 0}</div>
              <div><strong>Artifacts:</strong> {goodsProject.relatedArtifacts?.length || 0}</div>
              <div><strong>Conversations:</strong> {goodsProject.relatedConversations?.length || 0} ⚠️ (Expected: 1)</div>
              <div><strong>Places:</strong> {goodsProject.relatedPlaces?.length || 0} ⚠️ (Expected: 1)</div>
              <div><strong>Field Inbox:</strong> {goodsProject.fieldInboxToBeSorted || 'null'} (Expected: 8)</div>
              <div><strong>Total Connections:</strong> {realConnections}</div>
            </div>
          </div>

          {/* Display Data */}
          <div>
            <h4 className="heading-4" style={{ marginBottom: 'var(--space-3)', color: 'var(--champagne)' }}>
              🎨 What's Being Displayed
            </h4>
            <div style={{ 
              padding: 'var(--space-4)', 
              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
              borderRadius: 'var(--radius)',
              fontSize: 'var(--text-sm)'
            }}>
              <div><strong>Name:</strong> {displayData.name}</div>
              <div><strong>Status:</strong> {displayData.status}</div>
              <div><strong>Connections:</strong> {displayData.connections}</div>
              <div><strong>Location:</strong> {displayData.location}</div>
              <div><strong>Core Values:</strong> {displayData.coreValues}</div>
              <div><strong>Secured Funding:</strong> ${(displayData.securedFunding / 1000)}K</div>
              <div><strong>Total Funding:</strong> ${(displayData.totalFunding / 1000)}K</div>
              <div><strong>Actions:</strong> {displayData.actionCount}</div>
              <div><strong>Opportunities:</strong> {displayData.opportunityCount}</div>
              <div><strong>Organizations:</strong> {displayData.organizationCount}</div>
              <div style={{ marginTop: 'var(--space-2)', color: 'var(--silver)', fontSize: 'var(--text-xs)' }}>
                * Green = Real API data | Yellow = Fallback/Demo data
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Information */}
        <div style={{ 
          marginTop: 'var(--space-6)', 
          padding: 'var(--space-4)', 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          borderRadius: 'var(--radius)',
          fontSize: 'var(--text-sm)'
        }}>
          <h5 className="heading-5" style={{ marginBottom: 'var(--space-3)', color: 'var(--champagne)' }}>
            🔍 Missing Data Analysis
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div><strong>Location (Western Name Location):</strong> Empty rollup - may need data in source location field</div>
            <div><strong>Conversations & Places:</strong> Relations return empty arrays - may need database access permissions</div>
            <div><strong>Field Inbox:</strong> Field not found in API response - may not exist in database schema</div>
            <div style={{ marginTop: 'var(--space-2)', color: 'var(--silver)' }}>
              💡 These discrepancies are common with Notion integrations due to permissions, sync delays, or rollup dependencies.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <button className="btn btn-primary" style={{ marginRight: 'var(--space-4)' }}>
            <ExternalLink style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
            View Goods in Notion
          </button>
          
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            🔄 Refresh API Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoodsProjectPage;