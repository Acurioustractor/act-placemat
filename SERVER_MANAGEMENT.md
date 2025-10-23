# ACT Intelligence Hub - Server Management

## Problem Identified

During development, **18 background Bash shells** were accidentally created, all trying to run the server simultaneously. This caused:
- Port conflicts (multiple servers competing for port 4000)
- Resource waste (duplicate Node.js processes)
- Unpredictable behavior

## Best Practice Solution

### ✅ **Proper Way to Start Server:**

1. **Open a dedicated terminal** (outside VS Code/Claude)
2. **Run the startup script:**
   ```bash
   cd "/Users/benknight/Code/ACT Placemat"
   ./start-server.sh
   ```
3. **Keep that terminal open** while developing
4. **Press Ctrl+C** to stop the server when done

### 📊 **Server Status:**

- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:5174
- **Process**: Runs in foreground (not background)

### 🔧 **If You Need to Kill Old Servers:**

```bash
killall -9 node
sleep 3
./start-server.sh
```

## What Was Built Today

✅ **Morning Brief Empty States** - Beautiful helpful messages
✅ **Data Quality Cleanup** - Filtered invalid contact names
✅ **Server Cleanup Script** - Proper startup process

## Current Status

The platform is **WORKING** despite 18 background shells. One of them is successfully serving the app on port 4000. However, **best practice** is to use the `start-server.sh` script going forward.

---

**Created:** October 6, 2025
**Purpose:** Document server management best practices
