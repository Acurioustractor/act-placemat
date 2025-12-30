/**
 * World-Class CRM System for A Curious Tractor
 * 
 * Comprehensive contact relationship management with AI-powered insights
 * Designed for community-centric organizations
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface Contact {
  id: string;
  fullName: string;
  first_name: string;
  last_name: string;
  company?: string;
  position?: string;
  industry?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  connection_degree?: number;
  intelligence?: {
    collaborationScore: number;
    responseRate: number;
    influenceScore: number;
    lastInteraction?: string;
    interactionCount: number;
    projectMatches: number;
  };
}

interface ContactEnrichment {
  contact: Contact;
  enrichment: {
    emailSuggestions: string[];
    collaborationPotential: number;
    reasoning: string;
    projectAlignment: string[];
    outreachStrategy: {
      approach: string;
      topics: string[];
      timing: string;
    };
    riskFactors: string[];
    valueProposition: string;
  };
  enrichedAt: string;
  mode: string;
}

interface ProjectMatch {
  contact: Contact;
  matchScore: {
    score: number;
    reasoning: string;
    suggestedRole: string;
  };
}

interface OutreachStrategy {
  contactId: string;
  contactName: string;
  recommendedApproach: string;
  bestTopics: string[];
  timing: string;
  mutualConnections: any[];
  valueProposition: string;
  emailTemplate: string;
  followUpSequence: string[];
  successProbability: number;
}

export default function WorldClassCRM() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'projects' | 'outreach' | 'analytics'>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactEnrichment, setContactEnrichment] = useState<ContactEnrichment | null>(null);
  const [projectMatches, setProjectMatches] = useState<ProjectMatch[]>([]);
  const [outreachStrategy, setOutreachStrategy] = useState<OutreachStrategy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industry: '',
    hasEmail: null as boolean | null,
    company: ''
  });

  // Load contacts on component mount
  useEffect(() => {
    loadContacts();
  }, [searchQuery, filters]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.company) params.append('company', filters.company);
      if (filters.hasEmail !== null) params.append('hasEmail', filters.hasEmail.toString());
      params.append('limit', '50');

      const response = await fetch(`/api/v3/crm/contacts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContactDetails = async (contactId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v3/crm/contacts/${contactId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedContact(data.contact);
      }
    } catch (error) {
      console.error('Failed to load contact details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enrichContact = async (contactId: string, mode: 'ai' | 'basic' = 'ai') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v3/crm/contacts/${contactId}/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setContactEnrichment(data.enrichment);
      }
    } catch (error) {
      console.error('Failed to enrich contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectMatches = async (projectId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v3/crm/projects/${projectId}/matches`);
      const data = await response.json();
      
      if (data.success) {
        setProjectMatches(data.matches);
      }
    } catch (error) {
      console.error('Failed to load project matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOutreachStrategy = async (contactId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v3/crm/contacts/${contactId}/outreach`);
      const data = await response.json();
      
      if (data.success) {
        setOutreachStrategy(data.strategy);
      }
    } catch (error) {
      console.error('Failed to generate outreach strategy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏢 World-Class CRM System
        </h1>
        <p className="text-gray-600">
          AI-powered contact relationship management for A Curious Tractor
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'contacts', label: '👥 Contacts', desc: `${contacts.length} contacts` },
          { id: 'projects', label: '🎯 Project Matching', desc: 'AI alignment' },
          { id: 'outreach', label: '📧 Outreach', desc: 'Smart strategies' },
          { id: 'analytics', label: '📊 Analytics', desc: 'Network insights' }
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

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Industries</option>
                  <option value="Government">Government</option>
                  <option value="Non-profit">Non-profit</option>
                  <option value="Education">Education</option>
                  <option value="Construction">Construction</option>
                  <option value="Technology">Technology</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Company..."
                  value={filters.company}
                  onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <select
                  value={filters.hasEmail === null ? '' : filters.hasEmail.toString()}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    hasEmail: e.target.value === '' ? null : e.target.value === 'true' 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Contacts</option>
                  <option value="true">Has Email</option>
                  <option value="false">No Email</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Contacts List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8">
                <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
                <p>Loading contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Contacts Found</h3>
                <p className="text-gray-600">Try adjusting your search or filters.</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <Card key={contact.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => loadContactDetails(contact.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{contact.fullName}</h3>
                      <p className="text-sm text-gray-600">{contact.position}</p>
                      <p className="text-sm text-gray-500">{contact.company}</p>
                    </div>
                    {contact.intelligence && (
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBg(contact.intelligence.collaborationScore)}`}>
                        <span className={getScoreColor(contact.intelligence.collaborationScore)}>
                          {contact.intelligence.collaborationScore}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      {contact.industry || 'Unknown Industry'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      {contact.email ? '📧 Has Email' : '❌ No Email'}
                    </div>
                    {contact.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                        📍 {contact.location}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        enrichContact(contact.id, 'ai');
                      }}
                    >
                      🤖 AI Enrich
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateOutreachStrategy(contact.id);
                      }}
                    >
                      📧 Outreach
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Contact Details Modal */}
          {selectedContact && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedContact.fullName}</h2>
                      <p className="text-gray-600">{selectedContact.position} at {selectedContact.company}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedContact(null)}
                    >
                      ✕ Close
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <Card className="p-4">
                      <h3 className="font-medium mb-3">📋 Contact Information</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Industry:</strong> {selectedContact.industry || 'Unknown'}</div>
                        <div><strong>Location:</strong> {selectedContact.location || 'Unknown'}</div>
                        <div><strong>Email:</strong> {selectedContact.email || 'Not available'}</div>
                        <div><strong>Phone:</strong> {selectedContact.phone || 'Not available'}</div>
                        <div><strong>LinkedIn:</strong> 
                          {selectedContact.linkedin_url ? (
                            <a href={selectedContact.linkedin_url} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-600 hover:underline ml-1">
                              View Profile
                            </a>
                          ) : 'Not available'}
                        </div>
                      </div>
                    </Card>

                    {/* Intelligence Scores */}
                    {selectedContact.intelligence && (
                      <Card className="p-4">
                        <h3 className="font-medium mb-3">🧠 Intelligence Scores</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Collaboration Score:</span>
                            <span className={`font-medium ${getScoreColor(selectedContact.intelligence.collaborationScore)}`}>
                              {selectedContact.intelligence.collaborationScore}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Response Rate:</span>
                            <span className={`font-medium ${getScoreColor(selectedContact.intelligence.responseRate)}`}>
                              {selectedContact.intelligence.responseRate}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Influence Score:</span>
                            <span className={`font-medium ${getScoreColor(selectedContact.intelligence.influenceScore)}`}>
                              {selectedContact.intelligence.influenceScore}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Interactions:</span>
                            <span className="font-medium">{selectedContact.intelligence.interactionCount}</span>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  <div className="mt-6 flex space-x-4">
                    <Button onClick={() => enrichContact(selectedContact.id, 'ai')}>
                      🤖 AI Enrich Contact
                    </Button>
                    <Button variant="outline" onClick={() => generateOutreachStrategy(selectedContact.id)}>
                      📧 Generate Outreach Strategy
                    </Button>
                    <Button variant="outline">
                      🎯 Find Project Matches
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Enrichment Results */}
          {contactEnrichment && (
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold">🤖 AI Contact Enrichment</h3>
                <Button variant="outline" onClick={() => setContactEnrichment(null)}>
                  ✕ Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">📧 Email Suggestions</h4>
                  <ul className="space-y-1 text-sm">
                    {contactEnrichment.enrichment.emailSuggestions.map((email, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                        {email}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3">🎯 Project Alignment</h4>
                  <div className="space-y-2">
                    {contactEnrichment.enrichment.projectAlignment.map((project, index) => (
                      <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2">
                        {project}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="font-medium mb-3">💡 AI Analysis</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-3">
                      <strong>Collaboration Potential:</strong>
                      <span className={`ml-2 font-medium ${getScoreColor(contactEnrichment.enrichment.collaborationPotential)}`}>
                        {contactEnrichment.enrichment.collaborationPotential}%
                      </span>
                    </div>
                    <div className="mb-3">
                      <strong>Reasoning:</strong>
                      <p className="mt-1 text-gray-700">{contactEnrichment.enrichment.reasoning}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Value Proposition:</strong>
                      <p className="mt-1 text-gray-700">{contactEnrichment.enrichment.valueProposition}</p>
                    </div>
                    <div>
                      <strong>Outreach Strategy:</strong>
                      <div className="mt-1 text-sm">
                        <div><strong>Approach:</strong> {contactEnrichment.enrichment.outreachStrategy.approach}</div>
                        <div><strong>Topics:</strong> {contactEnrichment.enrichment.outreachStrategy.topics.join(', ')}</div>
                        <div><strong>Timing:</strong> {contactEnrichment.enrichment.outreachStrategy.timing}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Project Matching Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-medium mb-3">🎯 Project Contact Matching</h3>
            <p className="text-gray-600 mb-4">
              Find the best contacts for your projects using AI-powered matching.
            </p>
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="Enter project ID..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button onClick={() => loadProjectMatches('example-project-id')}>
                🔍 Find Matches
              </Button>
            </div>
          </Card>

          {projectMatches.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📊 Project Matches</h3>
              {projectMatches.map((match, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{match.contact.fullName}</h4>
                      <p className="text-sm text-gray-600">{match.contact.position} at {match.contact.company}</p>
                      <p className="text-sm text-gray-500 mt-1">{match.matchScore.reasoning}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(match.matchScore.score)}`}>
                        {match.matchScore.score}%
                      </div>
                      <div className="text-xs text-gray-500">Match Score</div>
                      <div className="text-sm font-medium text-blue-600 mt-1">
                        {match.matchScore.suggestedRole}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outreach Tab */}
      {activeTab === 'outreach' && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-medium mb-3">📧 Smart Outreach Strategies</h3>
            <p className="text-gray-600">
              Generate personalized outreach strategies powered by AI analysis.
            </p>
          </Card>

          {outreachStrategy && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">📧 Outreach Strategy for {outreachStrategy.contactName}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">🎯 Strategy Overview</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Approach:</strong> {outreachStrategy.recommendedApproach}</div>
                    <div><strong>Timing:</strong> {outreachStrategy.timing}</div>
                    <div><strong>Success Probability:</strong> 
                      <span className={`ml-1 font-medium ${getScoreColor(outreachStrategy.successProbability)}`}>
                        {outreachStrategy.successProbability}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">💡 Best Topics</h4>
                  <div className="space-y-1">
                    {outreachStrategy.bestTopics.map((topic, index) => (
                      <span key={index} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs mr-2">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="font-medium mb-3">📝 Email Template</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{outreachStrategy.emailTemplate}</pre>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="font-medium mb-3">📅 Follow-up Sequence</h4>
                  <ul className="space-y-2">
                    {outreachStrategy.followUpSequence.map((step, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{contacts.length}</div>
              <div className="text-gray-600">Total Contacts</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {contacts.filter(c => c.email).length}
              </div>
              <div className="text-gray-600">With Email</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {Math.round((contacts.filter(c => c.email).length / contacts.length) * 100)}%
              </div>
              <div className="text-gray-600">Email Coverage</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📊 Network Analytics</h3>
            <p className="text-gray-600">
              Advanced network analytics and relationship mapping coming soon...
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
