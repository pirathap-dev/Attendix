"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Fix leafet icon issue in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface LocationPickerProps {
  position: [number, number]
  radius: number
  onChange: (lat: number, lng: number) => void
}

function LocationMarker({ position, radius, onChange }: LocationPickerProps) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(position, map.getZoom())
  }, [position, map])

  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })

  return (
    <>
      <Marker position={position} icon={icon} />
      <Circle center={position} radius={radius} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }} />
    </>
  )
}

export default function Map({ position, radius, onChange }: LocationPickerProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return <div className="h-[400px] w-full bg-muted flex items-center justify-center rounded-md">Loading Map...</div>

  return (
    <div className="h-[400px] w-full rounded-md overflow-hidden border">
      <MapContainer center={position} zoom={15} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} radius={radius} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
