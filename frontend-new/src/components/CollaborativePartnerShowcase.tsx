import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { notionPartnerService, Partner } from '../services/notionService';

// Partner interface imported from notionService

interface CollaborativePartnerShowcaseProps {
  projectFilter?: string; // Optional filter for project-specific partners
}

export default function CollaborativePartnerShowcase({ projectFilter }: CollaborativePartnerShowcaseProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Partners will be loaded from Notion service (with fallback to defaults)

  useEffect(() => {
    const loadPartners = async () => {
      try {
        // Load partners from Notion (with automatic fallback to defaults)
        const partnersData = await notionPartnerService.getPartners();
        setPartners(partnersData);
      } catch (error) {
        console.error('Error loading partners:', error);
        // Fallback handled by service
        const fallbackPartners = await notionPartnerService.getPartners();
        setPartners(fallbackPartners);
      } finally {
        setLoading(false);
      }
    };

    loadPartners();
  }, []);

  // Apply project filter first if specified
  const projectFilteredPartners = projectFilter 
    ? partners.filter(partner => 
        partner.collaboration_focus.some(focus => 
          focus.toLowerCase().includes(projectFilter.toLowerCase())
        ) ||
        partner.name.toLowerCase().includes(projectFilter.toLowerCase())
      )
    : partners;

  const partnerTypes = [
    { key: 'all', label: 'All Partners', icon: '🌟', count: projectFilteredPartners.length },
    { key: 'community', label: 'Community', icon: '👥', count: projectFilteredPartners.filter(p => p.type === 'community').length },
    { key: 'funder', label: 'Funders', icon: '🤝', count: projectFilteredPartners.filter(p => p.type === 'funder').length },
    { key: 'talent', label: 'Talent', icon: '✨', count: projectFilteredPartners.filter(p => p.type === 'talent').length },
    { key: 'alliance', label: 'Alliances', icon: '🔗', count: projectFilteredPartners.filter(p => p.type === 'alliance').length }
  ];

  const filteredPartners = selectedType === 'all' 
    ? projectFilteredPartners 
    : projectFilteredPartners.filter(partner => partner.type === selectedType);

  const getRelationshipColor = (strength: string) => {
    switch (strength) {
      case 'cornerstone': return 'bg-green-100 text-green-800 border-green-300';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'emerging': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'connected': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRelationshipLabel = (strength: string) => {
    switch (strength) {
      case 'cornerstone': return 'Cornerstone Partnership';
      case 'active': return 'Active Collaboration';
      case 'emerging': return 'Emerging Partnership';
      case 'connected': return 'Connected Network';
      default: return 'Partnership';
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-green-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-6">
            {projectFilter ? (
              <>
                <span className="capitalize">{projectFilter.replace('-', '')}</span> <span className="text-green-600">Partners</span>
              </>
            ) : (
              <>
                Collaborative <span className="text-green-600">Relationships</span>
              </>
            )}
          </h2>
          <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed mb-8">
            {projectFilter ? (
              `Key partners collaborating on the ${projectFilter.replace('-', ' ')} project, each bringing unique expertise and shared commitment to community-led innovation.`
            ) : (
              'These partnerships aren\'t transactional—they\'re relational. Each collaboration brings unique gifts: wisdom, resources, expertise, networks, and most importantly, shared commitment to community-led change.'
            )}
          </p>

          {/* Relationship Philosophy */}
          <div className="bg-green-50 rounded-2xl p-8 max-w-4xl mx-auto mb-12">
            <div className="text-2xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-green-900 mb-3">
              Partnership as Mutual Care
            </h3>
            <p className="text-green-800 leading-relaxed">
              We believe in partnerships that honour what each brings to the table—whether that's 
              funding, cultural knowledge, technical skills, or lived experience. Every relationship 
              is built on reciprocity, respect, and shared learning.
            </p>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {partnerTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => setSelectedType(type.key)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all ${
                selectedType === type.key
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-green-50 border border-slate-200'
              }`}
            >
              <span className="text-lg">{type.icon}</span>
              <span>{type.label}</span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                selectedType === type.key
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {type.count}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Partners Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {filteredPartners.map((partner, index) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 ${
                partner.featured ? 'ring-2 ring-green-200' : ''
              }`}
            >
              {/* Partner Header */}
              <div className="flex items-start gap-6 mb-6">
                <div className="flex-shrink-0">
                  <img 
                    src={partner.logo_url} 
                    alt={`${partner.name} logo`}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{partner.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRelationshipColor(partner.relationship_strength)}`}>
                      {getRelationshipLabel(partner.relationship_strength)}
                    </span>
                    {partner.featured && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                        Featured Partner
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contribution Type */}
              <div className="mb-6">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  What They Bring
                </h4>
                <p className="text-lg font-medium text-slate-900 mb-2">{partner.contribution_type}</p>
                <p className="text-slate-700 leading-relaxed">{partner.description}</p>
              </div>

              {/* Collaboration Focus */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-900 mb-3">Collaboration Focus</h4>
                <div className="flex flex-wrap gap-2">
                  {partner.collaboration_focus.map((focus, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                      {focus}
                    </span>
                  ))}
                </div>
              </div>

              {/* Impact Story */}
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                  <span className="text-lg mr-2">💚</span>
                  Impact Story
                </h4>
                <p className="text-green-800 italic leading-relaxed">"{partner.impact_story}"</p>
              </div>

              {/* Partnership Details */}
              <div className="flex justify-between items-center text-sm text-slate-600">
                <div className="flex items-center gap-4">
                  {partner.location && (
                    <span className="flex items-center gap-1">
                      <span>📍</span>
                      {partner.location}
                    </span>
                  )}
                  {partner.established_date && (
                    <span className="flex items-center gap-1">
                      <span>🤝</span>
                      Since {partner.established_date}
                    </span>
                  )}
                </div>
                {partner.website_url && (
                  <a 
                    href={partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Learn More →
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Partnership Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">
              Interested in <span className="text-green-100">Collaboration?</span>
            </h3>
            <p className="text-green-100 mb-6 leading-relaxed">
              We're always open to forming relationships with organisations and individuals who 
              share our commitment to community-led change. Whether you bring funding, expertise, 
              connections, or lived experience—there's a place for authentic partnership.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors">
                Start a Conversation
              </button>
              <button className="border border-green-300 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-500 transition-colors">
                Partnership Guidelines
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}