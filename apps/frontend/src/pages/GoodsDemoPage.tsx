/**
 * 🛍️ Goods Project Demo Page
 * Shows the specialized Goods project card and allows navigation to detailed view
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoodsProjectCard } from '../components/GoodsProject/GoodsProjectCard';
import { projectService } from '../services/projectService';

const GoodsDemoPage: React.FC = () => {
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
        
        // Find the Goods project - it should have name "Goods."
        const goodsProjectData = projects.find(project => 
          project.name === "Goods." || 
          project.title === "Goods." ||
          project.name?.toLowerCase().includes("goods")
        );

        if (goodsProjectData) {
          setGoodsProject(goodsProjectData);
          console.log('🛍️ Found Goods project with real data:', goodsProjectData);
        } else {
          console.warn('🛍️ Goods project not found in API response');
          // Use fallback data to show what it would look like
          setGoodsProject({
            id: "goods-fallback",
            name: "Goods.",
            title: "Goods.",
            status: "Active 🔥",
            aiSummary: "Community-led initiative delivering essential goods through local production, addressing cost-of-living gaps. Aims to manufacture 300 beds and 40 washing machines, supporting over 800 people, while promoting self-determination and sustainability among First Nations communities.",
            description: "Community-led initiative delivering essential goods through local production",
            location: "Remote Communities, NT",
            coreValues: "Decentralised Power", 
            projectLead: { name: "Nicholas Marchesi" },
            nextMilestoneDate: "2025-09-02",
            impact_metrics: {
              actualIncoming: 150000,
              potentialIncoming: 400000, 
              revenueActual: 50000,
              revenuePotential: 50000,
              partnerCount: 5,
              projectLead: "Nicholas Marchesi",
              nextMilestone: "September 2, 2025"
            },
            themes: ["Health and wellbeing", "Indigenous"],
            tags: ["Health", "Product"],
            related_actions: Array(182).fill(0).map((_, i) => ({ id: `action-${i}` })),
            related_opportunities: Array(5).fill(0).map((_, i) => ({ id: `opp-${i}` })),
            related_organisations: Array(2).fill(0).map((_, i) => ({ id: `org-${i}` })),
            related_resources: Array(2).fill(0).map((_, i) => ({ id: `res-${i}` })),
            related_artifacts: Array(1).fill(0).map((_, i) => ({ id: `art-${i}` }))
          });
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

  const handleCardClick = (project: any) => {
    console.log('🛍️ Goods project clicked:', project);
    navigate('/goods-project');
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
            🛍️ Goods Project Demo
          </h1>
          <p className="text-body">Loading real Notion data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
            🛍️ Goods Project Demo
          </h1>
          <p className="text-body" style={{ color: 'var(--crimson)' }}>
            Error: {error}
          </p>
        </div>
      </div>
    );
  }

  if (!goodsProject) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
            🛍️ Goods Project Demo
          </h1>
          <p className="text-body">Goods project not found in Notion data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        <h1 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>
          🛍️ Goods Project Demo
        </h1>
        <p className="text-body" style={{ maxWidth: '800px', margin: '0 auto', marginBottom: 'var(--space-6)' }}>
          This demonstrates a specialized project card for the Goods social enterprise,
          showing real data fetched directly from your Notion database.
        </p>
        
        <div style={{ 
          padding: 'var(--space-4)', 
          backgroundColor: goodsProject.id === 'goods-fallback' ? 'var(--crimson)' : 'var(--sage)', 
          color: 'white', 
          borderRadius: 'var(--radius)',
          marginBottom: 'var(--space-6)'
        }}>
          <strong>{goodsProject.id === 'goods-fallback' ? 'Fallback Data:' : 'Real Data from Notion:'}</strong> 
          {goodsProject.id === 'goods-fallback' 
            ? ' Using example data - check API connection' 
            : ' Live data from your Projects database!'
          }
        </div>
      </div>

      {/* Demo Card */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto var(--space-8)',
        padding: 'var(--space-4)',
        border: `2px dashed var(--${goodsProject.id === 'goods-fallback' ? 'crimson' : 'champagne'})`,
        borderRadius: 'var(--radius)'
      }}>
        <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
          Goods Project Card
        </h2>
        <GoodsProjectCard 
          project={goodsProject} 
          onClick={handleCardClick}
        />
      </div>

      {/* Explanation */}
      <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
        
        {/* What's Real */}
        <div className="card" style={{ borderLeft: `4px solid var(--${goodsProject.id === 'goods-fallback' ? 'crimson' : 'sage'})` }}>
          <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)', color: goodsProject.id === 'goods-fallback' ? 'var(--crimson)' : 'var(--sage)' }}>
            {goodsProject.id === 'goods-fallback' ? '⚠️ Fallback Data Used' : '✅ What\'s Real (from Notion)'}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: goodsProject.id === 'goods-fallback' ? 'var(--crimson)' : 'var(--sage)' }}>
                {goodsProject.id === 'goods-fallback' ? '!' : '✓'}
              </span>
              <strong>Project Name:</strong> {goodsProject.name || goodsProject.title || 'Unknown'}
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: goodsProject.id === 'goods-fallback' ? 'var(--crimson)' : 'var(--sage)' }}>
                {goodsProject.id === 'goods-fallback' ? '!' : '✓'}
              </span>
              <strong>Status:</strong> {goodsProject.status || 'Unknown'}
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: goodsProject.id === 'goods-fallback' ? 'var(--crimson)' : 'var(--sage)' }}>
                {goodsProject.id === 'goods-fallback' ? '!' : '✓'}
              </span>
              <strong>AI Summary:</strong> {goodsProject.aiSummary ? 'Rich description available' : 'Not available'}
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: goodsProject.id === 'goods-fallback' ? 'var(--crimson)' : 'var(--sage)' }}>
                {goodsProject.id === 'goods-fallback' ? '!' : '✓'}
              </span>
              <strong>Financial Data:</strong> $
              {goodsProject.impact_metrics?.actualIncoming ? (goodsProject.impact_metrics.actualIncoming / 1000) : 0}K actual, $
              {goodsProject.impact_metrics?.potentialIncoming ? (goodsProject.impact_metrics.potentialIncoming / 1000) : 0}K potential
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: goodsProject.id === 'goods-fallback' ? 'var(--crimson)' : 'var(--sage)' }}>
                {goodsProject.id === 'goods-fallback' ? '!' : '✓'}
              </span>
              <strong>Core Values:</strong> {goodsProject.coreValues || goodsProject.core_values || 'Not set'}
            </li>
          </ul>
        </div>

        {/* What Could Be Added */}
        <div className="card" style={{ borderLeft: '4px solid var(--champagne)' }}>
          <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)', color: 'var(--champagne)' }}>
            🚀 What Could Be Added
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--champagne)' }}>+</span>
              <strong>AI Summary:</strong> Project description
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--champagne)' }}>+</span>
              <strong>Location:</strong> "Darwin, NT" or operating region
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--champagne)' }}>+</span>
              <strong>Core Values:</strong> e.g., "Decentralised Power"
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--champagne)' }}>+</span>
              <strong>Tags:</strong> "Social Enterprise", "Retail", etc.
            </li>
            <li className="text-body" style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-6)', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--champagne)' }}>+</span>
              <strong>Community Control %:</strong> Ownership metrics
            </li>
          </ul>
        </div>
      </div>

      {/* Next Steps */}
      <div style={{ 
        marginTop: 'var(--space-8)', 
        padding: 'var(--space-6)', 
        backgroundColor: 'var(--pearl)', 
        borderRadius: 'var(--radius)',
        textAlign: 'center'
      }}>
        <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
          Next Steps: Notion Database Enhancement
        </h3>
        <p className="text-body" style={{ marginBottom: 'var(--space-4)', color: 'var(--silver)' }}>
          To get the full rich display, consider adding these fields to your Notion Projects database:
        </p>
        
        <div className="grid-3" style={{ gap: 'var(--space-4)' }}>
          <div>
            <h4 className="heading-4" style={{ marginBottom: 'var(--space-2)' }}>Essential</h4>
            <ul className="text-body" style={{ textAlign: 'left' }}>
              <li>AI Summary (Rich Text)</li>
              <li>Location (Text/Select)</li>
              <li>Community Control % (Number)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="heading-4" style={{ marginBottom: 'var(--space-2)' }}>Impact Tracking</h4>
            <ul className="text-body" style={{ textAlign: 'left' }}>
              <li>Jobs Created (Number)</li>
              <li>Revenue Generated (Number)</li>
              <li>Communities Served (Number)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="heading-4" style={{ marginBottom: 'var(--space-2)' }}>Relations</h4>
            <ul className="text-body" style={{ textAlign: 'left' }}>
              <li>Better Org connections</li>
              <li>Impact stories links</li>
              <li>Media assets</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoodsDemoPage;