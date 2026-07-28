"use client"

import { useState } from "react"
import { createEvent, deleteEvent } from "@/actions/events"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { AttendanceType } from "@prisma/client"
import { Plus, Trash2, QrCode } from "lucide-react"
import Link from "next/link"

interface EventManagerProps {
  initialEvents: any[]
  locations: any[]
}

export default function EventManager({ initialEvents, locations }: EventManagerProps) {
  const [events, setEvents] = useState(initialEvents)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [locationId, setLocationId] = useState("")
  const [type, setType] = useState<AttendanceType>("CHECK_IN")
  const [time, setTime] = useState("")

  const handleAddEvent = async () => {
    if (!title || !locationId || !time) return toast.error("Please fill all required fields")
    setLoading(true)
    try {
      const expectedTime = new Date()
      const [hours, minutes] = time.split(":")
      expectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      await createEvent({ title, description, locationId, attendanceType: type, expectedTime })
      toast.success("Event created successfully")
      setIsAddOpen(false)
      window.location.reload()
    } catch {
      toast.error("Failed to create event")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event? Attendance records linked to it will also be removed.")) return
    try {
      await deleteEvent(id)
      setEvents(events.filter((e) => e.id !== id))
      toast.success("Event deleted")
    } catch {
      toast.error("Failed to delete event")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Attendance Event</DialogTitle>
              <DialogDescription>
                Define a shift event (e.g., "Morning Check-In") to generate a secure QR code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Event Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning Shift Check-In" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Finance department morning attendance" />
              </div>
              <div className="space-y-1.5">
                <Label>Work Location *</Label>
                <Select value={locationId} onValueChange={(val) => { if (val) setLocationId(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={type} onValueChange={(val) => { if (val) setType(val as AttendanceType) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECK_IN">Check-In</SelectItem>
                      <SelectItem value="CHECK_OUT">Check-Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Expected Time *</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddEvent} disabled={loading}>
                {loading ? "Creating…" : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Expected Time</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>{event.location.name}</TableCell>
                <TableCell>
                  <Badge variant={event.attendanceType === "CHECK_IN" ? "default" : "secondary"}>
                    {event.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(event.expectedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell>{event.createdBy.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/events/${event.id}/qr`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" /> Show QR
                    </Link>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No events created yet. Create your first attendance event above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
