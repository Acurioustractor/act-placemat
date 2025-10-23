# 🗺️ How to Add Location Data to Your Notion Places

## The Issue

Notion's "place" property type (the one with the pin icon) **cannot be read by the Notion API**. It always returns `null`. This is a known limitation.

## The Solution (3 Easy Steps)

### Step 1: Add a "Coordinates" Property in Notion

1. Open your **Places database** in Notion
2. Click the **"+" button** to add a new property (usually at the right of your columns)
3. **Name**: `Coordinates`
4. **Type**: Select **"Text"**
5. Click outside to save

### Step 2: Add Coordinates to Your Places

Copy and paste these coordinates into the `Coordinates` column for each place:

| Place Name | Indigenous Name | Coordinates |
|------------|----------------|-------------|
| Palm Island | Bwgcolman | `-18.7544,146.5811` |
| Witta | Gubbi Gubbi | `-26.5833,152.7833` |
| Mount Isa | Kalkadoon | `-20.7256,139.4927` |
| Brisbane | Meanjin | `-27.4705,153.0260` |
| Sydney | Warrang | `-33.8688,151.2093` |
| Melbourne | - | `-37.8136,144.9631` |
| Darwin | Gulumoerrgin | `-12.4634,130.8456` |
| Alice Springs | Mbantua | `-23.6980,133.8807` |
| Tennant Creek | Jurnkkurakurr | `-19.6497,134.1947` |
| Perth | - | `-31.9505,115.8605` |
| Canberra | - | `-35.2809,149.1300` |
| Maningrida | - | `-12.0563,134.2342` |
| Townsville | - | `-19.2590,146.8169` |
| Newcastle | - | `-32.9283,151.7817` |

**Format:** Always use `latitude,longitude` (negative for south/west)

### Step 3: Restart Your Backend

The backend caches data for 5 minutes. To see changes immediately:

```bash
# Kill the backend
pkill -f "node server.js"

# Start fresh
npm run dev
```

OR just wait 5 minutes for the cache to refresh automatically.

---

## Verify It's Working

### 1. Check Notion has the data:
```bash
node check-notion-places.js
```

Should show coordinates for places you added.

### 2. Check the API:
```bash
curl -s http://localhost:4000/api/real/projects | grep -A 2 "map"
```

### 3. Check the Map:
Open `http://localhost:5174/?tab=dashboard`

You should see an interactive map with markers for all projects that have places with coordinates!

---

## What Changed in the Code

The backend now reads from **both** properties:
- `Coordinates` (new rich text property) - **primary**
- `Map` (existing place property) - fallback (though it returns null)

This means:
- ✅ No breaking changes
- ✅ Backwards compatible
- ✅ Works immediately when you add coordinates
- ✅ Scales to all 18 places
- ✅ Auto-syncs to projects via existing relations

---

## Optional: Finding Coordinates for New Places

### Using Google Maps:
1. Search for the location
2. Right-click on the map
3. Click the coordinates at the top (e.g., `-18.7544, 146.5811`)
4. Paste into Notion's Coordinates field

### Using a Geocoding Service:
For bulk operations, you could use:
- Google Maps Geocoding API
- OpenStreetMap Nominatim
- MapBox Geocoding API

---

## Architecture Flow

```
┌─────────────────────────────────────────────┐
│ Notion Places Database                       │
│                                              │
│ Place Name      | Coordinates                │
│ ---------------|---------------------------- │
│ Bwgcolman      | -18.7544,146.5811          │
│ Gubbi Gubbi    | -26.5833,152.7833          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Backend API (notionService.js)               │
│ - Reads Coordinates property                 │
│ - Parses lat,lng format                      │
│ - Attaches to relatedPlaces                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ API Response (/api/real/projects)            │
│ {                                            │
│   relatedPlaces: [{                          │
│     indigenousName: "Bwgcolman",             │
│     westernName: "Palm Island",              │
│     map: "-18.7544,146.5811"                 │
│   }]                                         │
│ }                                            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Frontend (ProjectsMap.tsx)                   │
│ - Parses lat,lng strings                     │
│ - Creates Leaflet markers                    │
│ - Groups projects by location                │
│ - Shows interactive map                      │
└─────────────────────────────────────────────┘
```

---

## Next Steps

1. **Add Coordinates** to 3-5 key places in Notion (start small!)
2. **Restart backend** or wait 5 minutes
3. **Check the dashboard** - you should see the map!
4. **Add remaining places** over time as needed

The system is now fully scalable and ready to display all your community projects on an interactive map! 🎉
