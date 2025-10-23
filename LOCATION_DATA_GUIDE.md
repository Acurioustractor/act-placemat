# Location Data Guide for ACT Placemat

## Current Situation

Notion's "place" property type **is not accessible via the Notion API** - it always returns `null`. This is a known limitation documented in the Notion API reference.

## Scalable Solution

We have **two approaches** to make location data work:

---

## ✅ Approach 1: Use the Existing "Map" Property (RECOMMENDED)

Your backend is **already configured** to read from the `Map` property as a rich text field. This works!

### How to Add Location Data in Notion:

1. **Open your Places database** in Notion
2. **Click on a place record** (e.g., "Palm Island")
3. **Find the "Map" property** column
4. **Type the coordinates** in this format: `latitude,longitude`
   - Example: `-18.7544,146.5811`
   - Example: `-26.5833,152.7833`

### Why This Works:

The backend code at `apps/backend/core/src/services/notionService.js:2043` already extracts this:

```javascript
map: this.extractPlainText(page.properties.Map?.rich_text || []),
```

This means:
- ✅ **No code changes needed**
- ✅ **Already scalable** - works for all 18 places
- ✅ **Simple to maintain** - just type coordinates in Notion
- ✅ **Immediate sync** - updates within 5 minutes (cache refresh)

---

## 🔄 Approach 2: Convert Place Property to Rich Text (Alternative)

If the current "Map" property is actually a Notion "place" type (which returns null), you can convert it:

### Steps to Convert:

1. **In Notion**, open the Places database settings
2. **Click on the "Map" property settings** (gear icon)
3. **Change property type** from "Place" to "Text"
4. **Manually add coordinates** in format: `lat,lng`

**Coordinates for Australian Locations:**

```
Palm Island (Bwgcolman):     -18.7544,146.5811
Witta (Gubbi Gubbi):         -26.5833,152.7833
Brisbane (Meanjin):          -27.4705,153.0260
Mount Isa (Kalkadoon):       -20.7256,139.4927
Sydney (Warrang):            -33.8688,151.2093
Melbourne:                   -37.8136,144.9631
Darwin (Gulumoerrgin):       -12.4634,130.8456
Tennant Creek:               -19.6497,134.1947
Alice Springs (Mbantua):     -23.6980,133.8807
Perth:                       -31.9505,115.8605
Canberra:                    -35.2809,149.1300
Maningrida:                  -12.0563,134.2342
Townsville:                  -19.2590,146.8169
Newcastle:                   -32.9283,151.7817
```

---

## How the Data Flows

```
Notion Places DB
  ↓
Map property (rich text with "lat,lng")
  ↓
Backend API (/api/real/projects)
  ↓
Frontend ProjectsMap component
  ↓
Interactive Leaflet map with markers
```

---

## Testing the Solution

### 1. Add Coordinates to a Few Places:

Open Notion and add these to 3 places:
- **Bwgcolman**: `-18.7544,146.5811`
- **Gubbi Gubbi**: `-26.5833,152.7833`
- **Kalkadoon**: `-20.7256,139.4927`

### 2. Wait 5 Minutes (or restart backend):

The backend caches data for 5 minutes. Either:
- Wait 5 minutes and refresh
- OR restart: `pkill -f "node server.js" && npm run dev`

### 3. Check the Dashboard:

Visit: `http://localhost:5174/?tab=dashboard`

You should see:
- ✅ Interactive map with 3 markers
- ✅ Markers at Queensland locations
- ✅ Popups showing project details
- ✅ Clickable projects to view full details

---

## Verification Commands

### Check if coordinates are in Notion:
```bash
node check-notion-places.js
```

### Check if coordinates are in API:
```bash
curl -s http://localhost:4000/api/real/projects | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    const projects = Array.isArray(data) ? data : data.projects || [];

    projects
      .filter(p => p.relatedPlaces?.some(pl => pl.map))
      .slice(0, 5)
      .forEach(p => {
        console.log('✅', p.name);
        p.relatedPlaces.filter(pl => pl.map).forEach(place => {
          console.log('   →', place.displayName, ':', place.map);
        });
      });
  "
```

---

## Future Enhancement: Geocoding

When you're ready to scale to all places automatically, you can add a geocoding script:

```javascript
// auto-geocode-places.js
// This would:
// 1. Read all places from Notion
// 2. Use place name + state to geocode via Google Maps API
// 3. Update Map property with coordinates
// 4. Run weekly via cron job
```

---

## Current Status

- ✅ Map component: **Ready**
- ✅ Backend parsing: **Ready**
- ✅ Frontend display: **Ready**
- ⏳ Notion data: **Needs coordinates added manually**

**Next Step:** Add coordinates to 3-5 key places in Notion to see the map in action!
