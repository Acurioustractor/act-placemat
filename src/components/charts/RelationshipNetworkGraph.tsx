import { ResponsiveNetwork } from '@nivo/network';
import { COMMUNITY_COLORS, DATA_COLORS } from '../../constants/designSystem';
import { Project, Organization, Person } from '../../types';

interface RelationshipNetworkGraphProps {
  projects: Project[];
  organizations: Organization[];
  people: Person[];
  className?: string;
  height?: number;
}

interface NetworkNode {
  id: string;
  height: number;
  size: number;
  color: string;
}

interface NetworkLink {
  source: string;
  target: string;
  distance: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

/**
 * Relationship Network Graph
 * Shows interconnections between projects, organizations, and people
 * Visualizes the strength and density of community relationships
 */
const RelationshipNetworkGraph = ({ 
  projects, 
  organizations, 
  people, 
  className = '', 
  height = 500 
}: RelationshipNetworkGraphProps) => {
  
  // Create network data
  const createNetworkData = (): NetworkData => {
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];
    
    // Add project nodes
    projects.slice(0, 20).forEach(project => { // Limit for performance
      const connections = project.partnerOrganizations.length + 
                         project.people.length + 
                         (project.relatedProjects?.length || 0);
      
      nodes.push({
        id: `project-${project.id}`,
        height: 1,
        size: Math.max(20, Math.min(50, connections * 8 + 20)),
        color: COMMUNITY_COLORS.primary[600]
      });
    });

    // Add organization nodes
    organizations.slice(0, 15).forEach(org => { // Limit for performance
      const projectConnections = projects.filter(p => 
        p.partnerOrganizations.some(po => po.id === org.id)
      ).length;
      
      nodes.push({
        id: `org-${org.id}`,
        height: 1,
        size: Math.max(15, Math.min(40, projectConnections * 6 + 15)),
        color: COMMUNITY_COLORS.secondary[600]
      });
    });

    // Add key people nodes
    people.slice(0, 15).forEach(person => { // Limit for performance
      const projectConnections = projects.filter(p => 
        p.people.some(pp => pp.id === person.id)
      ).length;
      
      nodes.push({
        id: `person-${person.id}`,
        height: 1,
        size: Math.max(10, Math.min(30, projectConnections * 4 + 10)),
        color: COMMUNITY_COLORS.success[600]
      });
    });

    // Create links based on relationships
    projects.slice(0, 20).forEach(project => {
      const projectNodeId = `project-${project.id}`;
      
      // Link projects to organizations
      project.partnerOrganizations.forEach(org => {
        const orgNodeId = `org-${org.id}`;
        if (nodes.some(n => n.id === orgNodeId)) {
          links.push({
            source: projectNodeId,
            target: orgNodeId,
            distance: 50
          });
        }
      });

      // Link projects to people
      project.people.forEach(person => {
        const personNodeId = `person-${person.id}`;
        if (nodes.some(n => n.id === personNodeId)) {
          links.push({
            source: projectNodeId,
            target: personNodeId,
            distance: 40
          });
        }
      });
    });

    // Add organization-to-people links
    organizations.slice(0, 15).forEach(org => {
      const orgNodeId = `org-${org.id}`;
      
      org.people?.slice(0, 5).forEach(person => { // Limit connections
        const personNodeId = `person-${person.id}`;
        if (nodes.some(n => n.id === personNodeId)) {
          links.push({
            source: orgNodeId,
            target: personNodeId,
            distance: 30
          });
        }
      });
    });

    return { nodes, links };
  };

  const networkData = createNetworkData();

  // Calculate network metrics
  const totalNodes = networkData.nodes.length;
  const totalLinks = networkData.links.length;
  const networkDensity = totalNodes > 1 ? (totalLinks / (totalNodes * (totalNodes - 1) / 2)) * 100 : 0;
  
  const avgConnections = totalNodes > 0 ? (totalLinks * 2) / totalNodes : 0;
  const mostConnectedNode = networkData.nodes.reduce((max, node) => 
    node.size > max.size ? node : max, networkData.nodes[0] || { size: 0 }
  );

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Community Relationship Network
        </h3>
        <p className="text-sm text-gray-600">
          Interactive visualization of connections between projects, organizations, and people in the ACT ecosystem
        </p>
      </div>

      {/* Network Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <div className="text-2xl font-bold text-teal-700">
            {totalNodes}
          </div>
          <div className="text-sm text-teal-600">Network Entities</div>
        </div>
        
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">
            {totalLinks}
          </div>
          <div className="text-sm text-amber-600">Active Connections</div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">
            {networkDensity.toFixed(1)}%
          </div>
          <div className="text-sm text-blue-600">Network Density</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-700">
            {avgConnections.toFixed(1)}
          </div>
          <div className="text-sm text-green-600">Avg Connections</div>
        </div>
      </div>

      {/* Network Visualization */}
      {networkData.nodes.length > 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4" style={{ height }}>
          <ResponsiveNetwork
            data={networkData}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            linkDistance={function(e) { return e.distance }}
            centeringStrength={0.3}
            repulsivity={6}
            nodeSize={function(n) { return n.size }}
            activeNodeSize={function(n) { return 1.5 * n.size }}
            nodeColor={function(n) { return n.color }}
            nodeBorderWidth={1}
            nodeBorderColor={{
              from: 'color',
              modifiers: [['darker', 0.8]]
            }}
            linkThickness={function(n) { return 2 + 2 * n.target.data.height }}
            linkColor={{ from: 'target.color', modifiers: [['opacity', 0.4]] }}
            annotations={[
              {
                type: 'circle',
                match: { id: mostConnectedNode?.id },
                noteX: 40,
                noteY: 40,
                offset: 4,
                note: 'Most Connected',
                noteTextOffset: 5
              }
            ]}
            theme={{
              background: 'transparent',
              textColor: COMMUNITY_COLORS.neutral[700],
              tooltip: {
                container: {
                  background: COMMUNITY_COLORS.neutral[900],
                  color: COMMUNITY_COLORS.neutral[50],
                  fontSize: '12px',
                  borderRadius: '6px',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }
              }
            }}
          />
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8" style={{ height }}>
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">Network Visualization Loading</div>
              <div className="text-sm">Analyzing relationship data to build interactive network graph</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COMMUNITY_COLORS.primary[600] }}></div>
          <span className="text-sm text-gray-600">Projects</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COMMUNITY_COLORS.secondary[600] }}></div>
          <span className="text-sm text-gray-600">Organizations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COMMUNITY_COLORS.success[600] }}></div>
          <span className="text-sm text-gray-600">People</span>
        </div>
      </div>

      {/* Network Analysis */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-3">Network Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-purple-800">Network Health:</span>
            <span className="ml-2 text-purple-700">
              {networkDensity > 20 ? 'Highly Connected' : networkDensity > 10 ? 'Well Connected' : networkDensity > 5 ? 'Moderately Connected' : 'Developing'}
            </span>
          </div>
          <div>
            <span className="font-medium text-purple-800">Collaboration Strength:</span>
            <span className="ml-2 text-purple-700">
              {avgConnections > 4 ? 'Strong' : avgConnections > 2 ? 'Moderate' : 'Growing'} cross-entity collaboration
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipNetworkGraph;