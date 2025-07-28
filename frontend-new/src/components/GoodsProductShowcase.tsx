import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  impactStory: string;
  features: string[];
  image_url?: string;
  media_id?: string;
  status: 'prototype' | 'testing' | 'production';
  communities_served: number;
}

export default function GoodsProductShowcase() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Default product data based on current ACT.place website
  const defaultProducts: Product[] = [
    {
      id: 'basket-bed',
      name: 'Basket Bed',
      subtitle: 'Recycled Plastic Innovation',
      description: 'A revolutionary hospital bed crafted from recycled plastic with modular design, creating dignified rest while healing our planet.',
      impactStory: 'Born from listening circles with Elders who needed beds that could be properly cleaned in remote communities. Each bed diverts 45kg of plastic waste from landfills.',
      features: [
        '100% Recycled plastic construction',
        'Modular, flat-pack design',
        'Easy to clean and maintain',
        'Built for remote community use',
        'Weather resistant materials'
      ],
      status: 'testing',
      communities_served: 3,
      image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop'
    },
    {
      id: 'weave-bed',
      name: 'Weave Bed',
      subtitle: 'Innovative Rope Fiber Construction',
      description: 'Advanced rope fiber weaving technology creates a comfortable, durable bed that honours traditional craftsmanship with modern innovation.',
      impactStory: 'Developed with community weavers, this bed combines ancestral knowledge with contemporary materials, providing employment for local artisans.',
      features: [
        'Innovative rope fiber weaving',
        'Traditional craft techniques',
        'Provides local employment',
        'Lightweight yet durable',
        'Cultural knowledge preservation'
      ],
      status: 'prototype',
      communities_served: 1,
      image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'
    },
    {
      id: 'pakkimjalki-kari-washing-machine',
      name: 'Pakkimjalki Kari',
      subtitle: 'Community Washing Solution',
      description: 'A durable, community-focused washing machine designed for shared use, built to last in challenging environments while fostering community connection.',
      impactStory: 'Named by the community, this washing machine serves multiple families, reducing individual costs while creating gathering spaces for community connection.',
      features: [
        'Built for community sharing',
        'Durable construction',
        'Low water consumption',
        'Easy maintenance design',
        'Community gathering catalyst'
      ],
      status: 'testing',
      communities_served: 2,
      image_url: 'https://images.unsplash.com/photo-1610557892229-56e72c8f3b58?w=800&h=600&fit=crop'
    }
  ];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Try to load product images from platform media system
        const response = await fetch('http://localhost:4000/api/platform/act/items?tags=goods,products');
        const data = await response.json();
        
        // Map platform media to products if available
        const updatedProducts = defaultProducts.map(product => {
          const productMedia = data.media?.find((item: any) => 
            item.manual_tags?.includes(product.id) || 
            item.title?.toLowerCase().includes(product.name.toLowerCase())
          );
          
          return {
            ...product,
            image_url: productMedia?.file_url || product.image_url,
            media_id: productMedia?.id
          };
        });
        
        setProducts(updatedProducts);
      } catch (error) {
        console.error('Error loading product media:', error);
        // Fallback to default products
        setProducts(defaultProducts);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

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
    <section className="py-20 bg-gradient-to-br from-slate-50 to-green-50/30">
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
            Goods healed by <span className="text-green-600">community</span>,<br />
            healing <span className="text-green-600">community</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
            Each product emerges from deep listening with communities, designed not just to meet needs 
            but to strengthen the social fabric that holds us together. Innovation that honours both 
            people and planet.
          </p>
        </motion.div>

        {/* Products Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group"
            >
              {/* Product Image */}
              <div className="relative overflow-hidden">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    product.status === 'production' ? 'bg-green-100 text-green-800' :
                    product.status === 'testing' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {product.status === 'production' ? 'In Production' :
                     product.status === 'testing' ? 'Community Testing' : 'Prototype'}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                  <div className="text-sm font-semibold text-slate-900">{product.communities_served}</div>
                  <div className="text-xs text-slate-600">Communities</div>
                </div>
              </div>

              {/* Product Content */}
              <div className="p-8">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{product.name}</h3>
                  <p className="text-green-600 font-medium text-sm">{product.subtitle}</p>
                </div>

                <p className="text-slate-700 mb-6 leading-relaxed">
                  {product.description}
                </p>

                {/* Impact Story */}
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Community Impact
                  </h4>
                  <p className="text-green-800 text-sm leading-relaxed">
                    {product.impactStory}
                  </p>
                </div>

                {/* Key Features */}
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 mb-3">Key Features</h4>
                  <ul className="space-y-2">
                    {product.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                  Learn More About {product.name}
                </button>
              </div>
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
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-green-100 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Products born from <span className="text-green-600">listening</span>
            </h3>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Every Goods product begins with deep listening sessions in communities. We don't impose 
              solutions—we co-create them. The result is innovation that truly serves.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Join a Listening Circle
              </button>
              <button className="border border-green-600 text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors">
                Partner with Goods
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}