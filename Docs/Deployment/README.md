# Deployment Documentation

This directory contains deployment guides, configuration, and production setup documentation for the ACT Placemat project.

## 📋 Deployment Guides

### Core Deployment
- **[DEPLOY_OPTIMAL_PLATFORM_ARCHITECTURE.md](./DEPLOY_OPTIMAL_PLATFORM_ARCHITECTURE.md)** - Complete deployment guide for optimal platform architecture

### Compatibility and Fixes
- **[FIXED_COMPATIBILITY_DEPLOYMENT.md](./FIXED_COMPATIBILITY_DEPLOYMENT.md)** - Compatibility fixes and deployment troubleshooting

## 🚀 Deployment Strategy

### Production Environment
- **Frontend**: Deployed separately (Vercel/Netlify recommended)
- **Backend**: API server deployment (Railway/Render recommended)
- **Database**: Supabase hosted PostgreSQL
- **Storage**: Supabase storage for media files

### Deployment Order
1. **Database Setup** - Configure Supabase database and storage
2. **Backend Deployment** - Deploy API server with environment variables
3. **Frontend Deployment** - Deploy frontend with backend API connection
4. **DNS and SSL** - Configure custom domains and SSL certificates

## 🔧 Configuration Requirements

### Environment Variables
- Notion API tokens and database IDs
- Supabase project URL and API keys
- CORS settings for frontend domains
- Storage bucket configuration

### Infrastructure Dependencies
- Node.js 14+ runtime
- PostgreSQL database (Supabase)
- File storage system (Supabase Storage)
- CDN for static assets (optional)

## 🔗 Related Documentation
- **[Architecture](../Architecture/)** - System architecture context
- **[Setup Guides](../Guides/Setup/)** - Local development setup
- **[Troubleshooting](../Guides/Troubleshooting/)** - Deployment issue resolution

## 📞 Support
For deployment issues:
1. Check **FIXED_COMPATIBILITY_DEPLOYMENT.md** for known fixes
2. Review environment variable configuration
3. Consult troubleshooting guides for common deployment errors

---

*New deployment method? Document it here and update the deployment strategy.*