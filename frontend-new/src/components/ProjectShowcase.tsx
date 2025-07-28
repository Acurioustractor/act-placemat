import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  pillar: string;
  status: string;
  description: string;
  impact: string;
  image: string;
  route: string;
  theme: {
    primary: string;
    background: string;
    text: string;
  };
  metrics: {
    label: string;
    value: string;
    icon: string;
  }[];
}

export default function ProjectShowcase() {
  const projects: Project[] = [
    {
      id: 'goods',
      name: 'Goods',
      pillar: 'Wellbeing',
      status: 'Pilot Phase',
      description: 'The Great Bed project emerged from listening circles with Elders who needed beds that could be properly cleaned in remote communities.',
      impact: 'Community-led design that honours lived experience while creating dignified rest.',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop',
      route: '/projects/goods',
      theme: {
        primary: 'text-green-600',
        background: 'from-green-50 to-emerald-50/30',
        text: 'text-green-800'
      },
      metrics: [
        { label: 'Communities', value: '3', icon: '🏥' },
        { label: 'Products', value: '3', icon: '🛏️' },
        { label: 'Materials', value: '100%', icon: '♻️' }
      ]
    },
    {
      id: 'justice-hub',
      name: 'JusticeHub',
      pillar: 'Justice',
      status: 'Active',
      description: 'First 10 Voices created 170 ripples of change throughout the justice system when young people shared their experiences with decision-makers.',
      impact: 'Authentic listening becomes systemic transformation.',
      image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop',
      route: '/projects/justice-hub',
      theme: {
        primary: 'text-purple-600',
        background: 'from-purple-50 to-indigo-50/30',
        text: 'text-purple-800'
      },
      metrics: [
        { label: 'Voices', value: '10', icon: '👥' },
        { label: 'Ripples', value: '170', icon: '🌊' },
        { label: 'Changes', value: '89', icon: '⚖️' }
      ]
    },
    {
      id: 'picc',
      name: 'PICC',
      pillar: 'Community',
      status: 'Growing',
      description: 'Place-based Innovation for Community Change transforms neighborhoods into innovation labs where communities co-create wellbeing solutions.',
      impact: 'Communities become innovation labs for locally-led change.',
      image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop',
      route: '/projects/picc',
      theme: {
        primary: 'text-indigo-600',
        background: 'from-indigo-50 to-blue-50/30',
        text: 'text-indigo-800'
      },
      metrics: [
        { label: 'Communities', value: '8', icon: '🏘️' },
        { label: 'Solutions', value: '47', icon: '💡' },
        { label: 'Hubs', value: '12', icon: '🌱' }
      ]
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-slate-50">
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
            Three Pillars of <span className="text-green-600">Change</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
            Each project represents a different approach to community-centred innovation, 
            proving that when we listen deeply, revolutionary solutions emerge.
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <Link to={project.route} className="block">
                <div className={`bg-gradient-to-br ${project.theme.background} rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]`}>
                  
                  {/* Project Image */}
                  <div className="relative overflow-hidden">
                    <img 
                      src={project.image} 
                      alt={`${project.name} project`}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/90 ${project.theme.text}`}>
                        {project.status} • {project.pillar} Pillar
                      </span>
                    </div>
                    
                    {/* Project Name Overlay */}
                    <div className="absolute bottom-4 left-4">
                      <h3 className="text-2xl font-bold text-white mb-1">{project.name}</h3>
                      <p className="text-white/90 text-sm">{project.pillar} Innovation</p>
                    </div>
                  </div>

                  {/* Project Content */}
                  <div className="p-8">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      {project.description}
                    </p>

                    {/* Impact Statement */}
                    <div className="bg-white/50 rounded-lg p-4 mb-6">
                      <h4 className={`font-semibold ${project.theme.primary} mb-2 flex items-center`}>
                        <span className="w-2 h-2 bg-current rounded-full mr-2"></span>
                        Impact
                      </h4>
                      <p className={`${project.theme.text} font-medium`}>
                        {project.impact}
                      </p>
                    </div>

                    {/* Project Metrics */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {project.metrics.map((metric, idx) => (
                        <div key={idx} className="text-center">
                          <div className="text-xl mb-1">{metric.icon}</div>
                          <div className={`font-bold ${project.theme.primary}`}>{metric.value}</div>
                          <div className="text-xs text-slate-600">{metric.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Learn More Button */}
                    <div className={`w-full bg-white border-2 border-current ${project.theme.primary} py-3 rounded-lg font-semibold text-center hover:bg-current hover:text-white transition-all duration-300`}>
                      Explore {project.name} →
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">
              Ready to <span className="text-green-100">Collaborate?</span>
            </h3>
            <p className="text-green-100 mb-6 leading-relaxed">
              These projects prove what's possible when communities lead innovation. 
              Whether you're a funder, community organisation, or changemaker - there's 
              a place for authentic partnership in this revolutionary approach.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors">
                Partner with ACT
              </button>
              <button className="border border-green-300 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-500 transition-colors">
                Explore All Projects
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}