import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProjectShowcase from '../components/ProjectShowcase';
import InteractiveAustraliaMap from '../components/InteractiveAustraliaMap';

// Simple mock data for immediate testing
const mockData = {
  hero: {
    title: "Cultivating Relationships, Growing Agency",
    subtitle: "Where community wisdom meets organizational transformation. Connection you can feel—and fund.",
    cta1: "Explore Partnerships",
    cta2: "Grow With Us"
  },
  metrics: [
    { label: "Partnership Years", value: 47, unit: "cumulative", icon: "🤝" },
    { label: "Community Ownership", value: 85, unit: "% stories", icon: "👥" },
    { label: "Wisdom Exchanges", value: 23, unit: "cross-project", icon: "🔄" },
    { label: "Agency Growth", value: 7, unit: "self-sufficient", icon: "🌱" },
    { label: "Peer Teaching", value: 12, unit: "community-led", icon: "✨" },
    { label: "Relationship Depth", value: 320, unit: "connection hrs", icon: "💝" }
  ],
  featuredStory: {
    title: "Seeds of Change: How the Great Bed Transformed Community Care",
    excerpt: "When Elders in remote communities struggled with hospital beds that couldn't be properly cleaned, a listening circle became an innovation lab.",
    author: "Community Design Team",
    tags: ["goods", "remote-communities", "health", "elders"],
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop"
  }
};

const HomepageBeta: React.FC = () => {
  const [currentMetric, setCurrentMetric] = useState(0);
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const controls = useAnimation();

  // Animate metrics on mount
  useEffect(() => {
    const animateMetrics = async () => {
      const finalValues = mockData.metrics.map(m => m.value);
      const startValues = new Array(finalValues.length).fill(0);
      setAnimatedValues(startValues);

      // Animate each metric over 2 seconds
      const duration = 2000;
      const frames = 60;
      const interval = duration / frames;
      
      for (let frame = 0; frame <= frames; frame++) {
        const progress = frame / frames;
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        const currentValues = finalValues.map(final => Math.round(final * eased));
        setAnimatedValues(currentValues);
        
        if (frame < frames) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    };

    animateMetrics();
  }, []);

  // Cycle through metrics highlight
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetric(prev => (prev + 1) % mockData.metrics.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatValue = (value: number, unit: string) => {
    if (unit === 'AUD') {
      return `$${value.toLocaleString()}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 py-6 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🚜</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">ACT</span>
              <div className="text-xs text-gray-500 font-medium">A Curious Tractor</div>
            </div>
          </div>
          
          <div className="hidden md:flex space-x-8">
            <Link to="/about" className="text-gray-600 hover:text-green-600 transition-colors font-medium text-sm">About</Link>
            <a href="#partnerships" className="text-gray-600 hover:text-green-600 transition-colors font-medium text-sm">Partnerships</a>
            <a href="#stories" className="text-gray-600 hover:text-green-600 transition-colors font-medium text-sm">Stories</a>
            <a href="#partners" className="text-gray-600 hover:text-green-600 transition-colors font-medium text-sm">Partners</a>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
              Get Involved
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-3">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2322c55e' fill-opacity='0.05'%3E%3Cpath d='M30 30c0-8.3-6.7-15-15-15s-15 6.7-15 15 6.7 15 15 15 15-6.7 15-15zm15 0c0-8.3-6.7-15-15-15s-15 6.7-15 15 6.7 15 15 15 15-6.7 15-15z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-16">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-10"
            >
              {/* Badge */}
              <div className="inline-flex items-center space-x-3 bg-white border border-green-200 text-green-700 px-5 py-3 rounded-full text-sm font-semibold shadow-sm">
                <span>🌱</span>
                <span>Community-Led Impact</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-8">
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                  Where <span className="text-green-600">story meets system</span>
                </h1>
                
                <p className="text-lg lg:text-xl text-gray-600 leading-relaxed max-w-xl">
                  We help communities showcase real impact through authentic stories and transparent evidence—giving funders the confidence to support what actually works.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  Explore Impact Stories
                </button>
                <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200">
                  See How It Works
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center space-x-8 text-sm text-gray-500 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Community Owned</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Evidence Based</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="font-medium">Open Source</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Featured Story */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              {/* Story Card */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100/50 hover:shadow-2xl transition-all duration-300">
                {/* Story Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 text-sm font-semibold">Featured Story</span>
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                    Community Voice
                  </span>
                </div>

                {/* Story Image */}
                <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                  <div className="text-4xl">📚</div>
                </div>

                {/* Story Content */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {mockData.featuredStory.title}
                  </h2>
                  
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {mockData.featuredStory.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {mockData.featuredStory.tags.slice(0, 3).map((tag) => (
                      <span 
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Author */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">
                      By {mockData.featuredStory.author}
                    </div>
                    <div className="text-xs text-gray-400">
                      2 weeks ago
                    </div>
                  </div>

                  {/* Read More Button */}
                  <button className="w-full bg-gray-50 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm mt-4">
                    Read Full Story →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Project Showcase Section */}
      <ProjectShowcase />

      {/* Featured Stories Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Featured Stories
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real stories from communities showing how collaborative approaches create lasting change.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Breaking Down Barriers: Supporting Refugee Families",
                excerpt: "When Sarah started working with refugee families eight years ago, she thought her job was just translation. It became so much more.",
                author: "Sarah Chen",
                category: "Healthcare Access",
                readTime: "4 min read",
                image: "🏥",
                tags: ["healthcare", "refugees", "community-support"]
              },
              {
                title: "The Great Bed: Transforming Remote Care",
                excerpt: "When Elders in remote communities struggled with hospital beds that couldn't be properly cleaned, a listening circle became an innovation lab.",
                author: "Community Design Team",
                category: "Rural Innovation",
                readTime: "6 min read", 
                image: "🛏️",
                tags: ["remote-communities", "innovation", "elders"]
              },
              {
                title: "Sacred Journey: A Midwife's Calling",
                excerpt: "For fifteen years, Carla has walked alongside families during life's most profound moments, advocating for equitable care access.",
                author: "Carla Knight",
                category: "Maternal Health",
                readTime: "5 min read",
                image: "👶",
                tags: ["maternal-health", "advocacy", "rural-care"]
              }
            ].map((story, index) => (
              <motion.div
                key={story.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Story Image */}
                <div className="aspect-video bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center text-4xl">
                  {story.image}
                </div>

                {/* Story Content */}
                <div className="p-6">
                  {/* Category & Read Time */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium">
                      {story.category}
                    </span>
                    <span className="text-xs text-gray-500">{story.readTime}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 text-lg mb-3 leading-tight group-hover:text-green-600 transition-colors">
                    {story.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {story.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {story.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Author & CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      By <span className="font-medium text-gray-700">{story.author}</span>
                    </div>
                    <button className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors">
                      Read Story →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* View All Stories */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <button className="bg-gray-50 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
              Read All Stories
            </button>
          </motion.div>
        </div>
      </section>

      {/* Impact Metrics Section */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Impact at a Glance
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real evidence of community-led change. Every number represents stories, relationships, and futures transformed.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockData.metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4 text-2xl">
                  {metric.icon}
                </div>

                {/* Value */}
                <div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatValue(animatedValues[index] || 0, metric.unit)}
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">
                    {metric.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    From Empathy Ledger database
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Methodology Note */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-8 mt-16 text-center border border-gray-100/50 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-3">
              Transparent Impact Measurement
            </h3>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
              All metrics are collected with community consent and verified through multiple sources. We're committed to honest reporting that honours both successes and challenges.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Interactive Australia Map */}
      <InteractiveAustraliaMap />

      {/* Featured Projects Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Featured Projects
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Community-led initiatives showing the power of collaborative change. Each project demonstrates our seed-to-harvest approach.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Goods",
                subtitle: "The Great Bed",
                description: "Community-led design creating washable hospital beds for Elders in remote communities. When listening circles become innovation labs.",
                status: "Pilot",
                impact: "3 communities",
                color: "green",
                icon: "🛏️"
              },
              {
                name: "JusticeHub",
                subtitle: "Community Justice Platform",
                description: "Empowering communities to access justice through collaborative advocacy and transparent case management.",
                status: "Sprouting",
                impact: "8 cases supported",
                color: "blue",
                icon: "⚖️"
              },
              {
                name: "PICC",
                subtitle: "Prevention & Intervention",
                description: "Community-centred prevention programs that address root causes through evidence-based interventions.",
                status: "Growing",
                impact: "12 programs",
                color: "purple",
                icon: "🛡️"
              }
            ].map((project, index) => {
              const CardContent = (
                <motion.div
                  key={project.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl p-8 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300 group"
                >
                {/* Project Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-2xl">
                      {project.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.subtitle}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    project.color === 'green' ? 'bg-green-50 text-green-700' :
                    project.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>
                    {project.status}
                  </span>
                </div>

                {/* Project Description */}
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {project.description}
                </p>

                {/* Project Impact */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm">
                    <span className="text-gray-500">Impact:</span>
                    <span className="font-semibold text-gray-900 ml-1">{project.impact}</span>
                  </div>
                  {project.name === "Goods" ? (
                    <Link 
                      to="/projects/goods" 
                      className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      View Project →
                    </Link>
                  ) : (
                    <button className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors">
                      View Project →
                    </button>
                  )}
                </div>
              </motion.div>
              );
              
              return CardContent;
            })}
          </div>

          {/* View All Projects */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <button className="bg-gray-50 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
              View All Projects
            </button>
          </motion.div>
        </div>
      </section>

      {/* Featured Community Members Section */}
      <section className="py-24 bg-slate-50/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Community Voices
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Meet some of the incredible people at the heart of ACT's community-led change initiatives.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "Community Health Advocate",
                location: "Melbourne, VIC",
                quote: "ACT helped us show the real impact of our refugee support program through authentic storytelling.",
                image: "👩‍⚕️",
                stories: 3,
                impact: "Healthcare Access"
              },
              {
                name: "David Williams", 
                role: "Rural Innovation Coordinator",
                location: "Tennant Creek, NT",
                quote: "The bed project transformed how we approach community goods distribution in remote areas.",
                image: "👨‍🌾",
                stories: 5,
                impact: "Rural Communities"
              },
              {
                name: "Maria Santos",
                role: "Youth Program Director",
                location: "Brisbane, QLD", 
                quote: "Finally, a platform that puts community voices first and shows evidence funders can understand.",
                image: "👩‍🎓",
                stories: 4,
                impact: "Youth Development"
              }
            ].map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-8 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300"
              >
                {/* Member Avatar & Info */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-blue-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                    {member.image}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{member.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{member.role}</p>
                  <p className="text-xs text-gray-500">{member.location}</p>
                </div>

                {/* Quote */}
                <div className="mb-6">
                  <blockquote className="text-sm text-gray-700 italic leading-relaxed">
                    "{member.quote}"
                  </blockquote>
                </div>

                {/* Member Stats */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{member.stories}</span> stories shared
                  </div>
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium">
                    {member.impact}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* View All Community Members */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <button className="bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm border border-gray-200">
              Meet All Community Members
            </button>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 bg-gradient-to-br from-green-600 via-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Ready to Showcase Real Impact?
              </h2>
              <p className="text-lg text-green-100 max-w-2xl mx-auto">
                Join communities and organisations using ACT to demonstrate authentic change through story and evidence.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg">
                Subscribe to Updates
              </button>
              <button className="border border-green-400 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-500 transition-all duration-200">
                Schedule a Demo
              </button>
            </div>

            <div className="flex items-center justify-center space-x-8 text-green-200 text-sm pt-4">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full"></div>
                <span>No setup fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full"></div>
                <span>Community owned</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full"></div>
                <span>Open source</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testing Panel */}
      <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-xl p-5 border border-gray-100 max-w-xs">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h4 className="font-semibold text-gray-900 text-sm">ACT Beta</h4>
        </div>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          This homepage showcases the Budgetify-inspired design with cleaner cards, better spacing, and professional shadows.
        </p>
        <div className="flex flex-col space-y-2">
          <button className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium hover:bg-green-100 transition-colors">
            View Real Data →
          </button>
          <button className="text-xs bg-gray-50 text-gray-600 px-3 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Check Mobile
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomepageBeta;