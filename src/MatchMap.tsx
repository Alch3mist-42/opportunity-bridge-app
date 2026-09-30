import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
} from "react-leaflet"
import type { Point } from "../lib/travel"
import "leaflet/dist/leaflet.css"

type Pin = {
  id: string
  name: string
  point: Point
  affordable: boolean
  outside: boolean
}
export default function MatchMap({
  center,
  radius,
  pins,
  onPick,
  onTileError,
  zoom = 11,
}: {
  center: Point
  radius: number
  pins: Pin[]
  onPick: (id: string) => void
  onTileError: () => void
  zoom?: number
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 h-80 md:h-110">
      <MapContainer
        key={`${center.lat}-${center.lng}-${zoom}`}
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
        aria-label="Map of nearby placements"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: onTileError }}
        />
        {radius > 0 && <Circle
          center={[center.lat, center.lng]}
          radius={radius * 1000}
          pathOptions={{
            color: "var(--color-green-700)",
            fillColor: "var(--color-emerald-300)",
            fillOpacity: 0.08,
            weight: 1.5,
          }}
        />}
        <Circle
          center={[center.lat, center.lng]}
          radius={700}
          pathOptions={{
            color: "var(--color-green-700)",
            fillColor: "var(--color-green-700)",
            fillOpacity: 0.23,
            weight: 0,
          }}
        />
        {pins.map((pin) => (
          <CircleMarker
            key={pin.id}
            center={[pin.point.lat, pin.point.lng]}
            radius={10}
            pathOptions={{
              color: "var(--color-white)",
              weight: 3,
              fillOpacity: 1,
              fillColor: pin.outside
                ? "var(--color-stone-400)"
                : pin.affordable
                  ? "var(--color-green-700)"
                  : "var(--color-amber-700)",
            }}
            eventHandlers={{ click: () => onPick(pin.id) }}
          >
            <Tooltip>{pin.name}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
