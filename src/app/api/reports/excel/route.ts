import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"
import { formatMinutes } from "@/lib/attendance-calculations"

export async function GET(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // ── Query params ──────────────────────────────────────────────────────
    const { searchParams } = req.nextUrl
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")
    const filterUserId = searchParams.get("userId") || undefined

    if (!fromStr || !toStr) {
      return new NextResponse("Missing from/to parameters", { status: 400 })
    }

    const from = new Date(fromStr)
    const to = new Date(toStr)

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return new NextResponse("Invalid date parameters", { status: 400 })
    }

    // ── Fetch org settings ────────────────────────────────────────────────
    const orgSettings = await prisma.organizationSettings.findFirst()
    const orgName = orgSettings?.name ?? "Organization"

    // ── Fetch attendance data ─────────────────────────────────────────────
    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...(filterUserId ? { userId: filterUserId } : {}),
        actualTime: { gte: from, lte: to }
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true, department: true, position: true } },
        event: { select: { title: true, attendanceType: true, sessionGroupId: true, sessionDate: true, expectedTime: true } },
        location: { select: { name: true } }
      },
      orderBy: [{ user: { name: "asc" } }, { actualTime: "asc" }]
    })

    // ── Build session-paired rows ─────────────────────────────────────────
    interface ReportRow {
      employeeName: string
      employeeId: string
      department: string
      position: string
      date: Date
      sessionTitle: string
      location: string
      checkIn: Date | null
      checkOut: Date | null
      workedMinutes: number
      lateMinutes: number
      overtimeMinutes: number
      status: string
    }

    // Build CHECK_IN map by userId + sessionGroupId + day
    const checkInMap = new Map<string, (typeof records)[0]>()
    for (const r of records) {
      if (r.event.attendanceType === "CHECK_IN" && r.event.sessionGroupId) {
        const day = new Date(r.actualTime).toISOString().slice(0, 10)
        checkInMap.set(`${r.userId}:${r.event.sessionGroupId}:${day}`, r)
      }
    }

    const rows: ReportRow[] = []
    const processedPairs = new Set<string>()

    for (const r of records) {
      const day = new Date(r.actualTime).toISOString().slice(0, 10)
      if (r.event.attendanceType === "CHECK_IN") {
        // Check if paired checkout exists
        let checkOut: Date | null = null
        let workedMinutes = 0
        let overtimeMinutes = 0

        if (r.event.sessionGroupId) {
          const pairedOut = records.find(
            o =>
              o.event.attendanceType === "CHECK_OUT" &&
              o.event.sessionGroupId === r.event.sessionGroupId &&
              o.userId === r.userId &&
              new Date(o.actualTime).toISOString().slice(0, 10) === day
          )
          if (pairedOut) {
            checkOut = pairedOut.actualTime
            workedMinutes = Math.round((pairedOut.workingHours ?? 0) * 60)
            overtimeMinutes = pairedOut.overtimeMinutes
            // Mark pair as processed so we skip the CHECK_OUT row
            processedPairs.add(`${r.userId}:${r.event.sessionGroupId}:${day}:OUT`)
          }
        }

        rows.push({
          employeeName: r.user.name,
          employeeId: r.user.employeeId,
          department: r.user.department ?? "—",
          position: r.user.position ?? "—",
          date: r.event.sessionDate ?? r.actualTime,
          sessionTitle: r.event.title.replace(" — Check-In", "").replace(" — Check-Out", ""),
          location: r.location.name,
          checkIn: r.actualTime,
          checkOut,
          workedMinutes,
          lateMinutes: r.lateMinutes,
          overtimeMinutes,
          status: r.status,
        })
      } else {
        // CHECK_OUT — only emit if not already paired with a CHECK_IN
        const pairKey = r.event.sessionGroupId
          ? `${r.userId}:${r.event.sessionGroupId}:${day}:OUT`
          : null
        if (pairKey && processedPairs.has(pairKey)) continue

        // Orphaned CHECK_OUT
        rows.push({
          employeeName: r.user.name,
          employeeId: r.user.employeeId,
          department: r.user.department ?? "—",
          position: r.user.position ?? "—",
          date: r.event.sessionDate ?? r.actualTime,
          sessionTitle: r.event.title.replace(" — Check-Out", ""),
          location: r.location.name,
          checkIn: null,
          checkOut: r.actualTime,
          workedMinutes: Math.round((r.workingHours ?? 0) * 60),
          lateMinutes: 0,
          overtimeMinutes: r.overtimeMinutes,
          status: r.status,
        })
      }
    }

    // ── Build Excel ───────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Attendix"
    workbook.created = new Date()

    const formatTime = (d: Date | null) =>
      d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"

    const formatDate = (d: Date) =>
      new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

    // ── Sheet 1: Report Header ────────────────────────────────────────────
    const coverSheet = workbook.addWorksheet("Report Info")
    coverSheet.getColumn("A").width = 30
    coverSheet.getColumn("B").width = 40

    const addCoverRow = (label: string, value: string, bold = false) => {
      const row = coverSheet.addRow([label, value])
      if (bold) {
        row.getCell(1).font = { bold: true, size: 12 }
        row.getCell(2).font = { bold: true, size: 12 }
      }
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } }
      row.height = 22
    }

    coverSheet.addRow([])
    const titleRow = coverSheet.addRow(["", "Attendix — Attendance Report"])
    titleRow.getCell(2).font = { bold: true, size: 16, color: { argb: "FF2563EB" } }
    titleRow.height = 30
    coverSheet.addRow([])

    addCoverRow("Organization", orgName, true)
    addCoverRow("Report Period", `${formatDate(from)} — ${formatDate(to)}`, true)
    addCoverRow("Generated", new Date().toLocaleString(), true)
    addCoverRow("Scope", filterUserId ? "Individual Employee" : "All Employees", false)
    addCoverRow("Total Records", rows.length.toString(), false)
    addCoverRow("Unique Employees", new Set(rows.map(r => r.employeeId)).size.toString(), false)
    addCoverRow("Total Worked Hours", formatMinutes(rows.reduce((s, r) => s + r.workedMinutes, 0)), false)
    addCoverRow("Total Late Minutes", formatMinutes(rows.reduce((s, r) => s + r.lateMinutes, 0)), false)
    addCoverRow("Total Overtime", formatMinutes(rows.reduce((s, r) => s + r.overtimeMinutes, 0)), false)

    // ── Sheet 2: Attendance Data ──────────────────────────────────────────
    const dataSheet = workbook.addWorksheet("Attendance Data")

    const headers = [
      "Employee Name",
      "Employee ID",
      "Department",
      "Position",
      "Date",
      "Session",
      "Location",
      "Check-In",
      "Check-Out",
      "Worked",
      "Late",
      "Late (min)",
      "Overtime",
      "OT (min)",
      "Status",
    ]

    const colWidths = [22, 14, 18, 18, 14, 22, 18, 12, 12, 12, 10, 12, 12, 12, 12]
    headers.forEach((h, i) => {
      dataSheet.getColumn(i + 1).width = colWidths[i]
    })

    // Header row
    const headerRow = dataSheet.addRow(headers)
    headerRow.height = 26
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } }
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false }
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF1E3A8A" } }
      }
    })

    // Data rows
    rows.forEach((row, idx) => {
      const dataRow = dataSheet.addRow([
        row.employeeName,
        row.employeeId,
        row.department,
        row.position,
        formatDate(row.date),
        row.sessionTitle,
        row.location,
        formatTime(row.checkIn),
        formatTime(row.checkOut),
        row.workedMinutes > 0 ? formatMinutes(row.workedMinutes) : "—",
        row.lateMinutes > 0 ? "YES" : "No",
        row.lateMinutes > 0 ? row.lateMinutes.toString() : "0",
        row.overtimeMinutes > 0 ? "YES" : "No",
        row.overtimeMinutes > 0 ? row.overtimeMinutes.toString() : "0",
        row.status.replace("_", " "),
      ])
      dataRow.height = 20

      // Alternating row color
      const bgColor = idx % 2 === 0 ? "FFFAFBFF" : "FFF0F4FF"
      dataRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } }
        cell.alignment = { vertical: "middle" }
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } }
        }
      })

      // Highlight late column
      if (row.lateMinutes > 0) {
        dataRow.getCell(11).font = { color: { argb: "FFDC2626" }, bold: true }
        dataRow.getCell(12).font = { color: { argb: "FFDC2626" } }
      }
      // Highlight overtime column
      if (row.overtimeMinutes > 0) {
        dataRow.getCell(13).font = { color: { argb: "FF7C3AED" }, bold: true }
        dataRow.getCell(14).font = { color: { argb: "FF7C3AED" } }
      }
      // Status color
      const statusCell = dataRow.getCell(15)
      if (row.status === "LATE") statusCell.font = { color: { argb: "FFDC2626" }, bold: true }
      else if (row.status === "OVERTIME") statusCell.font = { color: { argb: "FF7C3AED" }, bold: true }
      else if (row.status === "ON_TIME") statusCell.font = { color: { argb: "FF16A34A" } }
    })

    // Freeze header
    dataSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]

    // ── Sheet 3: Summary ──────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet("Summary")
    summarySheet.getColumn("A").width = 28
    summarySheet.getColumn("B").width = 20

    const addSummaryRow = (label: string, value: string, highlight = false) => {
      const row = summarySheet.addRow([label, value])
      row.height = 22
      row.getCell(1).font = { bold: true }
      row.getCell(2).alignment = { horizontal: "right" }
      if (highlight) {
        row.getCell(2).font = { bold: true, color: { argb: "FF1E40AF" } }
      }
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } }
    }

    summarySheet.addRow(["Summary"])
    summarySheet.getRow(1).getCell(1).font = { bold: true, size: 14 }
    summarySheet.addRow([])

    addSummaryRow("Total Employees", new Set(rows.map(r => r.employeeId)).size.toString(), true)
    addSummaryRow("Total Sessions", rows.length.toString(), true)
    addSummaryRow("Total Worked Hours", formatMinutes(rows.reduce((s, r) => s + r.workedMinutes, 0)), true)
    addSummaryRow("Total Late Minutes", rows.reduce((s, r) => s + r.lateMinutes, 0).toString(), false)
    addSummaryRow("Total Overtime Minutes", rows.reduce((s, r) => s + r.overtimeMinutes, 0).toString(), false)
    addSummaryRow("Late Sessions", rows.filter(r => r.lateMinutes > 0).length.toString(), false)
    addSummaryRow("Overtime Sessions", rows.filter(r => r.overtimeMinutes > 0).length.toString(), false)

    // ── Write to buffer ───────────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance_report.xlsx"`,
        "Cache-Control": "no-store",
      }
    })
  } catch (error) {
    console.error("Excel export error:", error)
    return new NextResponse("Internal server error generating Excel report", { status: 500 })
  }
}
