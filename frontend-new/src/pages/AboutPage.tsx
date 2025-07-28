import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Users, Compass, Seedling, ArrowRight, MapPin, Camera } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  story: string;
  location: string;
  image?: string;
  relationshipPhilosophy: string;
}

interface MediaItem {
  id: string;
  file_url: string;
  title: string;
  description?: string;
  photographer?: string;
  manual_tags: string[];
}

export default function AboutPage() {
  const [teamMedia, setTeamMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamMedia = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/platform/act/items?tags=team,about,culture');
        const data = await response.json();
        setTeamMedia(data.media || []);
      } catch (error) {
        console.error('Error loading team media:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMedia();
  }, []);

  const teamMembers: TeamMember[] = [
    {
      name: "Nicholas Marchesi",
      role: "Relationship Facilitator & Co-Founder",
      story: "From youth justice worker to community relationship architect. Nicholas believes that the best innovations emerge when organizations become infrastructure for community wisdom rather than service providers.",
      location: "Travelling between communities",
      relationshipPhilosophy: "Real change happens when we help communities teach each other, not when we teach communities."
    },
    {
      name: "Ben Knight", 
      role: "Community Technology Designer",
      story: "Building technology that serves relationships, not efficiency. Ben designs systems that help organizations become more connected to the communities they serve.",
      location: "Brisbane",
      relationshipPhilosophy: "Every line of code should ask: does this make people more human together, or more efficient apart?"
    }
  ];

  const coreValues = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Connection Over Transaction",
      description: "We measure success by relationship depth, not revenue growth. Our business model prioritizes long-term partnership evolution over short-term project delivery.",
      example: "Instead of 'How much can we charge?' we ask 'How much agency can we help this community develop?'"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community Ownership Always",
      description: "Stories belong to communities, not to us. Technology serves community agency, not organizational efficiency. Partners gain more control through our platforms, not less.",
      example: "Our 'success' means becoming less needed as communities become more self-sufficient."
    },
    {
      icon: <Compass className="w-6 h-6" />,
      title: "Wisdom Flows Between Communities",
      description: "We're infrastructure for community-to-community learning. Our role is connecting partners who can teach each other, facilitating knowledge transfer, tracking relationship health.",
      example: "When Mount Isa learns from Palm Island through our network, that's revolutionary impact."
    },
    {
      icon: <Seedling className="w-6 h-6" />,
      title: "Revolutionary Love in Practice",
      description: "We're prototyping a new way organizations can exist in authentic relationship with communities. Business as a practice of deepening connection.",
      example: "Our platforms demonstrate that technology can serve liberation rather than extraction."
    }
  ];

  const relationshipJourney = [
    {
      stage: "Curious Connection",
      description: "We start by asking questions that deepen relationships, not just gather data",
      questions: ["What does this community really need?", "How can we become better partners over time?"],
      duration: "3-6 months"
    },
    {
      stage: "Co-Creation",
      description: "Building together means owned together. Partners shape the tools they use.",
      activities: ["Listening circles", "Community design sessions", "Shared decision-making"],
      duration: "6-18 months"
    },
    {
      stage: "Community Agency",
      description: "Success means partners gaining more control and capability",
      outcomes: ["Self-managed projects", "Community-led storytelling", "Peer teaching capacity"],
      duration: "1-3 years"
    },
    {
      stage: "Wisdom Network",
      description: "Communities teaching communities, with ACT as connecting infrastructure",
      impact: ["Cross-community learning", "Shared innovation", "Collective advocacy"],
      duration: "Ongoing"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🚜</span>
              <span className="font-bold text-slate-800">A Curious Tractor</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-slate-600 hover:text-slate-800">Home</Link>
              <Link to="/projects/goods" className="text-slate-600 hover:text-slate-800">Goods</Link>
              <Link to="/projects/justice-hub" className="text-slate-600 hover:text-slate-800">JusticeHub</Link>
              <div className="text-green-600 font-medium">About</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-blue-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              We're Not Just Building Tools<br />
              <span className="text-green-600">We're Cultivating Relationships</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              A Curious Tractor exists to help organizations evolve from service providers to relationship facilitators. 
              We build infrastructure for community wisdom to flourish and compound.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Philosophy */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Philosophy in Action</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Every platform we create, every system we architect, every relationship we facilitate asks the question: 
              <strong> Does this make communities more connected to each other, or more isolated?</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {coreValues.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200"
              >
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mr-4">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{value.title}</h3>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">{value.description}</p>
                <div className="bg-green-50 border-l-4 border-green-400 pl-4 py-2">
                  <p className="text-sm text-green-800 italic">"{value.example}"</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section with Media Integration */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Humans Behind the Philosophy</h2>
            <p className="text-lg text-gray-600">
              We're a small team committed to revolutionary love in practice
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="bg-white rounded-2xl p-8 shadow-lg"
              >
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-green-600 font-medium">{member.role}</p>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {member.location}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6 leading-relaxed">{member.story}</p>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 pl-4 py-3">
                  <p className="text-sm text-blue-800 italic">"{member.relationshipPhilosophy}"</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Team Media Gallery */}
          {!loading && teamMedia.length > 0 && (
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Camera className="w-6 h-6 mr-2 text-green-600" />
                Behind the Scenes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMedia.slice(0, 6).map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-lg">
                    <img 
                      src={item.file_url} 
                      alt={item.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.photographer && (
                          <p className="text-xs opacity-80">📸 {item.photographer}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Relationship Journey */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Partnership Journey</h2>
            <p className="text-lg text-gray-600">
              How relationships evolve from curious connection to wisdom network
            </p>
          </div>

          <div className="space-y-8">
            {relationshipJourney.map((stage, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg mr-6">
                  {index + 1}
                </div>
                <div className="flex-grow bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{stage.stage}</h3>
                    <span className="text-sm text-green-600 font-medium">{stage.duration}</span>
                  </div>
                  <p className="text-gray-700 mb-4">{stage.description}</p>
                  
                  {stage.questions && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Key Questions:</h4>
                      <ul className="space-y-1">
                        {stage.questions.map((q, i) => (
                          <li key={i} className="text-sm text-gray-600">• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {stage.activities && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Activities:</h4>
                      <div className="flex flex-wrap gap-2">
                        {stage.activities.map((activity, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {stage.outcomes && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Outcomes:</h4>
                      <div className="flex flex-wrap gap-2">
                        {stage.outcomes.map((outcome, i) => (
                          <span key={i} className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {outcome}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {stage.impact && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Network Impact:</h4>
                      <div className="flex flex-wrap gap-2">
                        {stage.impact.map((impact, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {impact}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Grow Relationships Together?</h2>
          <p className="text-xl mb-8 opacity-90">
            We're always curious about new partnerships and community connections. 
            Let's explore how we might support each other's growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/contact" 
              className="inline-flex items-center px-8 py-3 bg-white text-green-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Start a Conversation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link 
              to="/" 
              className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-green-600 transition-colors"
            >
              Explore Our Work
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}