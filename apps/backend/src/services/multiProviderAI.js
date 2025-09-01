/**
 * Multi-Provider AI Service
 * 
 * Intelligently selects the best available AI model from multiple providers
 * with automatic fallback and performance optimization.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class MultiProviderAI {
  constructor() {
    this.providers = this.initializeProviders();
    this.providerPriority = this.getProviderPriority();
    this.providerHealth = new Map(); // Track provider availability
    this.lastHealthCheck = new Map();
    
    console.log('🤖 Multi-Provider AI initialized with providers:', 
      Object.keys(this.providers).join(', '));
  }

  /**
   * Initialize all available AI providers
   */
  initializeProviders() {
    const providers = {};

    // 1. Anthropic Claude (highest quality)
    if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your_')) {
      providers.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // 2. OpenAI GPT (reliable)
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_')) {
      providers.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // 3. Groq (ultra fast)
    if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_')) {
      providers.groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }

    // 4. Google Gemini (high quality, free tier)
    if (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes('your_')) {
      providers.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }

    // 5. OpenRouter (model aggregator)
    if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('your_')) {
      providers.openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://act.place',
          'X-Title': 'ACT Intelligence Hub'
        }
      });
    }

    // 6. Together.AI (great value)
    if (process.env.TOGETHER_API_KEY && !process.env.TOGETHER_API_KEY.includes('your_')) {
      providers.together = new OpenAI({
        apiKey: process.env.TOGETHER_API_KEY,
        baseURL: 'https://api.together.xyz/v1',
      });
    }

    return providers;
  }

  /**
   * Define provider priority based on quality, speed, and reliability
   */
  getProviderPriority() {
    return [
      {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        timeout: 30000,
        maxTokens: 4000,
        quality: 'highest',
        cost: 'high'
      },
      {
        name: 'groq',
        model: 'llama-3.2-90b-text-preview',
        timeout: 10000,
        maxTokens: 4000,
        quality: 'high',
        cost: 'free'
      },
      {
        name: 'google',
        model: 'gemini-1.5-pro-latest',
        timeout: 20000,
        maxTokens: 4000,
        quality: 'high',
        cost: 'free'
      },
      {
        name: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        timeout: 25000,
        maxTokens: 4000,
        quality: 'highest',
        cost: 'medium'
      },
      {
        name: 'together',
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        timeout: 20000,
        maxTokens: 4000,
        quality: 'high',
        cost: 'low'
      },
      {
        name: 'openai',
        model: 'gpt-4o',
        timeout: 25000,
        maxTokens: 4000,
        quality: 'high',
        cost: 'high'
      },
      {
        name: 'ollama',
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        timeout: 15000,
        maxTokens: 4000,
        quality: 'medium',
        cost: 'free'
      }
    ];
  }

  /**
   * Health check for a specific provider
   */
  async checkProviderHealth(providerConfig) {
    const { name } = providerConfig;
    const cacheKey = `health_${name}`;
    const now = Date.now();
    
    // Use cached health status if checked recently (5 minutes)
    if (this.lastHealthCheck.has(cacheKey)) {
      const lastCheck = this.lastHealthCheck.get(cacheKey);
      if (now - lastCheck < 300000) { // 5 minutes
        return this.providerHealth.get(cacheKey) || false;
      }
    }

    try {
      // Quick health check with minimal query
      const isHealthy = await this.testProvider(providerConfig);
      this.providerHealth.set(cacheKey, isHealthy);
      this.lastHealthCheck.set(cacheKey, now);
      return isHealthy;
    } catch (error) {
      console.log(`❌ Provider ${name} health check failed:`, error.message);
      this.providerHealth.set(cacheKey, false);
      this.lastHealthCheck.set(cacheKey, now);
      return false;
    }
  }

  /**
   * Test a provider with a minimal query
   */
  async testProvider(providerConfig) {
    const { name, model, timeout } = providerConfig;
    const provider = this.providers[name];
    
    if (!provider) return false;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('HEALTH_CHECK_TIMEOUT')), 3000); // Quick 3s timeout
    });

    try {
      let testPromise;

      switch (name) {
        case 'anthropic':
          testPromise = provider.messages.create({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          });
          break;

        case 'google':
          const genModel = provider.getGenerativeModel({ model: 'gemini-1.5-flash' });
          testPromise = genModel.generateContent('Hi');
          break;

        case 'ollama':
          testPromise = fetch(`${process.env.OLLAMA_API_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              prompt: 'Hi',
              stream: false
            })
          });
          break;

        default:
          // OpenAI-compatible APIs (Groq, OpenRouter, Together, OpenAI)
          testPromise = provider.chat.completions.create({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          });
      }

      await Promise.race([testPromise, timeoutPromise]);
      console.log(`✅ Provider ${name} is healthy`);
      return true;

    } catch (error) {
      console.log(`❌ Provider ${name} health check failed:`, error.message);
      return false;
    }
  }

  /**
   * Get the best available provider for a query
   */
  async getBestProvider(options = {}) {
    const { preferSpeed = false, preferQuality = true, excludeProviders = [] } = options;

    // Filter out excluded providers
    const availableProviders = this.providerPriority.filter(
      p => !excludeProviders.includes(p.name) && this.providers[p.name]
    );

    // Sort by preference
    if (preferSpeed) {
      availableProviders.sort((a, b) => a.timeout - b.timeout);
    } else if (preferQuality) {
      const qualityOrder = { 'highest': 0, 'high': 1, 'medium': 2, 'low': 3 };
      availableProviders.sort((a, b) => qualityOrder[a.quality] - qualityOrder[b.quality]);
    }

    // Find first healthy provider
    for (const providerConfig of availableProviders) {
      const isHealthy = await this.checkProviderHealth(providerConfig);
      if (isHealthy) {
        console.log(`🎯 Selected provider: ${providerConfig.name} (${providerConfig.model})`);
        return providerConfig;
      }
    }

    throw new Error('No healthy AI providers available');
  }

  /**
   * Generate AI response with automatic provider selection and fallback
   */
  async generateResponse(prompt, options = {}) {
    const {
      systemPrompt = 'You are a helpful assistant.',
      maxTokens = 4000,
      temperature = 0.7,
      preferSpeed = false,
      preferQuality = true,
      maxRetries = 3
    } = options;

    let lastError = null;
    let attemptCount = 0;
    const excludeProviders = [];

    while (attemptCount < maxRetries) {
      try {
        const providerConfig = await this.getBestProvider({
          preferSpeed,
          preferQuality,
          excludeProviders
        });

        const result = await this.callProvider(providerConfig, {
          prompt,
          systemPrompt,
          maxTokens,
          temperature
        });

        return {
          response: result,
          provider: providerConfig.name,
          model: providerConfig.model,
          quality: providerConfig.quality,
          attemptCount: attemptCount + 1
        };

      } catch (error) {
        console.log(`❌ Attempt ${attemptCount + 1} failed:`, error.message);
        lastError = error;
        attemptCount++;

        // If this was a provider-specific error, exclude it from next attempts
        if (error.providerName) {
          excludeProviders.push(error.providerName);
        }

        // Wait briefly before retry
        if (attemptCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw new Error(`All AI providers failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Call a specific provider with the given parameters
   */
  async callProvider(providerConfig, options) {
    const { name, model, timeout } = providerConfig;
    const { prompt, systemPrompt, maxTokens, temperature } = options;
    const provider = this.providers[name];

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${name.toUpperCase()}_TIMEOUT`)), timeout);
    });

    try {
      let apiPromise;

      switch (name) {
        case 'anthropic':
          apiPromise = provider.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
          });
          break;

        case 'google':
          const genModel = provider.getGenerativeModel({ 
            model: model.includes('flash') ? 'gemini-1.5-flash' : 'gemini-1.5-pro',
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature
            }
          });
          apiPromise = genModel.generateContent(`${systemPrompt}\n\n${prompt}`);
          break;

        case 'ollama':
          apiPromise = fetch(`${process.env.OLLAMA_API_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              prompt: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
              stream: false,
              options: {
                temperature,
                num_predict: maxTokens
              }
            })
          }).then(res => res.json());
          break;

        default:
          // OpenAI-compatible APIs
          apiPromise = provider.chat.completions.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ]
          });
      }

      const response = await Promise.race([apiPromise, timeoutPromise]);
      return this.extractResponse(response, name);

    } catch (error) {
      error.providerName = name;
      throw error;
    }
  }

  /**
   * Extract response text from different provider response formats
   */
  extractResponse(response, providerName) {
    switch (providerName) {
      case 'anthropic':
        return response.content[0].text;
      
      case 'google':
        return response.response.text();
      
      case 'ollama':
        return response.response;
      
      default:
        // OpenAI-compatible format
        return response.choices[0].message.content;
    }
  }

  /**
   * Get status of all providers
   */
  async getProviderStatus() {
    const status = {};
    
    for (const config of this.providerPriority) {
      if (this.providers[config.name]) {
        const isHealthy = await this.checkProviderHealth(config);
        status[config.name] = {
          available: isHealthy,
          model: config.model,
          quality: config.quality,
          cost: config.cost
        };
      } else {
        status[config.name] = {
          available: false,
          reason: 'API key not configured'
        };
      }
    }
    
    return status;
  }
}

export default MultiProviderAI;