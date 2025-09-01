# ACT Placemat - Local Testing Guide

## Quick Start

```bash
# Run the simple test script
./test-local.sh
```

Then open: **http://localhost:5173**

## What You'll See

When you open the app, you'll see a **Launcher Interface** with two options:

### 1. ✅ Simple Test Mode
- Basic React app to verify your setup is working
- Shows if React, TypeScript, and build process are functioning
- Good for initial testing and troubleshooting

### 2. 🚀 Full Application  
- Complete ACT Placemat with all features
- Full routing, components, and integrations
- Use this for actual development and testing

## Testing Workflow

1. **Start with Simple Mode** first to ensure basics work
2. **Switch to Full App** when ready to test features
3. Use the **"Back to Launcher"** button anytime to switch modes

## Checking Services

### Frontend Status
```bash
curl http://localhost:5173
```

### Backend Health
```bash
curl http://localhost:4000/health
```

### View Logs
```bash
# Frontend logs
tail -f logs/frontend.log

# Backend logs  
tail -f logs/backend.log

# Both logs
tail -f logs/*.log
```

## Troubleshooting

### White Screen Issues
1. Open browser console (F12)
2. Check for red errors
3. Try Simple Test Mode first
4. Check logs/frontend.log for build errors

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti :5173 | xargs kill -9
lsof -ti :4000 | xargs kill -9
```

### Clean Restart
```bash
# Stop everything
./stop.sh

# Clean and restart
rm -rf logs/*.log
./test-local.sh
```

## Development Tips

1. **The Launcher remembers your choice** - it saves your mode preference in localStorage
2. **Error handling** - If the full app crashes, you'll see an error banner with a way back to the launcher
3. **Hot reload works** - Make changes and see them instantly
4. **Check the console** - All important logs appear in browser console

## Known Lint Issues

The app has some lint warnings that don't affect functionality:
- Unused imports (being cleaned up)
- Type annotations (being improved)
- These can be ignored for testing purposes

## Next Steps

Once running successfully:
1. Test different pages and features
2. Check the network tab for API calls
3. Verify data is loading correctly
4. Test user interactions

## Alternative Start Methods

```bash
# Standard npm scripts
npm run dev              # Both frontend and backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Docker option
npm run dev:docker

# PM2 option  
npm run dev:pm2
```

## Support

- Logs: `logs/` directory
- Console: Browser F12
- Backend health: http://localhost:4000/health
- Frontend: http://localhost:5173

---

Remember: Start simple, test incrementally, check logs when issues arise!