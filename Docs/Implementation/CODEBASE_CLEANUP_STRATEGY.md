# 🧹 CODEBASE CLEANUP STRATEGY

## 🚨 **CURRENT CHAOS AUDIT**

**TOTAL SOURCE FILES**: 2,090
- **Active Code (apps/)**: 1,278 files (61%)  
- **Archive (archive/)**: 3,529 files (169% MORE than active!)
- **Tools/Scripts**: ~300 files
- **Documentation**: ~200 files

### **PROBLEM ANALYSIS**

1. **Archive Directory is MASSIVE** - 73% more files than active code
2. **Scattered Config Files** - 8+ different tool configs at root
3. **Duplicate Functionality** - Multiple tools doing same thing
4. **No Clear Entry Points** - Hard to know where to start
5. **Mixed Concerns** - Business logic scattered everywhere

---

## 📋 **CLEANUP PHASES**

### **PHASE 1: ARCHIVE QUARANTINE** ⚠️
Move the massive archive out of main workspace:
```bash
mkdir ../ACT-Archive-Quarantine
mv archive/* ../ACT-Archive-Quarantine/
```

### **PHASE 2: CONFIG CONSOLIDATION** 🔧
Organize all the scattered config files:
```
config/
├── development/     # .env, .claude, .cursor, .husky
├── deployment/      # docker, infrastructure, k8s
├── testing/        # test configs, jest, playwright
└── tools/          # nx.json, babel.config.json
```

### **PHASE 3: SOURCE CODE ORGANIZATION** 📁
Clean structure following DDD + Nx:
```
├── apps/                    # Main applications
│   ├── platform/           # Main community platform
│   ├── mobile/             # React Native app
│   ├── desktop/           # Electron app
│   └── admin/             # Admin interface
├── packages/              # Shared packages
│   ├── ui/               # Component library
│   ├── data/            # Data layer
│   ├── business/        # Business logic
│   └── utils/           # Utilities
├── domains/              # Domain-Driven Design
│   ├── community/       
│   ├── intelligence/    
│   ├── partnerships/    
│   ├── financial/       
│   └── platform/        
└── infrastructure/       # Deployment & ops
```

### **PHASE 4: DEPENDENCY CLEANUP** 🗑️
- Consolidate multiple package.json files
- Remove duplicate dependencies
- Update to latest stable versions
- Clean unused dependencies

---

## 🎯 **IMMEDIATE ACTION PLAN**

### **Step 1: Archive Quarantine (URGENT)**
```bash
# Move archive to separate location
mkdir ../ACT-Archive-Dead-Weight
mv archive ../ACT-Archive-Dead-Weight/

# Move temp/tmp/dist to build artifacts
mkdir build-artifacts
mv temp tmp dist build-artifacts/

# Clean root directory clutter
mkdir config/legacy-configs
mv .claude .cursor .kiro .husky .secrets .taskmaster .vscode config/legacy-configs/
```

### **Step 2: Identify Core Applications**
```bash
# Count lines in each app to understand what's actually important
find apps/ -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l | sort -n
```

### **Step 3: Create Clean Structure**
```bash
# Create new organized structure
mkdir -p {src/{apps,packages,domains,services},config/{dev,prod,test},docs,infra}
```

---

## ✅ **SUCCESS CRITERIA**

1. **< 500 Total Files** in main workspace
2. **Clear Entry Points** - obvious where to start
3. **Single Source of Truth** - no duplicate configs/files
4. **Fast Development** - quick npm run dev
5. **Clean Dependencies** - single package.json with clear purposes

---

## 🚀 **POST-CLEANUP BENEFITS**

- **90% Faster IDE Performance** - Less file scanning
- **50% Faster Builds** - Less file processing  
- **75% Easier Onboarding** - Clear structure
- **Zero Configuration Confusion** - Single way to do things
- **100% Focus on Business Value** - No distraction files

---

## 🎯 **NEXT STEPS**

1. Execute archive quarantine immediately
2. Test that current functionality still works
3. Gradually migrate good code from archive if needed
4. Document the clean architecture
5. Set up automated checks to prevent chaos

**THE HOUSE MUST BE CLEAN BEFORE WE BUILD THE MANSION!**