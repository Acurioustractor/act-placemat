# ACT Placemat - Deployment Guide

## 🔒 Security Setup (Secrets Management)

### Local Development
1. Copy `.env.example` to `.env` in project root
2. Add your API keys to `.env` (this file is gitignored)
3. Never commit `.env` files to git

### Vercel Deployment
Add these environment variables in Vercel Dashboard:

```
NOTION_TOKEN=your_notion_token
TAVILY_API_KEY=your_tavily_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key (optional)
ANTHROPIC_API_KEY=your_anthropic_key (optional)
PERPLEXITY_API_KEY=your_perplexity_key (optional)
GROQ_API_KEY=your_groq_key (optional)
```

### After Deployment
**IMPORTANT**: Since old API keys were in git history, rotate all keys:
- Regenerate Notion API token
- Regenerate Tavily API key
- Regenerate all other API keys
- Update Vercel environment variables with new keys

## 📦 Deployment Steps

### Via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Import `Acurioustractor/act-placemat`
3. Configure:
   - Root Directory: `.`
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `apps/frontend/dist`
4. Add environment variables (see above)
5. Deploy!

### Via Vercel CLI:
```bash
npm install -g vercel
cd "/Users/benknight/Code/ACT Placemat"
vercel --prod
```

## 🔄 Future Updates
After initial deployment, simply push to GitHub:
```bash
git add .
git commit -m "Your message"
git push
```

Vercel will automatically redeploy.
