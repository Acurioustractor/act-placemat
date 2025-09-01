# 🎥 Drone Video & Photo Integration Specifications

## 🚁 Optimal Drone Video Specifications (HOSTED VIDEO APPROACH)

### **🌟 Recommended: Use Hosted Video Services**
Instead of hosting large video files directly, use these platforms for better performance:

#### **OPTION 1: Descript (Recommended)**
- **Upload your video to Descript**
- **Get shareable link**: `https://share.descript.com/view/YOUR_VIDEO_ID`
- **No file size limits** - Descript handles optimization
- **Auto-generates mobile-friendly versions**

#### **OPTION 2: YouTube (Unlisted)**  
- **Upload as unlisted video**
- **Use embed URL**: `https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1&loop=1&controls=0`
- **Automatic quality adaptation**
- **Global CDN delivery**

#### **OPTION 3: Vimeo**
- **Upload with privacy settings**  
- **Use player URL**: `https://player.vimeo.com/video/YOUR_VIDEO_ID?autoplay=1&muted=1&loop=1&background=1`
- **High quality playback**
- **No ads or branding**

### **Video Content & Style (Same as before)**
- **Optimal Duration**: 15-60 seconds (no file size restrictions with hosted video!)
- **Resolution**: Any resolution (hosting platform optimizes automatically)
- **Format**: Any format supported by hosting platform

### **Ideal Drone Shot Content**
- **Australia Country landscapes** - aerial views of red earth, vast horizons
- **Community spaces from above** - showing people gathering, working together
- **Manufacturing facilities** - aerial shots of factories, production spaces
- **Movement and flow** - slow pans, gentle movements (not jarring)
- **Natural lighting** - golden hour or soft daylight (not harsh shadows)

### **Technical Requirements**
```
Format: MP4 (H.264)
Resolution: 1920x1080 or 1280x720
Duration: 15-30 seconds
File Size: Under 5MB
Frame Rate: 24-30 FPS
Audio: None (muted autoplay)
```

## 📸 Photo Integration Locations

### **Current Integration Points**

#### **1. Hero Section Background**
- **Location**: `.hero-image` class
- **Current**: Uses ACT Placemat - Community Platform.jpeg
- **Optimal Size**: 1920x1080px
- **Purpose**: Main visual impact, behind title text

```css
.hero-image {
    background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), 
                url('./media/YOUR_HERO_IMAGE.jpg');
    background-size: cover;
    background-position: center;
}
```

#### **2. Project Card Backgrounds** 
- **Location**: `.project-card::before` hover effects
- **Size**: 400x300px (thumbnail size)
- **Purpose**: Visual context for each project

```css
.project-card {
    background-image: url('./media/project-goods-manufacturing.jpg');
    background-size: cover;
    background-position: center;
}
```

#### **3. Act Section Headers**
- **Location**: Each act header (Manufacturing, Justice, Global Exchange)
- **Size**: 1200x400px (banner style)
- **Purpose**: Visual separation between acts

### **Recommended Photo Types**

#### **ACT I: Manufacturing Pride Photos**
- **GOODS Manufacturing**: Factory floors, community members working with machinery
- **Palm Island Studios**: On-country photo studios, creative spaces
- **Oonchiumpa Camping**: Country landscapes, camping setups, community gatherings

#### **ACT II: Justice Stories Photos**
- **JusticeHub Platform**: Young people with technology, community meetings
- **Contained Camps**: Workshop spaces, officials learning (respectful documentation)
- **Black Cockatoo Valley**: Farm landscapes, restaurant spaces, regeneration activities

#### **ACT III: Global Exchange Photos**
- **Global Exchange**: Indigenous art, cultural exchanges, trading activities
- **Custodian Economy**: Traditional practices meeting modern economics
- **Storytelling Networks**: People sharing stories, community gatherings

## 🔧 How to Add Photos

### **Step 1: Prepare Photos**
```bash
# Optimize images for web
# Recommended tools: ImageOptim, Squoosh.app, or CLI tools

# Resize images to optimal dimensions
convert your-image.jpg -resize 1920x1080^ -gravity center -crop 1920x1080+0+0 hero-image-optimized.jpg

# Compress for web
jpegoptim --max=80 hero-image-optimized.jpg
```

### **Step 2: Add to Media Directory**
```bash
# Add photos to deployment media folder
cp your-photos/* /path/to/placemat-deployment/media/
```

### **Step 3: Update HTML/CSS**

#### **Hero Section**
```css
.hero-image {
    background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), 
                url('./media/act-community-aerial.jpg');
}
```

#### **Project Cards with Photos**
```css
.project-card.goods {
    background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)),
                      url('./media/goods-manufacturing.jpg');
}

.project-card.palm-island {
    background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)),
                      url('./media/palm-island-studios.jpg');
}
```

#### **Hosted Video Integration**
```javascript
// In the HTML file, find this line and replace with your hosted video URL:
const videoUrl = ''; // 👆 Add your hosted video URL here

// EXAMPLES:

// Descript:
const videoUrl = 'https://share.descript.com/view/YOUR_VIDEO_ID';

// YouTube (unlisted):  
const videoUrl = 'https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playlist=YOUR_VIDEO_ID';

// Vimeo:
const videoUrl = 'https://player.vimeo.com/video/YOUR_VIDEO_ID?autoplay=1&muted=1&loop=1&background=1&controls=0';

// Cloudinary CDN:
const videoUrl = 'https://res.cloudinary.com/YOUR_CLOUD/video/upload/YOUR_VIDEO.mp4';
```

### **Step 4: Mobile Optimization**
```css
/* Disable video on mobile for performance */
@media (max-width: 768px) {
    .video-background {
        display: none;
    }
    
    .hero-image {
        background-image: url('./media/hero-mobile-optimized.jpg');
    }
}
```

## 🎨 Photo Style Guidelines

### **Factory Records Aesthetic**
- **High contrast** black and white or muted colors
- **Industrial elements** - machinery, concrete, raw materials
- **Authentic community moments** - not posed, documentary style
- **Strong geometric composition** - architectural lines, industrial forms

### **Basquiat Vision Integration**
- **Vibrant community creativity** - art making, expressive moments
- **Street-level authenticity** - real community spaces, not polished
- **Energy and movement** - people in action, working together
- **Cultural expression** - traditional practices meeting contemporary life

## 📱 Mobile Performance Considerations

### **Image Optimization**
```html
<!-- Use responsive images -->
<picture>
  <source media="(max-width: 768px)" srcset="./media/hero-mobile-400w.jpg">
  <source media="(max-width: 1200px)" srcset="./media/hero-tablet-800w.jpg">
  <img src="./media/hero-desktop-1920w.jpg" alt="ACT Community Platform">
</picture>
```

### **Lazy Loading**
```javascript
// Images load only when visible (already implemented)
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
        }
    });
});
```

## 🚀 Current Live Deployment

**Live URL**: https://factory-records-basquiat-placemat-kh32qcvor.vercel.app

- ✅ **Mobile Optimized**: Responsive design works on all screen sizes
- ✅ **No Emojis**: Clean, professional aesthetic  
- ✅ **Video Ready**: Drone footage placeholder implemented
- ✅ **Photo Integration**: Hero image working, ready for additional photos
- ✅ **Performance Optimized**: Fast loading, lazy loading, reduced motion support

## 📋 Next Steps for Photo Integration

1. **Gather drone footage** (15-30 seconds, MP4, under 5MB)
2. **Collect project photos** following the style guidelines above
3. **Optimize images** for web (resize, compress)
4. **Add to media directory** and update CSS references
5. **Test on mobile** to ensure performance remains optimal
6. **Redeploy to Vercel** with new media assets

The placemat is now live and ready for your drone footage and photos!