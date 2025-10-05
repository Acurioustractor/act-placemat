#!/usr/bin/env node

/**
 * Test Cloud AI Integration
 * Tests Groq + Tavily + multiProviderAI
 */

import 'dotenv/config';
import { MultiProviderAI } from './core/src/services/multiProviderAI.js';
import { FreeResearchAI } from './core/src/services/freeResearchAI.js';

console.log('\n🧪 Testing Cloud AI Integration\n');

async function testGroqDirect() {
  console.log('1️⃣ Testing Groq directly...');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Groq AI is working!" in a creative way.' }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('   ✅ Groq Response:', data.choices[0].message.content);
    console.log('   ⚡ Model:', data.model);
    console.log('   📊 Tokens:', data.usage.total_tokens);
    return true;
  } catch (error) {
    console.error('   ❌ Groq test failed:', error.message);
    return false;
  }
}

async function testTavilyDirect() {
  console.log('\n2️⃣ Testing Tavily directly...');

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: 'latest news about artificial intelligence',
        search_depth: 'basic',
        max_results: 3
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('   ✅ Tavily found', data.results?.length || 0, 'results');
    if (data.results?.[0]) {
      console.log('   📰 Top result:', data.results[0].title);
      console.log('   🔗 URL:', data.results[0].url);
    }
    return true;
  } catch (error) {
    console.error('   ❌ Tavily test failed:', error.message);
    return false;
  }
}

async function testMultiProviderAI() {
  console.log('\n3️⃣ Testing multiProviderAI service...');

  try {
    const ai = new MultiProviderAI();

    const result = await ai.generateResponse(
      'What are the key benefits of using AI in business intelligence?',
      {
        systemPrompt: 'You are a business intelligence expert.',
        maxTokens: 150,
        preferSpeed: true // Should pick Groq
      }
    );

    console.log('   ✅ AI Response:', result.response.substring(0, 100) + '...');
    console.log('   🎯 Provider used:', result.provider);
    console.log('   🤖 Model:', result.model);
    console.log('   ⭐ Quality:', result.quality);
    console.log('   🔄 Attempts:', result.attemptCount);
    return true;
  } catch (error) {
    console.error('   ❌ multiProviderAI test failed:', error.message);
    return false;
  }
}

async function testFreeResearchAI() {
  console.log('\n4️⃣ Testing freeResearchAI service...');

  try {
    const researcher = new FreeResearchAI();

    const result = await researcher.research(
      'Who is the CEO of Anthropic?',
      { maxResults: 3 }
    );

    if (result.success) {
      console.log('   ✅ Research successful');
      console.log('   🔍 Search provider:', result.provider);
      console.log('   📚 Sources found:', result.sources.length);
      console.log('   🤖 AI analysis provider:', result.analysis?.provider || 'none');
      if (result.analysis?.content) {
        console.log('   📝 Analysis preview:', result.analysis.content.substring(0, 150) + '...');
      }
      return true;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('   ❌ freeResearchAI test failed:', error.message);
    return false;
  }
}

async function testProviderHealth() {
  console.log('\n5️⃣ Testing provider health status...');

  try {
    const ai = new MultiProviderAI();
    const status = await ai.getProviderStatus();

    console.log('\n   Provider Status:');
    for (const [name, info] of Object.entries(status)) {
      const icon = info.available ? '✅' : '❌';
      const details = info.available
        ? `${info.model} (${info.quality} quality, ${info.cost} cost)`
        : info.reason || 'unavailable';
      console.log(`   ${icon} ${name.padEnd(12)}: ${details}`);
    }
    return true;
  } catch (error) {
    console.error('   ❌ Health check failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const startTime = Date.now();

  const results = {
    groq: await testGroqDirect(),
    tavily: await testTavilyDirect(),
    multiProvider: await testMultiProviderAI(),
    research: await testFreeResearchAI(),
    health: await testProviderHealth()
  };

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  for (const [test, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🎯 ${passed}/${total} tests passed in ${duration}s`);
  console.log('='.repeat(50) + '\n');

  if (passed === total) {
    console.log('🎉 All cloud AI services are working perfectly!\n');
    console.log('Next steps:');
    console.log('1. Wire cloud AI into Contact Intelligence Hub');
    console.log('2. Test contact enrichment with real data');
    console.log('3. Build user preference toggle (local vs cloud)');
    console.log('4. Deploy to production 🚀\n');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
