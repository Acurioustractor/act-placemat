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

  // Fetch places from API
  useEffect(() => {
    async function fetchPlaces() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${API_BASE}/api/year-in-review/places`);

        if (!response.ok) {
          throw new Error(`Failed to fetch places: ${response.status}`);
        }

        const data = await response.json();
        setPlaces(data.places || []);
      } catch (err) {
        console.error('Error fetching places:', err);
        setError(err instanceof Error ? err.message : 'Failed to load places');
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

  if (error) {
    return (
      <div className={`bg-slate-800/30 rounded-2xl flex items-center justify-center ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center text-red-400">
          <p>⚠️ {error}</p>
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
