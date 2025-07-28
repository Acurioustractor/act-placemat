import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import GoodsProductShowcase from '../components/GoodsProductShowcase';
import CollaborativePartnerShowcase from '../components/CollaborativePartnerShowcase';
import SeamlessMediaManager from '../components/SeamlessMediaManager';

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

export default function GoodsProjectPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Goods project media from platform
    const loadProjectData = async () => {
      try {
        // Get media items tagged with "goods" from ACT's platform
        const mediaResponse = await fetch('http://localhost:4000/api/platform/act/items?tags=goods,great-bed');
        const mediaData = await mediaResponse.json();
        
        // Get stories related to Goods project from Empathy Ledger
        const storiesResponse = await fetch('http://localhost:4000/api/stories?tags=goods,great-bed&limit=10');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading Goods project...</p>
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
              <Link to="/about" className="text-slate-600 hover:text-slate-800">About</Link>
              <div className="text-green-600 font-medium">Goods</div>
              <Link to="/projects/justice-hub" className="text-slate-600 hover:text-slate-800">JusticeHub</Link>
              <Link to="/projects/picc" className="text-slate-600 hover:text-slate-800">PICC</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Pilot Phase • Wellbeing Pillar
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6">
              Goods: <span className="text-green-600">The Great Bed</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed mb-8">
              When Elders shared their wisdom about hospital beds in listening circles, 
              a community became the innovation lab. This is the story of how relationship-first design 
              creates solutions communities can own, maintain, and teach to others.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-lg">
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">🏥</span>
                <div>
                  <div className="font-semibold text-slate-900">3 Communities</div>
                  <div className="text-slate-600 text-sm">Currently piloting</div>
                </div>
              </div>
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">🛏️</span>
                <div>
                  <div className="font-semibold text-slate-900">100% Washable</div>
                  <div className="text-slate-600 text-sm">Easy maintenance design</div>
                </div>
              </div>
              <div className="flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
                <span className="text-2xl mr-3">🎯</span>
                <div>
                  <div className="font-semibold text-slate-900">Sep 2025</div>
                  <div className="text-slate-600 text-sm">Next milestone</div>
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
                Community Wisdom Becomes <span className="text-green-600">Shared Innovation</span>
              </h2>
              
              <div className="space-y-6 text-lg text-slate-700">
                <p>
                  In listening circles, Elders didn't just identify a problem – they became the architects 
                  of the solution. Their lived experience shaped every design decision, from washability 
                  to maintenance, creating a bed communities could truly own.
                </p>
                
                <p>
                  This partnership model means communities gain not just a product, but the capability 
                  to adapt, improve, and teach the design to others. The Great Bed becomes a vehicle 
                  for community agency and knowledge sharing across networks.
                </p>
                
                <blockquote className="border-l-4 border-green-500 pl-6 italic text-green-800 bg-green-50 p-6 rounded-r-lg">
                  "We didn't just get a better bed – we gained the knowledge and networks to keep 
                  improving healthcare in our community. Now we're teaching other communities too."
                  <footer className="text-sm mt-2 text-green-700">— Elder Mary, Community Design Partner</footer>
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
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop" 
                  alt="Community design session for the Great Bed project"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-sm opacity-90">Community design session</p>
                  <p className="text-xs opacity-75">Co-designing solutions with Elders</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Seamless Media Management */}
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
              Community <span className="text-green-600">Stories in Motion</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Photos and videos owned by communities, documenting the journey from wisdom-sharing 
              to relationship-building to community-led innovation networks
            </p>
          </motion.div>

          <SeamlessMediaManager 
            projectTags={['goods', 'great-bed', 'community-media']}
            showUploader={true}
            maxItems={12}
            layout="grid"
            onMediaUpdate={(media) => {
              console.log('Media updated:', media);
            }}
          />
        </div>
      </section>

      {/* Revolutionary Product Showcase */}
      <GoodsProductShowcase />

      {/* Collaborative Partner Showcase */}
      <CollaborativePartnerShowcase />

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
                Community <span className="text-green-600">Stories</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Voices from the community sharing their experiences with the Great Bed project
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
                      <span key={tag} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
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

      {/* Impact & Next Steps */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold mb-8">Growing the Model</h2>
            
            <p className="text-xl opacity-90 max-w-4xl mx-auto mb-12">
              The success of the Great Bed has sparked interest from other communities facing similar challenges. 
              We're now exploring how this community-led design approach can address other needs - from accessible 
              housing to sustainable energy solutions.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl mb-3">🏡</div>
                <h3 className="font-semibold mb-2">Next Applications</h3>
                <p className="opacity-90">Accessible housing designs with community input</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-semibold mb-2">Energy Solutions</h3>
                <p className="opacity-90">Sustainable energy systems for remote communities</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🤝</div>
                <h3 className="font-semibold mb-2">Replicable Model</h3>
                <p className="opacity-90">Toolkit for community-led innovation</p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Link 
                to="/projects/justice-hub"
                className="inline-flex items-center bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                JusticeHub →
              </Link>
              <Link 
                to="/projects/picc"
                className="inline-flex items-center bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                PICC →
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