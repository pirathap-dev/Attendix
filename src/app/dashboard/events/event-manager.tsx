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
import { Plus, Trash2, QrCode, Users, Loader2, CalendarDays, ChevronDown } from "lucide-react"
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

// Returns today's date in local YYYY-MM-DD for use as input[type=date] default
function todayLocal() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Combine a local date string (YYYY-MM-DD) and a time string (HH:MM) into a Date object.
 * The resulting Date represents midnight-of-date plus the given time, in UTC
 * so the server stores it correctly.
 */
function combineDateAndTime(dateStr: string, timeStr: string): Date {
  // Build an ISO string so the Date is treated as local time by default
  return new Date(`${dateStr}T${timeStr}:00`)
}

export default function EventManager({ initialEvents, locations }: EventManagerProps) {
  const [events, setEvents] = useState(initialEvents)

  // ── Single event form state ──────────────────────────────────────────────
  const [isSingleOpen, setIsSingleOpen] = useState(false)
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleTitle, setSingleTitle] = useState("")
  const [singleDesc, setSingleDesc] = useState("")
  const [singleLocationId, setSingleLocationId] = useState("")
  const [singleType, setSingleType] = useState<AttendanceType>("CHECK_IN")
  const [singleDate, setSingleDate] = useState(todayLocal())
  const [singleTime, setSingleTime] = useState("")

  // ── Work Session (paired) form state ────────────────────────────────────
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionTitle, setSessionTitle] = useState("")
  const [sessionDesc, setSessionDesc] = useState("")
  const [sessionLocationId, setSessionLocationId] = useState("")
  const [sessionDate, setSessionDate] = useState(todayLocal())
  const [sessionCheckInTime, setSessionCheckInTime] = useState("")
  const [sessionCheckOutTime, setSessionCheckOutTime] = useState("")

  // ── Attendance viewer state ──────────────────────────────────────────────
  const [viewEvent, setViewEvent] = useState<any>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

  // ── Single Event Handlers ────────────────────────────────────────────────
  const handleAddSingleEvent = async () => {
    if (!singleTitle || !singleLocationId || !singleTime || !singleDate) {
      return toast.error("Please fill all required fields")
    }
    setSingleLoading(true)
    try {
      const expectedTime = combineDateAndTime(singleDate, singleTime)
      await createEvent({
        title: singleTitle,
        description: singleDesc,
        locationId: singleLocationId,
        attendanceType: singleType,
        expectedTime,
        sessionDate: expectedTime,
      })
      toast.success("Event created successfully")
      setIsSingleOpen(false)
      window.location.reload()
    } catch {
      toast.error("Failed to create event")
    } finally {
      setSingleLoading(false)
    }
  }

  // ── Work Session (Paired) Handlers ───────────────────────────────────────
  const handleCreateWorkSession = async () => {
    if (!sessionTitle || !sessionLocationId || !sessionCheckInTime || !sessionCheckOutTime || !sessionDate) {
      return toast.error("Please fill all required fields")
    }
    setSessionLoading(true)
    try {
      // Generate a shared group ID for the pair
      const sessionGroupId = crypto.randomUUID()

      const checkInTime = combineDateAndTime(sessionDate, sessionCheckInTime)
      const checkOutTime = combineDateAndTime(sessionDate, sessionCheckOutTime)

      // Create CHECK_IN event
      await createEvent({
        title: `${sessionTitle} — Check-In`,
        description: sessionDesc,
        locationId: sessionLocationId,
        attendanceType: "CHECK_IN",
        expectedTime: checkInTime,
        sessionDate: checkInTime,
        sessionGroupId,
      })

      // Create CHECK_OUT event
      await createEvent({
        title: `${sessionTitle} — Check-Out`,
        description: sessionDesc,
        locationId: sessionLocationId,
        attendanceType: "CHECK_OUT",
        expectedTime: checkOutTime,
        sessionDate: checkOutTime,
        sessionGroupId,
      })

      toast.success("Work session created — both Check-In and Check-Out events are ready.")
      setIsSessionOpen(false)
      window.location.reload()
    } catch {
      toast.error("Failed to create work session")
    } finally {
      setSessionLoading(false)
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
      <div className="flex justify-end gap-2">
        {/* Work Session (Paired) Dialog */}
        <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
          <DialogTrigger>
            <Button onClick={() => setIsSessionOpen(true)}>
              <CalendarDays className="mr-2 h-4 w-4" /> Create Work Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Work Session</DialogTitle>
              <DialogDescription>
                Creates a paired Check-In and Check-Out event for the same session. You can set a future date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Session Title *</Label>
                <Input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Morning Shift"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  placeholder="Regular office attendance"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Work Location *</Label>
                <Select value={sessionLocationId} onValueChange={(val) => { if (val) setSessionLocationId(val) }}>
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
              <div className="space-y-1.5">
                <Label>Session Date *</Label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">You can set a future date to create sessions in advance.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Check-In Time *</Label>
                  <Input type="time" value={sessionCheckInTime} onChange={(e) => setSessionCheckInTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Check-Out Time *</Label>
                  <Input type="time" value={sessionCheckOutTime} onChange={(e) => setSessionCheckOutTime(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSessionOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateWorkSession} disabled={sessionLoading}>
                {sessionLoading ? "Creating…" : "Create Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Single Event Dialog */}
        <Dialog open={isSingleOpen} onOpenChange={setIsSingleOpen}>
          <DialogTrigger>
            <Button variant="outline" onClick={() => setIsSingleOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Single Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Single Event</DialogTitle>
              <DialogDescription>
                Create a standalone Check-In or Check-Out event. For paired sessions, use "Create Work Session" instead.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Event Title *</Label>
                <Input value={singleTitle} onChange={(e) => setSingleTitle(e.target.value)} placeholder="Morning Shift Check-In" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={singleDesc} onChange={(e) => setSingleDesc(e.target.value)} placeholder="Finance department morning attendance" />
              </div>
              <div className="space-y-1.5">
                <Label>Work Location *</Label>
                <Select value={singleLocationId} onValueChange={(val) => { if (val) setSingleLocationId(val) }}>
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
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={singleType} onValueChange={(val) => { if (val) setSingleType(val as AttendanceType) }}>
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
                  <Input type="time" value={singleTime} onChange={(e) => setSingleTime(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSingleOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSingleEvent} disabled={singleLoading}>
                {singleLoading ? "Creating…" : "Create Event"}
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
              <TableHead className="hidden md:table-cell">Session Date</TableHead>
              <TableHead className="hidden md:table-cell">Expected Time</TableHead>
              <TableHead className="hidden lg:table-cell">Created By</TableHead>
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
                  {event.sessionGroupId && (
                    <div className="text-xs text-blue-500 mt-0.5 font-normal">Paired session</div>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{event.location.name}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={event.attendanceType === "CHECK_IN" ? "default" : "secondary"}>
                    {event.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {event.sessionDate
                    ? new Date(event.sessionDate).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
                    : new Date(event.expectedTime).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
                  }
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(event.expectedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell className="hidden lg:table-cell">{event.createdBy.name}</TableCell>
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
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No events created yet. Use "Create Work Session" to get started.
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
              {viewEvent?.location?.name} · {viewEvent?.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"} ·{" "}
              {viewEvent?.sessionDate
                ? new Date(viewEvent.sessionDate).toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" })
                : ""}
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
                        <TableHead>Time</TableHead>
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
                              {record.overtimeMinutes > 0 && (
                                <div className="text-xs text-purple-500">+{record.overtimeMinutes} min OT</div>
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
