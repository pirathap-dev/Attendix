"use client"

import { useState } from "react"
import { createLocation, deleteLocation, updateLocationStatus } from "@/actions/locations"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { LocationStatus } from "@prisma/client"
import { MapPin, Plus, Trash2, Search, Navigation } from "lucide-react"
import dynamic from "next/dynamic"

const Map = dynamic(() => import("@/components/map"), { ssr: false })

export default function LocationManager({ initialLocations }: { initialLocations: any[] }) {
  const [locations, setLocations] = useState(initialLocations)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [department, setDepartment] = useState("")
  const [radius, setRadius] = useState(50)
  const [position, setPosition] = useState<[number, number]>([51.505, -0.09])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        toast.success("Location updated to your current position")
      },
      () => toast.error("Unable to retrieve your location")
    )
  }

  const handleSearch = async () => {
    if (!searchQuery) return
    setIsSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data && data.length > 0) {
        setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        toast.success("Location found")
      } else {
        toast.error("Location not found")
      }
    } catch {
      toast.error("Search failed")
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddLocation = async () => {
    if (!name) return toast.error("Location name is required")
    setLoading(true)
    try {
      await createLocation({ name, description, department, latitude: position[0], longitude: position[1], allowedRadius: radius })
      toast.success("Location added successfully")
      setIsAddOpen(false)
      window.location.reload()
    } catch {
      toast.error("Failed to add location")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this location?")) return
    try {
      await deleteLocation(id)
      setLocations(locations.filter((l) => l.id !== id))
      toast.success("Location deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const toggleStatus = async (id: string, currentStatus: LocationStatus) => {
    const newStatus: LocationStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await updateLocationStatus(id, newStatus)
      setLocations(locations.map((l) => (l.id === id ? { ...l, status: newStatus } : l)))
      toast.success("Status updated")
    } catch {
      toast.error("Failed to update status")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Attendance Location</DialogTitle>
              <DialogDescription>
                Click anywhere on the map to set coordinates. A blue circle shows the allowed radius.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Location Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Office" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Headquarters building" />
                </div>
                <div className="space-y-1.5">
                  <Label>Department (optional)</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="All departments" />
                </div>
                <div className="space-y-1.5">
                  <Label>Allowed Radius: {radius}m</Label>
                  <Input
                    type="range"
                    min={10}
                    max={1000}
                    step={10}
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10m</span><span>1000m</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Latitude</Label>
                    <Input readOnly value={position[0].toFixed(6)} className="bg-muted font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Longitude</Label>
                    <Input readOnly value={position[1].toFixed(6)} className="bg-muted font-mono text-xs" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col h-full min-h-[400px]">
                <div className="flex gap-2 mb-3">
                  <Input 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder="Search city, address..." 
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button variant="secondary" onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? "..." : <Search className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={handleUseMyLocation} title="Use my current location">
                    <Navigation className="h-4 w-4 text-blue-500" />
                  </Button>
                </div>
                <div className="flex-1 rounded-md overflow-hidden relative">
                  <Map position={position} radius={radius} onChange={(lat, lng) => setPosition([lat, lng])} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Click on the map to pin the exact location</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddLocation} disabled={loading}>
                {loading ? "Saving…" : "Save Location"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Radius</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium">
                  {loc.name}
                  {loc.department && (
                    <div className="text-xs text-muted-foreground">{loc.department}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm font-mono text-xs">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </div>
                </TableCell>
                <TableCell>{loc.allowedRadius}m</TableCell>
                <TableCell>
                  <Badge variant={loc.status === "ACTIVE" ? "default" : "secondary"}>{loc.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(loc.id, loc.status)}>
                      {loc.status === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(loc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {locations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No locations defined yet. Add your first work location above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
