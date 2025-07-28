import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import CollaborativePartnerShowcase from '../components/CollaborativePartnerShowcase';

interface MediaItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: 'photo' | 'video' | 'document';
  title: string;
  description?: string;
  manual_tags: string[];
  photographer?: string;
  created_at: string;
}

interface Story {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  hero_image_url?: string;
  published_at: string;
  tags: string[];
}

export default function PICCProjectPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load PICC project media from platform
    const loadProjectData = async () => {
      try {
        // Get media items tagged with "picc" from ACT's platform
        const mediaResponse = await fetch('http://localhost:4000/api/platform/act/items?tags=picc,community-wellbeing');
        const mediaData = await mediaResponse.json();
        
        // Get stories related to PICC project from Empathy Ledger
        const storiesResponse = await fetch('http://localhost:4000/api/stories?tags=picc,community-wellbeing&limit=10');
        const storiesData = await storiesResponse.json();
        
        setMediaItems(mediaData.media || []);
        setStories(storiesData.stories || []);
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading PICC project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
              <div className="text-indigo-600 font-medium">PICC</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-blue-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse"></span>
              Growing • Wellbeing Pillar
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6">
              PICC: <span className="text-indigo-600">Place-based Innovation</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed mb-8">
              When communities become innovation labs, extraordinary things emerge. PICC (Place-based Innovation 
              for Community Change) transforms neighborhoods into engines of locally-led wellbeing solutions.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-lg">
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">🏘️</span>
                <div>
                  <div className="font-semibold text-slate-900">8 Communities</div>
                  <div className="text-slate-600 text-sm">Active innovation hubs</div>
                </div>
              </div>
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">💡</span>
                <div>
                  <div className="font-semibold text-slate-900">47 Solutions</div>
                  <div className="text-slate-600 text-sm">Community-led innovations</div>
                </div>
              </div>
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">🌱</span>
                <div>
                  <div className="font-semibold text-slate-900">Nov 2025</div>
                  <div className="text-slate-600 text-sm">Next expansion phase</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Project Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Communities as <span className="text-indigo-600">Innovation Labs</span>
              </h2>
              
              <div className="space-y-6 text-lg text-slate-700">
                <p>
                  PICC emerged from a simple observation: communities already have the solutions 
                  to their challenges, they just need space, resources, and permission to experiment. 
                  What if we treated neighborhoods like research labs?
                </p>
                
                <p>
                  Each PICC hub becomes a testing ground for community-designed wellbeing solutions. 
                  From elder care networks to youth mentorship circles, from food security innovations 
                  to mental health supports - all co-created by the people who will use them.
                </p>
                
                <blockquote className="border-l-4 border-indigo-500 pl-6 italic text-indigo-800 bg-indigo-50 p-6 rounded-r-lg">
                  "We stopped waiting for solutions to come from outside. We realised we ARE the solution. 
                  PICC just gave us the tools and permission to trust ourselves."
                  <footer className="text-sm mt-2 text-indigo-700">— Maria, Community Innovation Lead</footer>
                </blockquote>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop" 
                  alt="Community innovation workshop in progress"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-sm opacity-90">Community Innovation Workshop</p>
                  <p className="text-xs opacity-75">Co-designing neighborhood wellbeing solutions</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Innovation Showcase */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Community <span className="text-indigo-600">Innovation</span> Types
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Each community develops solutions based on their unique strengths, challenges, and cultural context
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                category: "Connection Solutions",
                icon: "🤝",
                count: "18",
                description: "Building social fabric and reducing isolation",
                examples: [
                  "Intergenerational gardening circles",
                  "Skill-sharing networks",
                  "Community meal programs",
                  "Neighborhood watch reimagined as care circles"
                ]
              },
              {
                category: "Wellbeing Innovations", 
                icon: "🌱",
                count: "16",
                description: "Supporting mental, physical and spiritual health",
                examples: [
                  "Trauma-informed community spaces",
                  "Walking groups with cultural storytelling",
                  "Art therapy workshops",
                  "Traditional healing practice circles"
                ]
              },
              {
                category: "Resource Solutions",
                icon: "🔄",
                count: "13", 
                description: "Creating abundance through sharing and collaboration",
                examples: [
                  "Tool libraries and equipment sharing",
                  "Community-supported agriculture",
                  "Childcare cooperatives",
                  "Time banking systems"
                ]
              }
            ].map((innovation, index) => (
              <motion.div
                key={innovation.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{innovation.icon}</div>
                  <div className="text-3xl font-bold text-indigo-600 mb-2">{innovation.count}</div>
                  <h3 className="text-xl font-bold text-slate-900">{innovation.category}</h3>
                </div>
                
                <p className="text-slate-700 mb-6 text-center">{innovation.description}</p>
                
                <div className="space-y-3">
                  {innovation.examples.map((example, idx) => (
                    <div key={idx} className="flex items-start text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {example}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Gallery */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Innovation <span className="text-indigo-600">Gallery</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Stories from communities experimenting with place-based innovation
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Mock Media Items for PICC Project */}
            {[
              {
                id: 1,
                title: "Community Lab Setup",
                description: "Transforming a neighborhood center into a community innovation space",
                image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Innovation Team",
                tags: ["lab-setup", "community-space", "transformation"]
              },
              {
                id: 2,
                title: "Intergenerational Garden Circle",
                description: "Elders and youth co-creating a community food and medicine garden",
                image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Community Gardens Collective",
                tags: ["intergenerational", "garden", "food-security"]
              },
              {
                id: 3,
                title: "Skill Sharing Network Launch",
                description: "Community members mapping and sharing their skills and knowledge",
                image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Skills Network",
                tags: ["skill-sharing", "knowledge", "network"]
              },
              {
                id: 4,
                title: "Tool Library Opening",
                description: "Neighbors celebrating the opening of their community tool sharing library",
                image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Tool Library Collective",
                tags: ["tool-library", "sharing-economy", "resources"]
              },
              {
                id: 5,
                title: "Community Wellbeing Circle",
                description: "Weekly gathering focused on mental health and mutual support",
                image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Wellbeing Circle",
                tags: ["wellbeing", "mental-health", "support"]
              },
              {
                id: 6,
                title: "Innovation Impact Stories",
                description: "Documentary featuring community members sharing their innovation journeys",
                image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=600&fit=crop",
                type: "video",
                photographer: "Story Collective",
                tags: ["documentary", "impact", "stories"]
              }
            ].map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="relative">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                      {item.type === 'video' ? '🎥 Video' : '📸 Photo'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm mb-3">{item.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <p className="text-xs text-slate-500">📸 {item.photographer}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaborative Partner Showcase */}
      <CollaborativePartnerShowcase projectFilter="picc" />

      {/* Community Stories */}
      {stories.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Community <span className="text-indigo-600">Stories</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Voices from community innovation labs sharing their transformation journeys
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {stories.map((story, index) => (
                <motion.article
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-slate-50 rounded-xl p-8 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-wrap gap-2 mb-4">
                    {story.tags.map(tag => (
                      <span key={tag} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{story.title}</h3>
                  <p className="text-slate-700 mb-4">{story.excerpt}</p>
                  
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>By {story.author}</span>
                    <span>{new Date(story.published_at).toLocaleDateString()}</span>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Future Vision */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold mb-8">The Innovation Network</h2>
            
            <p className="text-xl opacity-90 max-w-4xl mx-auto mb-12">
              As PICC communities prove what's possible when neighborhoods become innovation labs, 
              we're building a network of place-based innovators. Each community becomes both student 
              and teacher, sharing solutions across contexts while honouring local wisdom.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl mb-3">🌐</div>
                <h3 className="font-semibold mb-2">Innovation Network</h3>
                <p className="opacity-90">50 communities sharing solutions by 2026</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📚</div>
                <h3 className="font-semibold mb-2">Open Source Toolkit</h3>
                <p className="opacity-90">Methodologies freely available to all communities</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎓</div>
                <h3 className="font-semibold mb-2">Innovation Academy</h3>
                <p className="opacity-90">Training new community innovation facilitators</p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Link 
                to="/projects/goods"
                className="inline-flex items-center bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
              >
                Goods Project →
              </Link>
              <Link 
                to="/projects/justice-hub"
                className="inline-flex items-center bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
              >
                JusticeHub →
              </Link>
              <Link 
                to="/"
                className="inline-flex items-center border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}