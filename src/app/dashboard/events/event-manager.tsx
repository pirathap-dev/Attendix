"use client"

import { useState } from "react"
import { createEvent, deleteEvent } from "@/actions/events"
import { getEventAttendance } from "@/actions/attendance"
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
import { Plus, Trash2, QrCode, Users, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"

interface EventManagerProps {
  initialEvents: any[]
  locations: any[]
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ON_TIME: { label: "On Time", variant: "default" },
  LATE: { label: "Late", variant: "destructive" },
  EARLY: { label: "Early", variant: "secondary" },
  OVERTIME: { label: "Overtime", variant: "outline" },
}

export default function EventManager({ initialEvents, locations }: EventManagerProps) {
  const [events, setEvents] = useState(initialEvents)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Attendance viewer state
  const [viewEvent, setViewEvent] = useState<any>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

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

  const handleViewAttendance = async (event: any) => {
    setViewEvent(event)
    setIsViewOpen(true)
    setAttendanceLoading(true)
    try {
      const records = await getEventAttendance(event.id)
      setAttendanceRecords(records)
    } catch {
      toast.error("Failed to load attendance records")
    } finally {
      setAttendanceLoading(false)
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
                Define a shift event (e.g., &quot;Morning Check-In&quot;) to generate a secure QR code.
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

      {/* Events Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Expected Time</TableHead>
              <TableHead className="hidden md:table-cell">Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">
                  {event.title}
                  <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                    {event.location.name} · {event.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{event.location.name}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={event.attendanceType === "CHECK_IN" ? "default" : "secondary"}>
                    {event.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(event.expectedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell className="hidden md:table-cell">{event.createdBy.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAttendance(event)}
                      className="gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Attendance</span>
                    </Button>
                    <Link
                      href={`/dashboard/events/${event.id}/qr`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">QR</span>
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

      {/* Attendance Records Viewer Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Attendance — {viewEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {viewEvent?.location?.name} · {viewEvent?.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No attendance recorded yet</p>
                  <p className="text-sm text-muted-foreground">Employees who scan the QR code will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pr-1">
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{attendanceRecords.filter(r => r.status === "ON_TIME").length}</p>
                    <p className="text-xs text-green-600 font-medium">On Time</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{attendanceRecords.filter(r => r.status === "LATE").length}</p>
                    <p className="text-xs text-red-600 font-medium">Late</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-700">{attendanceRecords.length}</p>
                    <p className="text-xs text-slate-600 font-medium">Total</p>
                  </div>
                </div>

                {/* Records list */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Device</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => {
                        const cfg = statusConfig[record.status] ?? { label: record.status, variant: "secondary" as const }
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="font-medium text-sm">{record.user.name}</div>
                              <div className="text-xs text-muted-foreground">{record.user.employeeId}</div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(record.actualTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {record.lateMinutes > 0 && (
                                <div className="text-xs text-red-500">+{record.lateMinutes} min late</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                              {record.device}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
