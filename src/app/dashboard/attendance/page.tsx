import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, Timer, AlertCircle, CalendarCheck, CheckCircle2, XCircle } from "lucide-react"
import { formatMinutes, formatWorkingHours } from "@/lib/attendance-calculations"
import AttendanceFilterClient from "./attendance-filter-client"
import { LocalTime } from "@/components/local-time"

export default async function MyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userId = String(session.user.id)
  const params = await searchParams
  const period = params.period ?? "month"

  // Build date range
  const now = new Date()
  let from: Date
  let to: Date = now

  if (period === "30days") {
    from = new Date(now)
    from.setDate(from.getDate() - 30)
    from.setHours(0, 0, 0, 0)
  } else {
    // Default: current month
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  }

  // Fetch all records in range
  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId,
      actualTime: { gte: from, lte: to }
    },
    include: {
      event: { select: { title: true, attendanceType: true, sessionGroupId: true, sessionDate: true } },
      location: { select: { name: true } },
    },
    orderBy: { actualTime: "desc" }
  })

  // ─── Build session pairs for display ──────────────────────────────────────
  // Group CHECK_IN and CHECK_OUT records by (sessionGroupId, date)
  interface SessionRow {
    id: string
    date: Date
    sessionTitle: string
    locationName: string
    checkIn: Date | null
    checkOut: Date | null
    workedMinutes: number
    lateMinutes: number
    overtimeMinutes: number
    checkInStatus: string | null
    checkOutStatus: string | null
    isComplete: boolean
  }

  const sessionMap = new Map<string, SessionRow>()
  const standaloneRows: SessionRow[] = []

  // First pass: group by sessionGroupId + day
  for (const r of records) {
    const dayKey = new Date(r.actualTime).toISOString().slice(0, 10)
    const groupKey = r.event.sessionGroupId
      ? `${r.event.sessionGroupId}:${dayKey}`
      : null

    if (groupKey) {
      const existing = sessionMap.get(groupKey)
      if (existing) {
        // Merge into existing row
        if (r.event.attendanceType === "CHECK_IN") {
          existing.checkIn = r.actualTime
          existing.lateMinutes += r.lateMinutes
          existing.checkInStatus = r.status
        } else {
          existing.checkOut = r.actualTime
          existing.overtimeMinutes += r.overtimeMinutes
          existing.checkOutStatus = r.status
          existing.workedMinutes = Math.round((r.workingHours ?? 0) * 60)
          existing.isComplete = true
        }
      } else {
        // New session row
        const row: SessionRow = {
          id: r.id,
          date: r.event.sessionDate ?? r.actualTime,
          sessionTitle: r.event.title.replace(" — Check-In", "").replace(" — Check-Out", ""),
          locationName: r.location.name,
          checkIn: r.event.attendanceType === "CHECK_IN" ? r.actualTime : null,
          checkOut: r.event.attendanceType === "CHECK_OUT" ? r.actualTime : null,
          workedMinutes: Math.round((r.workingHours ?? 0) * 60),
          lateMinutes: r.event.attendanceType === "CHECK_IN" ? r.lateMinutes : 0,
          overtimeMinutes: r.event.attendanceType === "CHECK_OUT" ? r.overtimeMinutes : 0,
          checkInStatus: r.event.attendanceType === "CHECK_IN" ? r.status : null,
          checkOutStatus: r.event.attendanceType === "CHECK_OUT" ? r.status : null,
          isComplete: false,
        }
        sessionMap.set(groupKey, row)
      }
    } else {
      // Standalone record (no sessionGroupId)
      standaloneRows.push({
        id: r.id,
        date: r.event.sessionDate ?? r.actualTime,
        sessionTitle: r.event.title,
        locationName: r.location.name,
        checkIn: r.event.attendanceType === "CHECK_IN" ? r.actualTime : null,
        checkOut: r.event.attendanceType === "CHECK_OUT" ? r.actualTime : null,
        workedMinutes: Math.round((r.workingHours ?? 0) * 60),
        lateMinutes: r.event.attendanceType === "CHECK_IN" ? r.lateMinutes : 0,
        overtimeMinutes: r.event.attendanceType === "CHECK_OUT" ? r.overtimeMinutes : 0,
        checkInStatus: r.event.attendanceType === "CHECK_IN" ? r.status : null,
        checkOutStatus: r.event.attendanceType === "CHECK_OUT" ? r.status : null,
        isComplete: r.event.attendanceType === "CHECK_OUT",
      })
    }
  }

  const allRows = [...Array.from(sessionMap.values()), ...standaloneRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ─── Aggregate stats ──────────────────────────────────────────────────────
  let totalWorkedMinutes = 0
  let totalOvertimeMinutes = 0
  let totalLateMinutes = 0
  let completeSessions = 0
  let incompleteSessions = 0

  for (const row of allRows) {
    totalWorkedMinutes += row.workedMinutes
    totalOvertimeMinutes += row.overtimeMinutes
    totalLateMinutes += row.lateMinutes
    if (row.isComplete) completeSessions++
    else incompleteSessions++
  }

  const formatTime = (d: Date | null) =>
    d ? <LocalTime date={d} type="time" /> : "—"

  const statusBadge = (status: string | null) => {
    if (!status) return <span className="text-muted-foreground text-xs">—</span>
    const map: Record<string, string> = {
      ON_TIME: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      LATE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      EARLY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      OVERTIME: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    }
    return (
      <Badge className={map[status] ?? ""} variant="outline">
        {status.replace("_", " ")}
      </Badge>
    )
  }

  const periodLabel = period === "30days"
    ? "Last 30 Days"
    : new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString([], { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Attendance</h2>
          <p className="text-muted-foreground">Your working hours, late arrivals, and overtime for {periodLabel}.</p>
        </div>
        {/* Period filter — client component so no page reload needed */}
        <AttendanceFilterClient currentPeriod={period} />
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Worked Hours</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatMinutes(totalWorkedMinutes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overtime</CardTitle>
            <Timer className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">{formatMinutes(totalOvertimeMinutes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Late Time</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatMinutes(totalLateMinutes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sessions</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{allRows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{completeSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Incomplete</CardTitle>
            <XCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{incompleteSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Detailed Table ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Log</CardTitle>
          <CardDescription>Your session-by-session attendance for {periodLabel}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium whitespace-nowrap text-sm">
                      <LocalTime date={row.date} type="date" />
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{row.sessionTitle}</div>
                      <div className="text-xs text-muted-foreground">{row.locationName}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatTime(row.checkIn)}
                      {row.checkInStatus && row.checkInStatus !== "ON_TIME" && (
                        <div className="mt-0.5">{statusBadge(row.checkInStatus)}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatTime(row.checkOut)}
                      {row.checkOutStatus && row.checkOutStatus !== "ON_TIME" && (
                        <div className="mt-0.5">{statusBadge(row.checkOutStatus)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {row.workedMinutes > 0 ? formatMinutes(row.workedMinutes) : "—"}
                    </TableCell>
                    <TableCell>
                      {row.lateMinutes > 0 ? (
                        <span className="text-red-600 text-xs font-medium">{formatMinutes(row.lateMinutes)}</span>
                      ) : (
                        <span className="text-green-600 text-xs">On time</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.overtimeMinutes > 0 ? (
                        <span className="text-purple-600 text-xs font-medium">{formatMinutes(row.overtimeMinutes)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.isComplete ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Complete</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Check-In Only</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {allRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      No attendance records found for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
