"use client"

import { useState, useTransition } from "react"
import { getAttendanceReportData, AttendanceReportRow } from "@/actions/attendance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Loader2, FileSpreadsheet, FileText, RefreshCw } from "lucide-react"
import { formatMinutes } from "@/lib/attendance-calculations"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  employeeId: string
  department: string | null
}

interface ReportsClientProps {
  employees: Employee[]
}

function getMonthRange(monthStr: string): { from: Date; to: Date } {
  const [year, month] = monthStr.split("-").map(Number)
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const to = new Date(year, month, 0, 23, 59, 59, 999)
  return { from, to }
}

function getLast30DaysRange(): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

function currentMonthStr() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  return `${yyyy}-${mm}`
}

export default function ReportsClient({ employees }: ReportsClientProps) {
  const [period, setPeriod] = useState<"month" | "30days">("month")
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr())
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all")
  const [rows, setRows] = useState<AttendanceReportRow[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const buildDateRange = () => {
    if (period === "30days") return getLast30DaysRange()
    return getMonthRange(selectedMonth)
  }

  const handleLoad = () => {
    startTransition(async () => {
      try {
        const { from, to } = buildDateRange()
        const userId = selectedEmployeeId === "all" ? undefined : selectedEmployeeId
        const data = await getAttendanceReportData(from, to, userId)
        setRows(data)
        setHasLoaded(true)
        if (data.length === 0) toast.info("No attendance records found for the selected period.")
      } catch (e: any) {
        toast.error("Failed to load report data: " + e.message)
      }
    })
  }

  const downloadFile = async (type: "excel" | "pdf", employeeId?: string) => {
    const { from, to } = buildDateRange()
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      tz: tz
    })
    if (employeeId && employeeId !== "all") params.set("userId", employeeId)

    const endpoint = type === "excel" ? "/api/reports/excel" : "/api/reports/pdf"

    try {
      toast.info(`Generating ${type.toUpperCase()} report…`)
      const res = await fetch(`${endpoint}?${params.toString()}`)
      if (!res.ok) {
        const err = await res.text()
        toast.error(`Export failed: ${err}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const emp = employees.find(e => e.id === employeeId)
      const empLabel = emp ? `_${emp.employeeId}` : "_all"
      const periodLabel = period === "30days" ? "last30days" : selectedMonth
      a.download = `attendance${empLabel}_${periodLabel}.${type === "excel" ? "xlsx" : "pdf"}`

      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`${type.toUpperCase()} downloaded successfully.`)
    } catch (e: any) {
      toast.error(`Download error: ${e.message}`)
    }
  }

  // Aggregate totals for the preview
  const totalWorkedMinutes = rows.reduce((s, r) => s + r.workingMinutes, 0)
  const totalLateMinutes = rows.reduce((s, r) => s + r.lateMinutes, 0)
  const totalOvertimeMinutes = rows.reduce((s, r) => s + r.overtimeMinutes, 0)
  const uniqueEmployees = new Set(rows.map(r => r.userId)).size

  const statusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    if (status === "LATE") return "destructive"
    if (status === "OVERTIME") return "outline"
    if (status === "EARLY") return "secondary"
    return "default"
  }

  const formatTime = (d: Date | null | string) =>
    d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"

  const isIndividual = selectedEmployeeId !== "all"

  return (
    <div className="space-y-6">
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Period selector */}
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as "month" | "30days")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Specific Month</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month picker (only when period = month) */}
            {period === "month" && (
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {/* Employee filter */}
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={(v) => { if (v !== null) setSelectedEmployeeId(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleLoad} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isPending ? "Loading…" : "Load Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary totals (shown only after load) ──────────────────────── */}
      {hasLoaded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-2xl font-bold">{uniqueEmployees}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-2xl font-bold">{rows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Worked</p>
              <p className="text-2xl font-bold">{formatMinutes(totalWorkedMinutes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Late / Overtime</p>
              <p className="text-2xl font-bold">
                <span className="text-red-600">{formatMinutes(totalLateMinutes)}</span>
                {" / "}
                <span className="text-purple-600">{formatMinutes(totalOvertimeMinutes)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Export Buttons ───────────────────────────────────────────────── */}
      {hasLoaded && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => downloadFile("excel", "all")}
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Overall Excel
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => downloadFile("pdf", "all")}
              >
                <FileText className="h-4 w-4 text-red-500" />
                Overall PDF
              </Button>
              {isIndividual && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => downloadFile("excel", selectedEmployeeId)}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Individual Excel
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => downloadFile("pdf", selectedEmployeeId)}
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    Individual PDF
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Preview Table ────────────────────────────────────────────────── */}
      {hasLoaded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Preview — {rows.length} record{rows.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="hidden md:table-cell">Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Worked</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.recordId}>
                      <TableCell className="font-medium text-sm whitespace-nowrap">{row.employeeName}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{row.employeeId}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{row.department ?? "—"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-sm">{row.sessionTitle}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{row.locationName}</TableCell>
                      <TableCell className="font-mono text-xs">{formatTime(row.checkInTime)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatTime(row.checkOutTime)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {row.workingMinutes > 0 ? formatMinutes(row.workingMinutes) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.lateMinutes > 0 ? (
                          <span className="text-red-600 font-medium">{formatMinutes(row.lateMinutes)}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.overtimeMinutes > 0 ? (
                          <span className="text-purple-600 font-medium">{formatMinutes(row.overtimeMinutes)}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)} className="text-xs whitespace-nowrap">
                          {row.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                        No records found for the selected period and filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasLoaded && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground border-2 border-dashed rounded-xl">
          <Download className="h-10 w-10 opacity-30" />
          <p className="text-sm">Select filters above and click <strong>Load Preview</strong> to view attendance data.</p>
        </div>
      )}
    </div>
  )
}
