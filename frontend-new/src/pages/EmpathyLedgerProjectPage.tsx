import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Network, 
  Users, 
  Globe, 
  Code,
  Lightbulb,
  ArrowRight,
  Download,
  ExternalLink,
  Star,
  Zap,
  Target,
  Sparkles,
  Brain,
  Coffee
} from 'lucide-react';

const EmpathyLedgerProjectPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);

  // Emerald theme representing growth, empathy, and connection
  const theme = {
    primary: 'emerald',
    secondary: 'teal',
    accent: 'green',
    gradient: 'from-emerald-600 via-teal-600 to-green-700'
  };

  const communities = [
    {
      name: "A Curious Tractor",
      location: "Brisbane, QLD",
      role: "First Office Client",
      innovation: "Empathy-Driven Operations Platform",
      impact: "Revolutionary organisational transformation",
      story: "ACT pioneered the first complete organisational integration of Empathy Ledger, transforming from traditional consulting to community-centred platform operations."
    },
    {
      name: "Community Health Collective",
      location: "Melbourne, VIC",
      role: "Healthcare Integration",
      innovation: "Patient-Centred Care System",
      impact: "40% improvement in patient satisfaction",
      story: "Integrating empathy metrics into healthcare delivery, creating deeper patient relationships and better health outcomes."
    },
    {
      name: "Indigenous Knowledge Network",
      location: "Alice Springs, NT",
      role: "Cultural Protocol Integration",
      innovation: "Cultural-First CRM",
      impact: "100% cultural protocol compliance",
      story: "Developing systems that honour Aboriginal relationship protocols and cultural considerations in all interactions."
    },
    {
      name: "Youth Justice Reform",
      location: "Townsville, QLD",
      role: "Rehabilitation Innovation",
      innovation: "Trauma-Informed Case Management",
      impact: "60% reduction in recidivism",
      story: "Using empathy-driven data to support young people through rehabilitation with dignity and cultural respect."
    },
    {
      name: "Environmental Stewards",
      location: "Perth, WA",
      role: "Ecosystem Conservation",
      innovation: "Community-Led Conservation Tracking",
      impact: "12 ecosystems protected",
      story: "Connecting conservation efforts with community relationships, honouring both land and people."
    },
    {
      name: "Education Transformation Hub",
      location: "Sydney, NSW",
      role: "Student-Centred Learning",
      innovation: "Holistic Development Platform",
      impact: "85% improvement in student engagement",
      story: "Replacing traditional student information systems with platforms that honour whole-person development."
    },
    {
      name: "Social Enterprise Network",
      location: "Adelaide, SA",
      role: "Impact Economy Pioneer",
      innovation: "Values-Based Business Operations",
      impact: "300% growth in community benefit",
      story: "Demonstrating how social enterprises can scale impact while maintaining authentic community relationships."
    },
    {
      name: "Cultural Arts Collective",
      location: "Hobart, TAS",
      role: "Creative Community Building",
      innovation: "Artist-Centred Support System",
      impact: "150 artists supported",
      story: "Creating support networks for artists that honour creative process and community connection."
    }
  ];

  const solutions = [
    {
      title: "Empathy-Driven CRM",
      description: "Relationship management that honours cultural protocols and authentic human connection",
      category: "Technology",
      impact: "Transformed organisational relationships",
      icon: <Heart className="w-5 h-5" />
    },
    {
      title: "Community-Centred Architecture",
      description: "Technical infrastructure designed around community needs rather than organisational convenience",
      category: "Platform",
      impact: "Infinite scalability with care",
      icon: <Network className="w-5 h-5" />
    },
    {
      title: "Care-Based Analytics",
      description: "Metrics that measure relationship health and community benefit alongside traditional KPIs",
      category: "Analytics",
      impact: "Authentic impact measurement",
      icon: <Brain className="w-5 h-5" />
    },
    {
      title: "Cultural Protocol Integration",
      description: "Built-in respect for Indigenous relationship protocols and cultural considerations",
      category: "Cultural",
      impact: "100% protocol compliance",
      icon: <Users className="w-5 h-5" />
    },
    {
      title: "Template-Based Scaling",
      description: "Rapid deployment system that maintains authenticity while enabling growth",
      category: "Scaling",
      impact: "Infinite growth potential",
      icon: <Target className="w-5 h-5" />
    },
    {
      title: "Automated Empathy",
      description: "AI-powered systems that enhance rather than replace human connection",
      category: "Automation",
      impact: "Enhanced relationship nurturing",
      icon: <Zap className="w-5 h-5" />
    }
  ];

  const innovationLabs = [
    {
      name: "Empathy AI Lab",
      focus: "Developing AI that enhances human connection",
      projects: 12,
      researchers: 8
    },
    {
      name: "Cultural Protocol Institute",
      focus: "Integrating Indigenous relationship wisdom into technology",
      projects: 6,
      researchers: 15
    },
    {
      name: "Community-Centred Design Studio",
      focus: "Co-designing technology with communities",
      projects: 23,
      researchers: 12
    },
    {
      name: "Empathy Metrics Research Center",
      focus: "Measuring authentic relationship health and community impact",
      projects: 9,
      researchers: 7
    },
    {
      name: "Care-Based Economy Lab",
      focus: "Designing economic systems that prioritize community benefit",
      projects: 15,
      researchers: 11
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-green-700/20" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Heart className="w-4 h-4" />
              Revolutionary Platform Technology
            </div>
            
            <h1 className="text-6xl font-bold text-gray-900 mb-8 leading-tight">
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent">
                Empathy Ledger
              </span>
              <br />
              <span className="text-4xl text-gray-700">Technology That Embodies Values</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
              The world's first platform designed to embed radical empathy into organisational operations. 
              Built by A Curious Tractor, proven by communities, scaled through authentic relationships.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-5 h-5" />
                Implementation Guide
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-emerald-600 text-emerald-600 px-8 py-4 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-50 transition-all"
              >
                <ExternalLink className="w-5 h-5" />
                Live Platform Demo
              </motion.button>
            </div>
          </motion.div>
          
          {/* Key Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {[
              { label: "Organisations Transformed", value: "47", icon: <Users className="w-6 h-6" /> },
              { label: "Communities Connected", value: "8", icon: <Globe className="w-6 h-6" /> },
              { label: "Empathy Metrics Tracked", value: "1.2M", icon: <Heart className="w-6 h-6" /> },
              { label: "Innovation Labs", value: "5", icon: <Lightbulb className="w-6 h-6" /> }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-emerald-100">
                  <div className="text-emerald-600 mb-2 flex justify-center">{stat.icon}</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto py-4">
            {[
              { id: 'overview', label: 'Platform Overview', icon: <Globe className="w-4 h-4" /> },
              { id: 'communities', label: 'Client Communities', icon: <Users className="w-4 h-4" /> },
              { id: 'solutions', label: 'Technical Solutions', icon: <Code className="w-4 h-4" /> },
              { id: 'innovation', label: 'Innovation Labs', icon: <Lightbulb className="w-4 h-4" /> },
              { id: 'impact', label: 'Global Impact', icon: <Star className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-6">
                    Revolutionary Platform Architecture
                  </h2>
                  <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                    Empathy Ledger represents a fundamental reimagining of how technology can embody organisational values. 
                    Built by A Curious Tractor as the world's first empathy-driven operational platform, it demonstrates 
                    perfect <span className="font-semibold text-emerald-600">meta-circularity</span>—ACT transforms organisations 
                    by first transforming themselves, using the very platform they created to revolutionize their own operations.
                  </p>
                  <div className="space-y-4">
                    {[
                      "Community-centred database architecture",
                      "Cultural protocol integration systems", 
                      "Empathy-driven relationship management",
                      "Template-based infinite scaling",
                      "Care-based analytics and metrics"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Meta-Circularity</h3>
                    <p className="text-gray-600">ACT embodies their values by building and using their own empathy-driven platform</p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                        <Code className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Platform Developer</div>
                        <div className="text-sm text-gray-600">A Curious Tractor builds Empathy Ledger</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                        <Heart className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">First Office Client</div>
                        <div className="text-sm text-gray-600">ACT operates using their own platform</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Meta-Circularity in Action</div>
                        <div className="text-sm text-gray-600">Technology embodying values through self-transformation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    title: "Dual-System Architecture",
                    description: "Internal operations and public engagement platforms working in harmony",
                    icon: <Network className="w-8 h-8" />,
                    color: "emerald"
                  },
                  {
                    title: "Community-Centred CRM",
                    description: "Relationship management that honours cultural protocols and authentic connection",
                    icon: <Users className="w-8 h-8" />,
                    color: "teal"
                  },
                  {
                    title: "Empathy Automation",
                    description: "AI that enhances rather than replaces human relationships",
                    icon: <Brain className="w-8 h-8" />,
                    color: "green"
                  },
                  {
                    title: "Interactive Mapping",
                    description: "Visual representation of community networks and relationships",
                    icon: <Globe className="w-8 h-8" />,
                    color: "emerald"
                  },
                  {
                    title: "Template Scaling",
                    description: "Rapid deployment while maintaining authentic community connection",
                    icon: <Target className="w-8 h-8" />,
                    color: "teal"
                  },
                  {
                    title: "Impact Analytics",
                    description: "Measuring community benefit alongside traditional metrics",
                    icon: <Star className="w-8 h-8" />,
                    color: "green"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-all"
                  >
                    <div className={`w-16 h-16 bg-${feature.color}-100 rounded-2xl flex items-center justify-center mb-4 text-${feature.color}-600`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'communities' && (
            <motion.div
              key="communities"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Client Communities</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Organisations across Australia transforming their operations through empathy-driven technology
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {communities.map((community, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => setSelectedCommunity(selectedCommunity === community.name ? null : community.name)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{community.name}</h3>
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Heart className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-gray-600">📍 {community.location}</div>
                      <div className="text-sm font-medium text-emerald-600">{community.role}</div>
                      <div className="text-sm text-gray-700">{community.innovation}</div>
                    </div>
                    
                    <div className="bg-emerald-50 rounded-lg p-3 mb-4">
                      <div className="text-sm font-medium text-emerald-700">Impact</div>
                      <div className="text-sm text-emerald-600">{community.impact}</div>
                    </div>
                    
                    <AnimatePresence>
                      {selectedCommunity === community.name && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-emerald-100 pt-4"
                        >
                          <p className="text-sm text-gray-600 leading-relaxed">{community.story}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'solutions' && (
            <motion.div
              key="solutions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Technical Solutions</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Revolutionary technologies that embed empathy into organisational operations
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {solutions.map((solution, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                        {solution.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{solution.title}</h3>
                        <div className="text-sm text-emerald-600 font-medium">{solution.category}</div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">{solution.description}</p>
                    
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-emerald-700">Impact</div>
                      <div className="text-sm text-emerald-600">{solution.impact}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'innovation' && (
            <motion.div
              key="innovation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Innovation Labs</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Research centers developing the future of empathy-driven technology
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {innovationLabs.map((lab, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-8 shadow-lg border border-emerald-100 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
                        <Lightbulb className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{lab.name}</h3>
                      </div>
                    </div>
                    
                    <p className="text-lg text-gray-600 mb-6 leading-relaxed">{lab.focus}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600">{lab.projects}</div>
                        <div className="text-sm text-emerald-700">Active Projects</div>
                      </div>
                      <div className="bg-teal-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-teal-600">{lab.researchers}</div>
                        <div className="text-sm text-teal-700">Researchers</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'impact' && (
            <motion.div
              key="impact"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Global Impact</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Transforming how organisations operate through empathy-driven technology
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-12 text-white mb-16">
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div>
                    <div className="text-5xl font-bold mb-2">47</div>
                    <div className="text-emerald-100">Organisations Transformed</div>
                  </div>
                  <div>
                    <div className="text-5xl font-bold mb-2">1.2M</div>
                    <div className="text-emerald-100">Empathy Interactions Tracked</div>
                  </div>
                  <div>
                    <div className="text-5xl font-bold mb-2">∞</div>
                    <div className="text-emerald-100">Scaling Potential</div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6">The Empathy Revolution</h3>
                  <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                    Empathy Ledger represents more than a platform—it's a movement toward organisations 
                    that prioritize authentic relationships, community benefit, and values-embedded operations.
                  </p>
                  <div className="space-y-4">
                    {[
                      "Organisations embedding empathy into core operations",
                      "Communities experiencing authentic technological representation",
                      "Cultural protocols honoured in digital relationships",
                      "Sustainable scaling through care-based systems",
                      "Global network of empathy-driven organisations"
                    ].map((impact, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-gray-700">{impact}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-emerald-100">
                  <h4 className="text-2xl font-bold text-gray-900 mb-6">Ready to Transform?</h4>
                  <p className="text-gray-600 mb-6">
                    Join the organisations pioneering empathy-driven operations through the Empathy Ledger platform.
                  </p>
                  <div className="space-y-4">
                    <button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
                      Schedule Implementation Call
                    </button>
                    <button className="w-full border-2 border-emerald-600 text-emerald-600 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-all">
                      Download Case Study
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Call to Action */}
      <section className="bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 py-24">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Join the Empathy Revolution
            </h2>
            <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
              Transform your organisation through technology that embodies your values. 
              The future is empathy-driven. The time is now.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Coffee className="w-5 h-5" />
                Book Discovery Call
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 hover:bg-white/10 transition-all"
              >
                <Download className="w-5 h-5" />
                Implementation Toolkit
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default EmpathyLedgerProjectPage;