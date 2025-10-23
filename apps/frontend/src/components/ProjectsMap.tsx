import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface Place {
  indigenousName: string
  westernName?: string | null
  displayName: string
  map?: string | null
  state?: string | null
}

interface Project {
  id: string
  name: string
  relatedPlaces?: Place[]
  coverImage?: string
  description?: string
  aiSummary?: string
}

interface MapMarker {
  lat: number
  lng: number
  projects: Project[]
  placeName: string
}

// Component to fit bounds when markers change
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
    }
  }, [markers, map])

  return null
}

export default function ProjectsMap({
  projects,
  onProjectClick,
}: {
  projects: Project[]
  onProjectClick?: (projectId: string) => void
}) {
  const [markers, setMarkers] = useState<MapMarker[]>([])

  useEffect(() => {
    // Parse coordinates from place.map field and group projects by location
    const locationMap = new Map<string, MapMarker>()

    projects.forEach(project => {
      if (!project.relatedPlaces || project.relatedPlaces.length === 0) return

      project.relatedPlaces.forEach(place => {
        if (!place.map) return

        // Try to parse coordinates from the map field
        // Expected formats: "lat,lng" or "{lat,lng}" or various Notion formats
        const coordMatch = place.map.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
        if (!coordMatch) return

        const lat = parseFloat(coordMatch[1])
        const lng = parseFloat(coordMatch[2])

        if (isNaN(lat) || isNaN(lng)) return

        const key = `${lat},${lng}`
        const existing = locationMap.get(key)

        if (existing) {
          existing.projects.push(project)
        } else {
          locationMap.set(key, {
            lat,
            lng,
            projects: [project],
            placeName: place.displayName || place.indigenousName,
          })
        }
      })
    })

    setMarkers(Array.from(locationMap.values()))
  }, [projects])

  if (markers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-clay-500">
          No projects with location data yet. Add coordinates to place records in Notion to show them on the map.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="h-[500px] relative">
        <MapContainer
          center={markers[0] ? [markers[0].lat, markers[0].lng] : [-25.2744, 133.7751]} // Australia center
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds markers={markers} />

          {markers.map((marker, idx) => (
            <Marker key={idx} position={[marker.lat, marker.lng]}>
              <Popup maxWidth={300} className="project-popup">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-clay-900 mb-1">{marker.placeName}</h3>
                    <p className="text-xs text-clay-500">
                      {marker.projects.length} {marker.projects.length === 1 ? 'project' : 'projects'} here
                    </p>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {marker.projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => onProjectClick?.(project.id)}
                        className="w-full text-left p-3 bg-clay-50 hover:bg-brand-50 rounded-lg transition-colors group"
                      >
                        {project.coverImage && (
                          <img
                            src={project.coverImage}
                            alt={project.name}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        <h4 className="font-medium text-sm text-clay-900 group-hover:text-brand-700 mb-1">
                          {project.name}
                        </h4>
                        {(project.aiSummary || project.description) && (
                          <p className="text-xs text-clay-600 line-clamp-2">
                            {project.aiSummary || project.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="p-4 bg-clay-50 border-t border-clay-100">
        <p className="text-sm text-clay-600 text-center">
          Showing {markers.length} {markers.length === 1 ? 'location' : 'locations'} with{' '}
          {projects.filter(p => p.relatedPlaces?.some(pl => pl.map)).length} projects
        </p>
      </div>
    </div>
  )
}
