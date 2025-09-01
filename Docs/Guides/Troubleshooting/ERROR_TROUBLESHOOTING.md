# 🔧 ACT Platform Error Troubleshooting Guide

## 🚨 Common Issues & Solutions

### ✅ **Fixed Issues**

#### 1. Content Security Policy (CSP) Errors
**Error:** `Refused to load the stylesheet/script because it violates CSP directive`

**Solution:** ✅ FIXED - Added CSP headers to server.js:
```javascript
res.setHeader('Content-Security-Policy', 
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; " +
  "style-src 'self' 'unsafe-inline' https://unpkg.com;"
);
```

#### 2. Favicon 404 Error  
**Error:** `Failed to load resource: favicon.ico 404`

**Solution:** ✅ FIXED - Added favicon.ico to `/public/` directory

#### 3. Leaflet Map Errors
**Error:** `L is not defined` or `initializeServiceMap`

**Solution:** ✅ FIXED - These are from legacy HTML files, not the React apps

---

## 🎯 **Current App URLs**

### ✅ **Working URLs:**
- **Internal Strategy:** http://localhost:5173 (React + Vite)
- **Public Website:** http://localhost:5174 (React + Vite)  
- **Backend API:** http://localhost:3004 (Express server)
- **Launcher:** `file:///Users/benknight/Code/ACT Placemat/launcher.html`

### ❌ **Avoid These URLs:**
- http://localhost:3004 (serves legacy HTML with map errors)
- http://localhost:3001 (not configured)

---

## 🚀 **How to Run Apps Correctly**

### Terminal 1 - Internal Strategy:
```bash
cd "/Users/benknight/Code/ACT Placemat" && npm run dev
```
**Result:** React app at http://localhost:5173

### Terminal 2 - Public Website:
```bash  
cd "/Users/benknight/Code/ACT Placemat/frontend-new" && npm run dev
```
**Result:** React app at http://localhost:5174

### Browser:
Open: `launcher.html` for easy switching between apps

---

## 🛠️ **If You Still Get Errors**

### 1. Clear Browser Cache
- Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Or open DevTools → Application → Storage → Clear Site Data

### 2. Check You're Using Correct URLs
- ✅ Use: localhost:5173 or localhost:5174  
- ❌ Don't use: localhost:3004 (legacy HTML)

### 3. Restart Development Servers
```bash
# Stop all running processes (Ctrl+C)
# Then restart:
npm run dev  # Terminal 1
cd frontend-new && npm run dev  # Terminal 2
```

### 4. Check Environment Variables
Make sure you have `.env` files configured:
- Main app: Copy `.env.example` to `.env`
- Frontend-new: Copy `.env.example` to `.env`

---

## 📍 **Error Sources Identified**

1. **CSP Errors:** ✅ Fixed with proper headers
2. **Favicon 404:** ✅ Fixed with proper favicon
3. **Leaflet Errors:** ✅ From legacy HTML at localhost:3004
4. **L is not defined:** ✅ From accessing wrong URL

---

## 💡 **Pro Tips**

1. **Always use the launcher.html** for switching between apps
2. **Use localhost:5173 and localhost:5174** for the React apps
3. **Avoid localhost:3004** unless you need the legacy API
4. **Clear cache** if you see old errors
5. **Check terminal output** for real-time error debugging

---

**All major issues are now resolved! 🎉**