# ☁️ Cloud AI Setup Instructions

**Status**: ⏳ PENDING - Waiting for API keys

## Quick Start (5 minutes)

### 1. Get Groq API Key (FREE)

**Already opened in browser**: https://console.groq.com

1. Sign up / Log in with GitHub/Google
2. Go to "API Keys" section
3. Click "Create API Key"
4. Copy the key (starts with `gsk_...`)

### 2. Get Tavily API Key (FREE 1000/month)

**Already opened in browser**: https://tavily.com

1. Sign up / Log in
2. Go to API section
3. Copy your API key (starts with `tvly-...`)

### 3. Add Keys to .env File

```bash
# Open your .env file
cd /Users/benknight/Code/ACT\ Placemat/apps/backend
nano .env

# Add these lines (replace with your actual keys):
GROQ_API_KEY=gsk_your_actual_key_here
TAVILY_API_KEY=tvly_your_actual_key_here
OLLAMA_MODEL=llama3.1:8b

# Save: Ctrl+X, then Y, then Enter
```

## What You Get

### Groq (FREE, Unlimited*)
- **Model**: llama-3.2-90b-text-preview
- **Speed**: 1-2 seconds per request
- **Quality**: ⭐⭐⭐⭐ Very Good
- **Rate Limit**: 30 requests/minute (plenty for development)
- **Cost**: $0 forever

### Tavily (FREE Tier)
- **Searches**: 1000/month FREE
- **Quality**: ⭐⭐⭐⭐⭐ Excellent for research
- **Speed**: 2-3 seconds per search
- **Overage**: $0.01/search if you exceed free tier

## Testing After Setup

Once you add the keys to `.env`:

```bash
# Test cloud AI is working
curl http://localhost:4000/api/test/ai-cloud

# Test full contact enrichment
curl -X POST http://localhost:4000/api/contacts/30940/enrich \
  -H "Content-Type: application/json" \
  -d '{"mode": "cloud"}'
```

## Already Configured

✅ **Anthropic Claude** - You already have this configured
✅ **Ollama** - Running locally on port 11434
✅ **multiProviderAI.js** - Auto-fallback system ready
✅ **freeResearchAI.js** - Research service ready

## AI Mode Comparison

| Mode | Speed | Privacy | Cost | Best For |
|------|-------|---------|------|----------|
| **Cloud** | ⚡ Fast (2s) | Medium | $0 | Production, scaling |
| **Local** | 🐌 Slow (10s) | High | $0 | Development, sensitive data |
| **Hybrid** | ⚖️ Balanced (5s) | Medium-High | $0 | Best of both worlds |

## Production Deployment

When you deploy to production:

1. Same API keys work (no changes needed)
2. Add keys to your hosting platform's environment variables
3. Groq handles 1000s of users simultaneously
4. Tavily: 1000 free searches/month shared across all users

## Revenue Model

Example with 1000 users at $10/month:

- **Revenue**: $10,000/month
- **Cloud AI Cost**: $50-100/month (Groq FREE + Tavily overage)
- **Profit**: $9,900/month
- **ROI**: 100x

## Next Steps After Adding Keys

1. ✅ Add keys to `.env`
2. Test cloud AI integration
3. Update Contact Intelligence Hub to use cloud AI
4. Build user preference toggle (local vs cloud)
5. Deploy to production 🚀

---

**Once you have the keys, paste them and I'll help test the integration!**
