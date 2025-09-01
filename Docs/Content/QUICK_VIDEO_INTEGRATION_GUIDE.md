# 🎥 Quick Video Integration Guide

## ✅ **Updated Placemat with Hosted Video Support**

**New Live URL**: https://factory-records-basquiat-placemat-1tx04xvt6.vercel.app

## 🚀 **Super Easy Video Integration (No 5MB Limit!)**

### **Step 1: Upload Your Drone Video**

#### **Option A: Descript (Recommended)**
1. Upload your video to Descript
2. Click "Share" and copy the link
3. Your link will look like: `https://share.descript.com/view/ABC123XYZ`

#### **Option B: YouTube (Unlisted)**  
1. Upload video as "Unlisted" (not public, but accessible via link)
2. Copy video ID from URL (after `watch?v=`)
3. Your embed URL: `https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playlist=YOUR_VIDEO_ID`

#### **Option C: Vimeo**
1. Upload video with privacy settings
2. Copy video ID from URL
3. Your embed URL: `https://player.vimeo.com/video/YOUR_VIDEO_ID?autoplay=1&muted=1&loop=1&background=1&controls=0`

### **Step 2: Update the Code**
1. Open the deployed HTML file
2. Find this line around line 695:
```javascript
const videoUrl = ''; // 👆 Add your hosted video URL here
```
3. Replace with your video URL:
```javascript
const videoUrl = 'https://share.descript.com/view/YOUR_VIDEO_ID';
```

### **Step 3: Redeploy**
```bash
cd placemat-deployment
npx vercel --prod --yes
```

## 🎯 **Advantages of Hosted Video:**

### **✅ No File Size Limits**
- Upload full quality drone footage
- Platform handles compression automatically
- Multiple quality options for different devices

### **✅ Better Performance** 
- Global CDN delivery
- Mobile-optimized streaming
- Automatic quality adaptation

### **✅ Easier Management**
- Update video without redeploying
- Analytics on video views
- Easy sharing and collaboration

### **✅ Professional Features**
- Auto-loop capabilities
- Muted autoplay (mobile-friendly)
- Responsive player

## 📱 **Mobile Optimization**
- Video only plays on desktop screens (>768px width)
- Fallback to static images on mobile
- Respects user's "reduced motion" preference
- No impact on mobile loading speed

## 🛠️ **Current Implementation**
The placemat now supports:
- ✅ Descript share links
- ✅ YouTube embed URLs  
- ✅ Vimeo player URLs
- ✅ Direct CDN video URLs
- ✅ Error handling for failed video loads
- ✅ Graceful fallback if no video provided

## 🎬 **Ready for Your Drone Footage!**
Just get your Descript share link and replace the `videoUrl` variable - no file size worries, no upload headaches, just professional video background streaming!