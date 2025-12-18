'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';

interface Place {
  id: string;
  name: string;
  traditionalName?: string;
  westernName?: string;
  lat: number | null;
  lng: number | null;
  region?: string;
  country?: string;
  firstPeople?: string;
  protocols?: string;
  type?: string;
  relatedProjects: string[];
  notionUrl?: string;
}

interface PlacesMapProps {
  onPlaceClick?: (place: Place) => void;
  highlightedPlaceId?: string;
  className?: string;
}

// Static fallback places data - used when API is unavailable
const STATIC_PLACES: Place[] = [
  { id: "25debcf9-81cf-8059-bf2d-ec565a5847b7", name: "Bwgcolman", traditionalName: "Bwgcolman", westernName: "Palm Island", lat: -18.7544, lng: 146.5811, region: "Qld", country: "Australia", firstPeople: "Manbarra", relatedProjects: [] },
  { id: "25debcf9-81cf-8071-ad68-d605b79efe82", name: "Mbantua", traditionalName: "Mbantua", westernName: "Alice Springs", lat: -23.698, lng: 133.8807, region: "NT", country: "Australia", firstPeople: "Arrernte", relatedProjects: [] },
  { id: "25eebcf9-81cf-8037-b1b1-df6054156bc6", name: "Gulumoerrgin", traditionalName: "Gulumoerrgin", westernName: "Darwin", lat: -12.4634, lng: 130.8456, region: "NT", country: "Australia", firstPeople: "Larrakia", relatedProjects: [] },
  { id: "25febcf9-81cf-8032-9c31-ebdabc134332", name: "Jurnkkurakurr", traditionalName: "Jurnkkurakurr", westernName: "Tennant Creek", lat: -19.6497, lng: 134.1947, region: "Qld", country: "Australia", firstPeople: "Warumungu", relatedProjects: [] },
  { id: "261ebcf9-81cf-802b-b67d-e265bc71c24d", name: "Iberia", traditionalName: "Iberia", westernName: "Spain", lat: 40.42024, lng: -3.68756, region: "Overseas", country: "Overseas", firstPeople: "Iberians", relatedProjects: [] },
  { id: "262ebcf9-81cf-80ef-a463-c6d688547740", name: "Meanjin", traditionalName: "Meanjin", westernName: "Brisbane", lat: -27.4705, lng: 153.026, region: "Qld", country: "Australia", firstPeople: "Turrbal/Yuggera", relatedProjects: [] },
  { id: "267ebcf9-81cf-80d0-b74c-fa1bd6476e8b", name: "Minjerribah", traditionalName: "Minjerribah", westernName: "Stradbroke Island", lat: -27.8357175, lng: 153.4192648, region: "Qld", country: "Australia", firstPeople: "Quandamooka", relatedProjects: [] },
  { id: "267ebcf9-81cf-80f5-aa95-cb103ccba2d9", name: "Warrang", traditionalName: "Warrang", westernName: "Sydney", lat: -33.8688, lng: 151.2093, region: "NSW", country: "Australia", firstPeople: "Gadigal", relatedProjects: [] },
  { id: "269ebcf9-81cf-80cd-8156-dcc6f3bbab0d", name: "Naarm", traditionalName: "Naarm", westernName: "Melbourne", lat: -37.8136, lng: 144.9631, region: "Vic", country: "Australia", firstPeople: "Wurundjeri/Boon Wurrung", relatedProjects: [] },
  { id: "26aebcf9-81cf-8049-8dfc-da826171e14f", name: "Kamberra", traditionalName: "Kamberra", westernName: "Canberra", lat: -35.2809, lng: 149.13, region: "ACT", country: "Australia", firstPeople: "Ngunnawal", relatedProjects: [] },
  { id: "26aebcf9-81cf-8061-a66a-e3c16bca68b0", name: "Kalkadoon", traditionalName: "Kalkadoon", westernName: "Mount Isa", lat: -20.7256, lng: 139.4927, region: "Qld", country: "Australia", firstPeople: "Kalkadoon", relatedProjects: [] },
  { id: "26aebcf9-81cf-806d-bdcf-ccb3de02072f", name: "Boorloo", traditionalName: "Boorloo", westernName: "Perth", lat: -31.9505, lng: 115.8605, region: "WA", country: "Australia", firstPeople: "Whadjuk Noongar", relatedProjects: [] },
  { id: "26aebcf9-81cf-806f-8e22-e569e3511ea9", name: "Manayingkarírra", traditionalName: "Manayingkarírra", westernName: "Maningrida", lat: -12.0563, lng: 134.2342, region: "NT", country: "Australia", firstPeople: "Kunibídji", relatedProjects: [] },
  { id: "26aebcf9-81cf-80b9-85c5-dcd15b8bfd2f", name: "Gurrumbilbarra", traditionalName: "Gurrumbilbarra", westernName: "Townsville", lat: -19.259, lng: 146.8169, region: "Qld", country: "Australia", firstPeople: "Wulgurukaba or Bindal", relatedProjects: [] },
  { id: "26aebcf9-81cf-80db-b651-edcc7ddfba20", name: "Gubbi Gubbi", traditionalName: "Gubbi Gubbi", westernName: "Witta", lat: -26.5833, lng: 152.7833, region: "Qld", country: "Australia", firstPeople: "Gubbi Gubbi/Kabi Kabi", relatedProjects: [] },
  { id: "26bebcf9-81cf-80cc-9a2d-fe383c1e8874", name: "Yugambeh", traditionalName: "Yugambeh", westernName: "Gold Coast", lat: -28.0167, lng: 153.4, region: "Qld", country: "Australia", firstPeople: "Kombumerri", relatedProjects: [] },
  { id: "26bebcf9-81cf-80cd-9ff7-c4507bb4d248", name: "Albion", traditionalName: "Albion", westernName: "United Kingdom", lat: 51.50643, lng: -0.12721, region: "Overseas", country: "Overseas", firstPeople: "Priteni", relatedProjects: [] },
  { id: "26bebcf9-81cf-80f2-9029-d43c1e8a7bc7", name: "Mulubinba", traditionalName: "Mulubinba", westernName: "Newcastle", lat: -32.9283, lng: 151.7817, region: "NSW", country: "Australia", firstPeople: "Awabakal", relatedProjects: [] },
  { id: "298ebcf9-81cf-806b-98e6-f0bb49c50e72", name: "Bali", traditionalName: "Bali", westernName: "Bali", lat: -8.67325, lng: 115.20338, region: "Overseas", country: "Overseas", firstPeople: "", relatedProjects: [] },
];

// Get color for region
function getRegionColor(region?: string): string {
  switch (region) {
    case 'Qld': return '#f59e0b';
    case 'NSW': return '#3b82f6';
    case 'Vic': return '#8b5cf6';
    case 'SA': return '#ef4444';
    case 'WA': return '#22c55e';
    case 'NT': return '#f97316';
    case 'Tas': return '#06b6d4';
    case 'ACT': return '#ec4899';
    case 'Overseas': return '#6366f1';
    default: return '#59c3c3';
  }
}

export function PlacesMap({ onPlaceClick, highlightedPlaceId, className = '' }: PlacesMapProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Fetch places from API with static fallback
  useEffect(() => {
    async function fetchPlaces() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE}/api/year-in-review/places`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch places: ${response.status}`);
        }

        const data = await response.json();
        if (data.places && data.places.length > 0) {
          console.log(`Loaded ${data.places.length} places from API`);
          setPlaces(data.places);
        } else {
          throw new Error('No places in API response');
        }
      } catch (err) {
        // Use static fallback data
        console.warn('API unavailable, using static places data:', err);
        setPlaces(STATIC_PLACES);
      } finally {
        setLoading(false);
      }
    }

    fetchPlaces();
  }, []);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (places.length === 0) {
      return { lat: -25.2744, lng: 133.7751 };
    }

    const validPlaces = places.filter(p => p.lat && p.lng);
    if (validPlaces.length === 0) return { lat: -25.2744, lng: 133.7751 };

    const avgLat = validPlaces.reduce((sum, p) => sum + (p.lat || 0), 0) / validPlaces.length;
    const avgLng = validPlaces.reduce((sum, p) => sum + (p.lng || 0), 0) / validPlaces.length;

    return { lat: avgLat, lng: avgLng };
  }, [places]);

  // Initialize map with vanilla Leaflet (not react-leaflet)
  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      // Dynamically import Leaflet
      const L = (await import('leaflet')).default;

      // Add CSS if not already present
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Create map instance
      const map = L.map(mapContainerRef.current, {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: 4,
        scrollWheelZoom: true,
      });

      // Add dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers for places
      places.forEach((place) => {
        if (!place.lat || !place.lng) return;

        const color = place.id === highlightedPlaceId ? '#ffffff' : getRegionColor(place.region);
        const size = place.id === highlightedPlaceId ? 16 : 12;

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border: 2px solid ${place.id === highlightedPlaceId ? '#59c3c3' : 'rgba(255,255,255,0.8)'};
            border-radius: 50%;
            box-shadow: 0 0 ${place.id === highlightedPlaceId ? '12px' : '6px'} ${color}80;
            cursor: pointer;
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([place.lat, place.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px; max-width: 280px;">
              <h3 style="font-weight: bold; font-size: 1.1rem; margin: 0 0 4px 0; color: #1e293b;">${place.traditionalName || place.name}</h3>
              ${place.westernName && place.westernName !== place.traditionalName ? `<p style="color: #64748b; font-size: 0.875rem; margin: 0 0 8px 0; font-style: italic;">${place.westernName}</p>` : ''}
              ${place.firstPeople ? `<p style="color: #b45309; font-size: 0.875rem; margin: 0 0 8px 0;">🔥 ${place.firstPeople} Country</p>` : ''}
              ${place.region ? `<p style="color: #475569; font-size: 0.875rem; margin: 0 0 8px 0;">📍 ${place.region}${place.country === 'Overseas' ? '' : ', Australia'}</p>` : ''}
              ${place.relatedProjects.length > 0 ? `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0;"><p style="color: #0d9488; font-size: 0.875rem; font-weight: 500; margin: 0;">🔗 ${place.relatedProjects.length} project${place.relatedProjects.length !== 1 ? 's' : ''}</p></div>` : ''}
            </div>
          `);

        if (onPlaceClick) {
          marker.on('click', () => onPlaceClick(place));
        }

        markersRef.current.push(marker);
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
    }
  }, [mapCenter, places, highlightedPlaceId, onPlaceClick]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, []);

  // Initialize map when places are loaded
  useEffect(() => {
    if (!loading && places.length > 0 && !mapInstanceRef.current) {
      initMap();
    }
  }, [loading, places, initMap]);

  if (loading) {
    return (
      <div className={`bg-slate-800/30 rounded-2xl flex items-center justify-center ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading places...</p>
        </div>
      </div>
    );
  }

  if (error && places.length === 0) {
    return (
      <div className={`bg-slate-800/30 rounded-2xl flex items-center justify-center ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center text-red-400">
          <p>{error}</p>
          <p className="text-sm text-slate-500 mt-2">Check that the backend is running</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Where We&apos;ve Been</h3>
        <p className="text-slate-400 text-sm">
          {places.length} location{places.length !== 1 ? 's' : ''} across Australia and beyond
        </p>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="rounded-2xl overflow-hidden border border-slate-700/30"
        style={{ height: '500px', background: '#1e293b' }}
      />

      {/* Legend by region */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {[
          { region: 'Qld', color: '#f59e0b', label: 'Queensland' },
          { region: 'NSW', color: '#3b82f6', label: 'New South Wales' },
          { region: 'NT', color: '#f97316', label: 'Northern Territory' },
          { region: 'Vic', color: '#8b5cf6', label: 'Victoria' },
          { region: 'ACT', color: '#ec4899', label: 'ACT' },
          { region: 'WA', color: '#22c55e', label: 'Western Australia' },
          { region: 'Overseas', color: '#6366f1', label: 'Overseas' },
        ].map(({ region, color, label }) => {
          const count = places.filter(p => p.region === region).length;
          if (count === 0) return null;
          return (
            <div key={region} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
              <span>{label} ({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlacesMap;
