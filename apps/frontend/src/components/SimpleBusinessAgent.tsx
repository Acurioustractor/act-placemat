/**
 * Simple Business Agent - Clean, Working UI
 * 
 * Simplified version that works reliably with beautiful design
 */

import React, { useState } from 'react';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface QueryResult {
  query: string;
  response: string;
  timestamp: string;
  confidence: number;
}

export default function SimpleBusinessAgent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/v3/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResults(prev => [...prev, {
            query: queryText,
            response: data.response.content || data.response,
            timestamp: new Date().toISOString(),
            confidence: data.confidence || 0.9
          }]);
          setQuery('');
        }
      }
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQueries = [
    "What grants should I apply for?",
    "What's my BAS status?", 
    "Show me R&D tax incentive potential",
    "Which projects need attention?",
    "Find collaboration opportunities",
    "Check compliance tasks"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-clay-50 via-white to-brand-50 p-6">
      {/* Beautiful Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-ocean-500 rounded-2xl flex items-center justify-center text-white text-3xl">
              🤖
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-ocean-600 bg-clip-text text-transparent">
                ACT Business Agent v3
              </h1>
              <p className="text-clay-600 text-lg">World-class AI business intelligence for A Curious Tractor</p>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-2xl text-center">
              <div className="text-2xl font-bold text-green-600">95%</div>
              <div className="text-sm text-green-700">Compliance</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl text-center">
              <div className="text-2xl font-bold text-blue-600">$46K</div>
              <div className="text-sm text-blue-700">R&D Potential</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl text-center">
              <div className="text-2xl font-bold text-purple-600">20,398</div>
              <div className="text-sm text-purple-700">LinkedIn Network</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl text-center">
              <div className="text-2xl font-bold text-orange-600">73</div>
              <div className="text-sm text-orange-700">Projects</div>
            </div>
          </div>

          {/* Query Input */}
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything about your business...

Examples:
• What grants should I apply for?
• What's my current BAS status?
• Show me R&D tax incentive potential
• Which projects need attention?"
                className="w-full p-4 border-2 border-clay-200 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all duration-200 resize-none"
                rows={4}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-clay-500">
                Powered by Anthropic Claude • Australian business focus
              </div>
              <Button
                onClick={() => handleQuery(query)}
                disabled={!query.trim() || isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-5 h-5 mr-2" />
                    Thinking...
                  </>
                ) : (
                  '🚀 Ask AI Agent'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-4xl mx-auto mb-8">
        <h3 className="text-lg font-semibold text-clay-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickQueries.map((quickQuery, index) => (
            <button
              key={index}
              onClick={() => handleQuery(quickQuery)}
              disabled={isLoading}
              className="p-4 bg-white border-2 border-clay-200 rounded-2xl hover:border-brand-300 hover:shadow-medium hover:-translate-y-1 transition-all duration-300 text-left disabled:opacity-50"
            >
              <div className="font-medium text-clay-900 text-sm">{quickQuery}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto space-y-6">
        {results.length === 0 && !isLoading && (
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 text-center border border-clay-200">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold text-clay-900 mb-4">Ready to Help!</h3>
            <p className="text-clay-600 text-lg">
              I have access to all your business data and can help with Australian compliance, 
              grant discovery, project analysis, and contact intelligence.
            </p>
          </div>
        )}

        {results.map((result, index) => (
          <div key={index} className="space-y-4">
            {/* User Question */}
            <div className="flex justify-end">
              <div className="max-w-2xl bg-gradient-to-r from-brand-600 to-ocean-600 text-white p-6 rounded-3xl rounded-br-lg shadow-soft">
                <p className="font-medium text-lg">{result.query}</p>
              </div>
            </div>

            {/* AI Response */}
            <div className="flex justify-start">
              <div className="max-w-3xl bg-white/90 backdrop-blur-sm p-6 rounded-3xl rounded-bl-lg shadow-soft border border-clay-200">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-ocean-500 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0">
                    🤖
                  </div>
                  <div className="flex-1">
                    <div className="prose prose-clay max-w-none">
                      <p className="text-clay-800 leading-relaxed whitespace-pre-wrap text-base">
                        {result.response}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-clay-100">
                      <div className="text-sm text-clay-500">
                        Confidence: {Math.round(result.confidence * 100)}%
                      </div>
                      <div className="text-sm text-clay-400">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
