import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  ArrowRight, 
  Filter,
  Search,
  Heart,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image_url?: string;
  blog_category: string;
  tags: string[];
  published_at: string;
  featured: boolean;
  author_name: string;
  author_role: string;
  reading_time_minutes: number;
  view_count: number;
}

interface BlogListingProps {
  showFeaturedOnly?: boolean;
  categoryFilter?: string;
  limit?: number;
  showAsStories?: boolean; // Integrate with Stories section
}

const BlogListing: React.FC<BlogListingProps> = ({ 
  showFeaturedOnly = false,
  categoryFilter,
  limit = 10,
  showAsStories = false
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || 'all');

  const categories = [
    { value: 'all', label: 'All Stories', color: 'gray' },
    { value: 'empathy-ledger', label: 'The Empathy Ledger', color: 'emerald' },
    { value: 'community-voices', label: 'Community Voices', color: 'teal' },
    { value: 'case-studies', label: 'Case Studies', color: 'blue' },
    { value: 'platform-updates', label: 'Platform Updates', color: 'purple' },
    { value: 'reflections', label: 'Reflections', color: 'green' }
  ];

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, showFeaturedOnly]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        category: selectedCategory === 'all' ? '' : selectedCategory,
        featured_only: showFeaturedOnly.toString()
      });

      const response = await fetch(`/api/blog/posts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      // Use fallback data for development
      setPosts(getFallbackPosts());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackPosts = (): BlogPost[] => [
    {
      id: '1',
      title: 'The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change',
      slug: 'revolution-community-led-act-powering-change',
      excerpt: 'We\'ve discovered something profound in our work with grassroots communities and organisations: the ability to help them transform their knowledge, stories, and programs into living ecosystems.',
      featured_image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=400&fit=crop',
      blog_category: 'empathy-ledger',
      tags: ['community-led', 'empathy-ledger', 'grassroots', 'transformation'],
      published_at: new Date().toISOString(),
      featured: true,
      author_name: 'A Curious Tractor',
      author_role: 'Empathy Ledger Team',
      reading_time_minutes: 8,
      view_count: 234
    },
    {
      id: '2',
      title: 'Building Technology That Embodies Values: The Meta-Circularity of Empathy Ledger',
      slug: 'technology-embodies-values-meta-circularity',
      excerpt: 'How do you prove that empathy-driven technology works? You build it, use it yourself, and transform your own organisation first.',
      featured_image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
      blog_category: 'empathy-ledger',
      tags: ['technology', 'values', 'meta-circularity', 'innovation'],
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      featured: true,
      author_name: 'A Curious Tractor',
      author_role: 'Platform Architects',
      reading_time_minutes: 12,
      view_count: 456
    },
    {
      id: '3',
      title: 'From Stories to Change: How Community Voices Drive Real Impact',
      slug: 'stories-to-change-community-voices-impact',
      excerpt: 'Every story in the Empathy Ledger represents a choice: to centre community wisdom over institutional convenience.',
      blog_category: 'community-voices',
      tags: ['storytelling', 'community', 'impact', 'wisdom'],
      published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      featured: false,
      author_name: 'Community Contributors',
      author_role: 'Empathy Ledger Network',
      reading_time_minutes: 6,
      view_count: 189
    }
  ];

  const filteredPosts = posts.filter(post => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return post.title.toLowerCase().includes(searchLower) ||
             post.excerpt.toLowerCase().includes(searchLower) ||
             post.tags.some(tag => tag.toLowerCase().includes(searchLower));
    }
    return true;
  });

  const getCategoryTheme = (category: string) => {
    const categoryData = categories.find(cat => cat.value === category);
    const color = categoryData?.color || 'gray';
    
    const themes: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', hover: 'hover:bg-emerald-200' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', hover: 'hover:bg-teal-200' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', hover: 'hover:bg-blue-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hover: 'hover:bg-purple-200' },
      green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', hover: 'hover:bg-green-200' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', hover: 'hover:bg-gray-200' }
    };
    
    return themes[color];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (showAsStories) {
    // Render as part of Stories section
    return (
      <div className="space-y-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            From The Empathy Ledger
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Platform Stories</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Stories from the team building empathy-driven technology and the communities using it to create change.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.slice(0, limit).map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all group"
            >
              {post.featured_image_url && (
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={post.featured_image_url} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {post.featured && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      Featured
                    </span>
                  )}
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryTheme(post.blog_category).bg} ${getCategoryTheme(post.blog_category).text}`}>
                    {post.blog_category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-emerald-600 transition-colours">
                  {post.title}
                </h3>
                
                <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(post.published_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {post.reading_time_minutes} min
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {post.view_count}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Heart className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{post.author_name}</div>
                      <div className="text-xs text-gray-600">{post.author_role}</div>
                    </div>
                  </div>
                  
                  <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colours">
                    Read Story
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="text-center">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colours">
            <BookOpen className="w-5 h-5" />
            Read All Stories
          </button>
        </div>
      </div>
    );
  }

  // Render as standalone blog listing
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Empathy Ledger Stories</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Stories from communities using empathy-driven technology to create authentic change.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-12">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search stories, topics, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => {
            const theme = getCategoryTheme(category.value);
            const isActive = selectedCategory === category.value;
            
            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive 
                    ? `${theme.bg} ${theme.text} ${theme.border} border`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-4">Loading stories...</p>
        </div>
      )}

      {/* Posts Grid */}
      {!loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all group cursor-pointer"
            >
              {post.featured_image_url && (
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={post.featured_image_url} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {post.featured && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      Featured
                    </span>
                  )}
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryTheme(post.blog_category).bg} ${getCategoryTheme(post.blog_category).text}`}>
                    {post.blog_category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-emerald-600 transition-colours">
                  {post.title}
                </h2>
                
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(post.published_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {post.reading_time_minutes} min
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {post.view_count}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{post.author_name}</div>
                      <div className="text-xs text-gray-600">{post.author_role}</div>
                    </div>
                  </div>
                  
                  <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colours">
                    Read More
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stories found</h3>
          <p className="text-gray-600">Try adjusting your search or category filter.</p>
        </div>
      )}
    </div>
  );
};

export default BlogListing;