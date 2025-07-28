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

export default function JusticeHubProjectPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load JusticeHub project media from platform
    const loadProjectData = async () => {
      try {
        // Get media items tagged with "justice-hub" from ACT's platform
        const mediaResponse = await fetch('http://localhost:4000/api/platform/act/items?tags=justice-hub,youth-justice');
        const mediaData = await mediaResponse.json();
        
        // Get stories related to JusticeHub project from Empathy Ledger
        const storiesResponse = await fetch('http://localhost:4000/api/stories?tags=justice-hub,youth-justice&limit=10');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading JusticeHub project...</p>
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
              <div className="text-purple-600 font-medium">JusticeHub</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-indigo-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></span>
              Active • Justice Pillar
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6">
              JusticeHub: <span className="text-purple-600">First 10 Voices</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed mb-8">
              When 10 young people shared their experiences with the justice system, their voices rippled 
              out to create 170 moments of change. This is the story of how authentic listening becomes 
              systemic transformation.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-lg">
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">👥</span>
                <div>
                  <div className="font-semibold text-slate-900">10 Voices</div>
                  <div className="text-slate-600 text-sm">First cohort</div>
                </div>
              </div>
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">🌊</span>
                <div>
                  <div className="font-semibold text-slate-900">170 Ripples</div>
                  <div className="text-slate-600 text-sm">System changes triggered</div>
                </div>
              </div>
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">⚖️</span>
                <div>
                  <div className="font-semibold text-slate-900">Dec 2025</div>
                  <div className="text-slate-600 text-sm">Policy launch target</div>
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
                When Voices <span className="text-purple-600">Meet Power</span>
              </h2>
              
              <div className="space-y-6 text-lg text-slate-700">
                <p>
                  JusticeHub began with a simple premise: what if young people who experienced 
                  the justice system could directly influence how it works? Ten brave voices 
                  stepped forward to share their stories with system decision-makers.
                </p>
                
                <p>
                  Each conversation created ripples - policy conversations, training program 
                  changes, new protocols that center dignity. The First 10 Voices project 
                  proves that authentic listening leads to authentic change.
                </p>
                
                <blockquote className="border-l-4 border-purple-500 pl-6 italic text-purple-800 bg-purple-50 p-6 rounded-r-lg">
                  "They actually listened. Not just to check a box, but to really understand 
                  what it feels like to be in the system. That's when things started changing."
                  <footer className="text-sm mt-2 text-purple-700">— Jordan, Youth Advisory Circle</footer>
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
                  alt="Youth voices meeting with justice system leaders"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-sm opacity-90">Youth Advisory Circle session</p>
                  <p className="text-xs opacity-75">Building bridges between lived experience and policy</p>
                </div>
              </div>
            </motion.div>
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
              Project <span className="text-purple-600">Gallery</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Documenting the journey from first conversations to systemic change
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Mock Media Items for JusticeHub Project */}
            {[
              {
                id: 1,
                title: "First Voice Circle",
                description: "Ten young people share their experiences in a safe, supported environment",
                image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Youth Justice Alliance",
                tags: ["first-voices", "circle", "sharing"]
              },
              {
                id: 2,
                title: "Policy Maker Listening Session",
                description: "Decision-makers hearing directly from young people about system impact",
                image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Justice Reform Team",
                tags: ["policy", "listening", "change"]
              },
              {
                id: 3,
                title: "Training Program Design",
                description: "Co-designing new staff training with youth insights at the center",
                image: "https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Co-design Team",
                tags: ["training", "co-design", "staff"]
              },
              {
                id: 4,
                title: "System Mapping Workshop",
                description: "Young people mapping their journey through justice systems to identify change points",
                image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Research Collective",
                tags: ["mapping", "journey", "systems"]
              },
              {
                id: 5,
                title: "Community Advisory Meeting",
                description: "Monthly check-ins with community to ensure accountability and direction",
                image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop",
                type: "photo",
                photographer: "Community Circle",
                tags: ["community", "advisory", "accountability"]
              },
              {
                id: 6,
                title: "170 Ripples Documentary",
                description: "Short film documenting the cascade of changes triggered by the First 10 Voices",
                image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=600&fit=crop",
                type: "video",
                photographer: "Story Collective",
                tags: ["documentary", "ripples", "impact"]
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
                        <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      {item.type === 'video' ? '🎥 Video' : '📸 Photo'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm mb-3">{item.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
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

      {/* Impact Showcase */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              <span className="text-purple-600">170 Ripples</span> of Change
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Each conversation sparked changes throughout the system. Here are some of the waves 
              created by the First 10 Voices.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                category: "Policy Changes",
                icon: "📋",
                count: "47",
                description: "New protocols and policies influenced by youth voice",
                examples: ["Dignity-centred intake procedures", "Trauma-informed questioning protocols", "Family involvement guidelines"]
              },
              {
                category: "Training Programs",
                icon: "🎓",
                count: "89",
                description: "Staff training modules updated with lived experience insights",
                examples: ["De-escalation techniques", "Cultural responsiveness", "Youth engagement approaches"]
              },
              {
                category: "System Improvements",
                icon: "⚖️",
                count: "34",
                description: "Operational changes in courts and facilities",
                examples: ["Waiting room redesigns", "Communication improvements", "Support service connections"]
              }
            ].map((impact, index) => (
              <motion.div
                key={impact.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{impact.icon}</div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">{impact.count}</div>
                  <h3 className="text-xl font-bold text-slate-900">{impact.category}</h3>
                </div>
                
                <p className="text-slate-700 mb-6 text-center">{impact.description}</p>
                
                <div className="space-y-3">
                  {impact.examples.map((example, idx) => (
                    <div key={idx} className="flex items-start text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {example}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaborative Partner Showcase */}
      <CollaborativePartnerShowcase projectFilter="justice-hub" />

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
                Community <span className="text-purple-600">Stories</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                First-hand accounts from the First 10 Voices and the ripples they created
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
                      <span key={tag} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
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

      {/* Next Steps */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold mb-8">Scaling the Model</h2>
            
            <p className="text-xl opacity-90 max-w-4xl mx-auto mb-12">
              The success of the First 10 Voices has caught the attention of justice systems across 
              the country. We're now piloting this approach in three additional jurisdictions, 
              each adapted to local contexts while maintaining the core principles.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl mb-3">🌏</div>
                <h3 className="font-semibold mb-2">National Expansion</h3>
                <p className="opacity-90">Three new jurisdictions piloting the model</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📚</div>
                <h3 className="font-semibold mb-2">Practice Guide</h3>
                <p className="opacity-90">Toolkit for replicating youth voice approaches</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🔄</div>
                <h3 className="font-semibold mb-2">Continuous Learning</h3>
                <p className="opacity-90">Ongoing evaluation and model refinement</p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Link 
                to="/projects/goods"
                className="inline-flex items-center bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                Goods Project →
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