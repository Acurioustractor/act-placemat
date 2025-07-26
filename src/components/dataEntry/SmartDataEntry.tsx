import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  LightBulbIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { useProjects, useOpportunities, useOrganizations, usePeople } from '../../hooks';

interface DataDiscrepancy {
  type: 'missing_link' | 'incomplete_data' | 'duplicate' | 'outdated';
  entity: string;
  entityId: string;
  field: string;
  message: string;
  suggestion?: string;
  relatedEntities?: Array<{id: string; name: string; type: string}>;
}

interface SmartSuggestion {
  type: 'link' | 'update' | 'create';
  message: string;
  action: () => void;
}

/**
 * Smart data entry component that finds discrepancies and suggests improvements
 * Analyzes relationships between entities and suggests missing links
 */
const SmartDataEntry = () => {
  const { data: projects = [] } = useProjects();
  const { data: opportunities = [] } = useOpportunities();
  const { data: organizations = [] } = useOrganizations();
  const { data: people = [] } = usePeople();

  const [discrepancies, setDiscrepancies] = useState<DataDiscrepancy[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<DataDiscrepancy | null>(null);

  // Analyze data for discrepancies
  const analyzeData = () => {
    setIsAnalyzing(true);
    const found: DataDiscrepancy[] = [];

    // Check for people without organizations
    people.forEach(person => {
      if (!person.organization) {
        found.push({
          type: 'incomplete_data',
          entity: 'Person',
          entityId: person.id,
          field: 'organization',
          message: `${person.fullName} has no organization listed`,
          suggestion: 'Link to an existing organization or create a new one'
        });
      }

      // Check for people in opportunities but not linked
      opportunities.forEach(opp => {
        if (opp.primaryContact === person.fullName || opp.decisionMakers.includes(person.fullName)) {
          if (!person.relatedOpportunities.includes(opp.id)) {
            found.push({
              type: 'missing_link',
              entity: 'Person',
              entityId: person.id,
              field: 'relatedOpportunities',
              message: `${person.fullName} is mentioned in "${opp.name}" but not linked`,
              relatedEntities: [{id: opp.id, name: opp.name, type: 'Opportunity'}]
            });
          }
        }
      });
    });

    // Check for organizations without any people
    organizations.forEach(org => {
      const orgPeople = people.filter(p => p.organization === org.name);
      if (orgPeople.length === 0 && org.keyContacts.length === 0) {
        found.push({
          type: 'incomplete_data',
          entity: 'Organization',
          entityId: org.id,
          field: 'keyContacts',
          message: `${org.name} has no contacts listed`,
          suggestion: 'Add key contacts to maintain relationships'
        });
      }
    });

    // Check for projects without opportunities
    projects.forEach(project => {
      if (project.relatedOpportunities.length === 0 && project.revenuePotential > 0) {
        found.push({
          type: 'missing_link',
          entity: 'Project',
          entityId: project.id,
          field: 'relatedOpportunities',
          message: `${project.name} has revenue potential but no linked opportunities`,
          suggestion: 'Create opportunities to track funding sources'
        });
      }

      // Check for projects with outdated milestones
      if (project.nextMilestone && new Date(project.nextMilestone) < new Date()) {
        found.push({
          type: 'outdated',
          entity: 'Project',
          entityId: project.id,
          field: 'nextMilestone',
          message: `${project.name} has a past milestone date`,
          suggestion: 'Update the milestone or mark project status'
        });
      }
    });

    // Check for opportunities without organizations
    opportunities.forEach(opp => {
      if (!opp.organization) {
        found.push({
          type: 'incomplete_data',
          entity: 'Opportunity',
          entityId: opp.id,
          field: 'organization',
          message: `${opp.name} has no organization listed`,
          suggestion: 'Link to the funding organization'
        });
      }
    });

    setDiscrepancies(found);
    generateSuggestions(found);
    setIsAnalyzing(false);
  };

  // Generate smart suggestions based on discrepancies
  const generateSuggestions = (discrepancies: DataDiscrepancy[]) => {
    const smartSuggestions: SmartSuggestion[] = [];

    // Group by type for bulk actions
    const missingLinks = discrepancies.filter(d => d.type === 'missing_link');
    if (missingLinks.length > 3) {
      smartSuggestions.push({
        type: 'link',
        message: `Found ${missingLinks.length} missing relationships. Auto-link all?`,
        action: () => console.log('Auto-linking relationships...')
      });
    }

    // Suggest creating contacts for orgs without people
    const orgsWithoutPeople = discrepancies.filter(
      d => d.entity === 'Organization' && d.field === 'keyContacts'
    );
    if (orgsWithoutPeople.length > 0) {
      smartSuggestions.push({
        type: 'create',
        message: `${orgsWithoutPeople.length} organizations need contacts. Import from emails?`,
        action: () => console.log('Importing contacts from emails...')
      });
    }

    setSuggestions(smartSuggestions);
  };

  // Email search function
  const searchEmails = (query: string) => {
    // This would search through artifacts of type email
    console.log('Searching emails for:', query);
    // Return mock results for now
    return [
      { email: 'john@example.com', name: 'John Doe', organization: 'Example Corp' },
      { email: 'jane@test.com', name: 'Jane Smith', organization: 'Test Inc' }
    ];
  };

  // Auto-fix a discrepancy
  const autoFix = (discrepancy: DataDiscrepancy) => {
    console.log('Auto-fixing:', discrepancy);
    // Implement fix logic based on type
    switch (discrepancy.type) {
      case 'missing_link':
        // Create the missing link
        break;
      case 'incomplete_data':
        // Open form to complete data
        break;
      case 'outdated':
        // Update the outdated field
        break;
    }
  };

  useEffect(() => {
    // Auto-analyze on component mount
    analyzeData();
  }, [projects, opportunities, organizations, people]);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Data Entry</h2>
          <p className="text-gray-600 mt-1">
            Find missing links, incomplete data, and get smart suggestions
          </p>
        </div>
        <button
          onClick={analyzeData}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          Re-analyze
        </button>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-blue-900 font-medium">
            <LightBulbIcon className="h-5 w-5" />
            Smart Suggestions
          </div>
          {suggestions.map((suggestion, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white rounded p-3">
              <span className="text-sm text-gray-700">{suggestion.message}</span>
              <button
                onClick={suggestion.action}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Email Search Bar */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Emails for Missing People
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or organization..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              onChange={(e) => {
                if (e.target.value.length > 2) {
                  const results = searchEmails(e.target.value);
                  console.log('Email search results:', results);
                }
              }}
            />
          </div>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            Import from Gmail
          </button>
        </div>
      </div>

      {/* Discrepancies List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Data Issues ({discrepancies.length})
        </h3>
        
        {discrepancies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>All data looks good! No issues found.</p>
          </div>
        )}

        <div className="grid gap-3">
          {discrepancies.map((disc, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedDiscrepancy(disc)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon 
                    className={`h-5 w-5 mt-0.5 ${
                      disc.type === 'outdated' ? 'text-amber-500' : 'text-red-500'
                    }`} 
                  />
                  <div>
                    <p className="font-medium text-gray-900">{disc.message}</p>
                    {disc.suggestion && (
                      <p className="text-sm text-gray-600 mt-1">{disc.suggestion}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="capitalize">{disc.entity}</span>
                      <span>•</span>
                      <span>{disc.field}</span>
                      {disc.relatedEntities && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            {disc.relatedEntities.length} related
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    autoFix(disc);
                  }}
                  className="text-sm font-medium text-primary-600 hover:text-primary-800"
                >
                  Fix
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="text-left p-3 bg-white rounded border border-gray-200 hover:border-primary-500">
            <div className="text-sm font-medium text-gray-900">Bulk Import</div>
            <div className="text-xs text-gray-500">From CSV/Excel</div>
          </button>
          <button className="text-left p-3 bg-white rounded border border-gray-200 hover:border-primary-500">
            <div className="text-sm font-medium text-gray-900">Email Sync</div>
            <div className="text-xs text-gray-500">Find new contacts</div>
          </button>
          <button className="text-left p-3 bg-white rounded border border-gray-200 hover:border-primary-500">
            <div className="text-sm font-medium text-gray-900">Merge Duplicates</div>
            <div className="text-xs text-gray-500">Clean up data</div>
          </button>
          <button className="text-left p-3 bg-white rounded border border-gray-200 hover:border-primary-500">
            <div className="text-sm font-medium text-gray-900">Export Report</div>
            <div className="text-xs text-gray-500">Data quality</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartDataEntry;