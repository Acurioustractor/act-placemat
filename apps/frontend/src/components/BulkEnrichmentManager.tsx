/**
 * Bulk Enrichment Manager - Mass Contact Intelligence
 * 
 * Beautiful UI for managing bulk contact enrichment
 * Process all 20,398 contacts with AI analysis
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface EnrichmentStatus {
  total: number;
  enriched: number;
  remaining: number;
  progress: number;
  isRunning: boolean;
  currentBatch: number;
  enrichedCount: number;
  errorCount: number;
  estimatedTimeRemaining: number | null;
}

interface EnrichmentPreview {
  totalToEnrich: number;
  sampleContacts: Array<{
    name: string;
    company: string;
    position: string;
  }>;
  estimatedTime: number;
  estimatedCost: number;
}

export default function BulkEnrichmentManager() {
  const [status, setStatus] = useState<EnrichmentStatus | null>(null);
  const [preview, setPreview] = useState<EnrichmentPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadStatus();
    loadPreview();
    
    // Poll status every 5 seconds when running
    const interval = setInterval(() => {
      if (status?.isRunning) {
        loadStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status?.isRunning]);

  const loadStatus = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/v3/bulk/enrich/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const loadPreview = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/v3/bulk/enrich/preview');
      const data = await response.json();
      if (data.success) {
        setPreview(data.preview);
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
    }
  };

  const startEnrichment = async (options = {}) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/v3/bulk/enrich/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('✅ Bulk enrichment started');
        loadStatus();
      } else {
        console.error('❌ Failed to start enrichment:', data.error);
      }
    } catch (error) {
      console.error('❌ Start enrichment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopEnrichment = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/v3/bulk/enrich/stop', {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('🛑 Bulk enrichment stopped');
        loadStatus();
      }
    } catch (error) {
      console.error('❌ Stop enrichment error:', error);
    }
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return 'Unknown';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clay-50 via-white to-brand-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-ocean-500 rounded-2xl flex items-center justify-center text-white text-3xl">
              🔄
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-ocean-600 bg-clip-text text-transparent">
                Bulk Contact Enrichment
              </h1>
              <p className="text-clay-600 text-lg">AI-powered mass intelligence for your 20,398 contact network</p>
            </div>
          </div>

          {/* Current Status */}
          {status && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-2xl text-center">
                <div className="text-2xl font-bold text-blue-600">{status.total.toLocaleString()}</div>
                <div className="text-sm text-blue-700">Total Contacts</div>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl text-center">
                <div className="text-2xl font-bold text-green-600">{status.enriched.toLocaleString()}</div>
                <div className="text-sm text-green-700">Enriched</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl text-center">
                <div className="text-2xl font-bold text-orange-600">{status.remaining.toLocaleString()}</div>
                <div className="text-sm text-orange-700">Remaining</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-2xl text-center">
                <div className="text-2xl font-bold text-purple-600">{status.progress}%</div>
                <div className="text-sm text-purple-700">Complete</div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Section */}
        {status && (
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
            <h2 className="text-2xl font-bold text-clay-900 mb-6">Enrichment Progress</h2>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-clay-600 mb-2">
                <span>Progress: {status.enriched.toLocaleString()} / {status.total.toLocaleString()}</span>
                <span>{status.progress}% Complete</span>
              </div>
              <div className="w-full bg-clay-200 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-brand-500 to-ocean-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${status.progress}%` }}
                >
                  {status.progress > 10 && (
                    <span className="text-white text-xs font-bold">{status.progress}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-clay-900">Current Status</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${status.isRunning ? 'text-green-600' : 'text-clay-600'}`}>
                      {status.isRunning ? '🔄 Running' : '⏸️ Stopped'}
                    </span>
                  </div>
                  {status.isRunning && (
                    <>
                      <div className="flex justify-between">
                        <span>Current Batch:</span>
                        <span className="font-medium">{status.currentBatch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ETA:</span>
                        <span className="font-medium">{formatTime(status.estimatedTimeRemaining)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-clay-900">Results</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Enriched:</span>
                    <span className="font-medium text-green-600">{status.enrichedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Errors:</span>
                    <span className="font-medium text-red-600">{status.errorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">
                      {status.enrichedCount + status.errorCount > 0 
                        ? Math.round((status.enrichedCount / (status.enrichedCount + status.errorCount)) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-clay-900">Performance</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="font-medium">~5 contacts/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-medium text-green-600">$0 (FREE)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <span className="font-medium">AI-Powered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mt-6">
              {status.isRunning ? (
                <Button onClick={stopEnrichment} variant="outline" size="lg">
                  🛑 Stop Enrichment
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => startEnrichment({ batchSize: 10, delayMs: 2000, priorityFirst: true })}
                    disabled={isLoading || status.remaining === 0}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner className="w-5 h-5 mr-2" />
                        Starting...
                      </>
                    ) : (
                      `🚀 Start Enrichment (${status.remaining.toLocaleString()} contacts)`
                    )}
                  </Button>
                  <Button 
                    onClick={() => setShowPreview(!showPreview)}
                    variant="outline" 
                    size="lg"
                  >
                    👁️ Preview Job
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && preview && (
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
            <h2 className="text-2xl font-bold text-clay-900 mb-6">Enrichment Preview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-clay-900 mb-4">Job Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3 bg-clay-50 rounded-xl">
                    <span>Contacts to Enrich:</span>
                    <span className="font-bold text-brand-600">{preview.totalToEnrich.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-clay-50 rounded-xl">
                    <span>Estimated Time:</span>
                    <span className="font-bold text-blue-600">{formatTime(preview.estimatedTime)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-clay-50 rounded-xl">
                    <span>Estimated Cost:</span>
                    <span className="font-bold text-green-600">FREE</span>
                  </div>
                  <div className="flex justify-between p-3 bg-clay-50 rounded-xl">
                    <span>AI Model:</span>
                    <span className="font-bold text-purple-600">Claude Haiku</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-clay-900 mb-4">Sample Contacts</h3>
                <div className="space-y-2">
                  {preview.sampleContacts.slice(0, 5).map((contact, index) => (
                    <div key={index} className="p-3 bg-clay-50 rounded-xl">
                      <div className="font-medium text-clay-900">{contact.name}</div>
                      <div className="text-sm text-clay-600">{contact.position}</div>
                      <div className="text-sm text-clay-500">{contact.company}</div>
                    </div>
                  ))}
                  {preview.sampleContacts.length > 5 && (
                    <div className="text-center text-sm text-clay-500 py-2">
                      ...and {preview.sampleContacts.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-2">What Will Be Enriched:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Email address discovery and validation</li>
                <li>• Collaboration potential scoring (0-100)</li>
                <li>• Project alignment analysis</li>
                <li>• Outreach strategy recommendations</li>
                <li>• Risk factor identification</li>
                <li>• Value proposition development</li>
              </ul>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
          <h2 className="text-2xl font-bold text-clay-900 mb-6">🎯 How Bulk Enrichment Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-clay-900 mb-4">Process Overview</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <div className="font-medium">Smart Prioritization</div>
                    <div className="text-sm text-clay-600">High-value contacts enriched first</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <div className="font-medium">Batch Processing</div>
                    <div className="text-sm text-clay-600">10 contacts per batch with 2s delays</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <div className="font-medium">AI Analysis</div>
                    <div className="text-sm text-clay-600">Claude Haiku provides intelligent insights</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <div className="font-medium">Database Storage</div>
                    <div className="text-sm text-clay-600">Results saved for instant access</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-clay-900 mb-4">Benefits</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-clay-700">Email discovery for 20,398 contacts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-clay-700">Collaboration scoring for all contacts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-clay-700">Project alignment analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-clay-700">Outreach strategies for each contact</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-clay-700">FREE processing (no AI costs)</span>
                </div>
              </div>
            </div>
          </div>

          {status?.progress === 100 && (
            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <div className="font-semibold text-green-900">Enrichment Complete!</div>
                  <div className="text-sm text-green-700">
                    All {status.enriched.toLocaleString()} contacts have been enriched with AI intelligence.
                    Your CRM now has complete contact intelligence for your entire network!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
          <h2 className="text-2xl font-bold text-clay-900 mb-6">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => startEnrichment({ batchSize: 5, delayMs: 3000, priorityFirst: true })}
              disabled={isLoading || status?.isRunning}
              className="h-20 flex-col"
            >
              <div className="text-2xl mb-1">🐌</div>
              <div>Slow & Safe</div>
              <div className="text-xs opacity-75">5 per batch, 3s delay</div>
            </Button>
            
            <Button
              onClick={() => startEnrichment({ batchSize: 10, delayMs: 2000, priorityFirst: true })}
              disabled={isLoading || status?.isRunning}
              className="h-20 flex-col"
            >
              <div className="text-2xl mb-1">⚡</div>
              <div>Balanced</div>
              <div className="text-xs opacity-75">10 per batch, 2s delay</div>
            </Button>
            
            <Button
              onClick={() => startEnrichment({ batchSize: 20, delayMs: 1000, priorityFirst: true })}
              disabled={isLoading || status?.isRunning}
              variant="outline"
              className="h-20 flex-col"
            >
              <div className="text-2xl mb-1">🚀</div>
              <div>Fast</div>
              <div className="text-xs opacity-75">20 per batch, 1s delay</div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
