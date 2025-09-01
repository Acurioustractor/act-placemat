# 📸 Photo Integration - Exact Locations Guide

## 🎯 **Where to Add Your Photos**

### **📂 Step 1: Add Photos to Media Folder**
```
placemat-deployment/
├── media/
│   ├── ACT Placemat - Community Platform.jpeg (already exists)
│   ├── hero-background.jpg ← ADD YOUR MAIN HERO PHOTO HERE
│   ├── goods-manufacturing.jpg ← ADD PROJECT PHOTOS HERE
│   ├── palm-island-studios.jpg
│   ├── oonchiumpa-camping.jpg
│   ├── justicehub-platform.jpg
│   ├── contained-camps.jpg
│   ├── black-cockatoo-farm.jpg
│   ├── global-exchange.jpg
│   ├── custodian-economy.jpg
│   └── empathy-ledger.jpg
```

### **🎨 Step 2: Update CSS for Each Photo Location**

#### **1. HERO SECTION BACKGROUND** (Most Important)
**Location**: Main banner at top of page
**Current**: Uses existing ACT Placemat image
**Size**: 1920x1080px recommended

```css
/* Find this line around line 75-85 and replace: */
.hero-image {
    background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), 
                url('./media/YOUR_NEW_HERO_IMAGE.jpg');
    background-size: cover;
    background-position: center;
}
```

#### **2. PROJECT CARD BACKGROUNDS**
**Location**: Individual project cards
**Size**: 400x300px recommended

Add these CSS rules at the end of the `<style>` section:

```css
/* ACT I Project Photos */
.project-card.goods {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/goods-manufacturing.jpg');
    background-size: cover;
    background-position: center;
}

.project-card.palm-island {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/palm-island-studios.jpg');
    background-size: cover;
    background-position: center;
}

.project-card.oonchiumpa {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/oonchiumpa-camping.jpg');
    background-size: cover;
    background-position: center;
}

/* ACT II Project Photos */
.project-card.justicehub {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/justicehub-platform.jpg');
    background-size: cover;
    background-position: center;
}

.project-card.contained-camps {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/contained-camps.jpg');
    background-size: cover;
    background-position: center;
}

.project-card.black-cockatoo {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/black-cockatoo-farm.jpg');
    background-size: cover;
    background-position: center;
}

/* ACT III Project Photos */
.project-card.global-exchange {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/global-exchange.jpg');
    background-size: cover;
    background-position: center;
}

.project-card.custodian-economy {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/custodian-economy.jpg');
    background-size: cover;
    background-position: center;
}

.project-card.empathy-ledger {
    background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                url('./media/empathy-ledger.jpg');
    background-size: cover;
    background-position: center;
}
```

#### **3. ADD CLASSES TO PROJECT CARDS**
Find each project card div and add the appropriate class:

```html
<!-- ACT I Projects -->
<div class="project-card goods">
<div class="project-card palm-island">  
<div class="project-card oonchiumpa">

<!-- ACT II Projects -->
<div class="project-card justicehub">
<div class="project-card contained-camps">
<div class="project-card black-cockatoo">

<!-- ACT III Projects -->
<div class="project-card global-exchange">
<div class="project-card custodian-economy">
<div class="project-card empathy-ledger">
```

## 📷 **Photo Specifications**

### **Hero Background Photo**
- **Size**: 1920x1080px (landscape)
- **Content**: Wide shot of ACT community/Country/manufacturing
- **Style**: Dramatic, inspiring, shows scale

### **Project Card Photos** 
- **Size**: 800x600px (4:3 ratio)
- **Content**: Specific to each project
- **Style**: Action shots, people working, authentic moments

### **Photo Style Guide**

#### **Factory Records Aesthetic:**
- High contrast
- Industrial elements
- Black and white or muted colors
- Strong geometric composition

#### **Basquiat Vision:**
- Vibrant community creativity
- Street-level authenticity  
- Energy and movement
- Cultural expression

## 🛠️ **Quick Implementation**

1. **Add photos to media folder**
2. **Update hero background** (most important for immediate impact)
3. **Add project card classes and CSS**
4. **Deploy to Vercel**

The Descript video is already integrated and working! Now just add your photos to make it complete. 📸