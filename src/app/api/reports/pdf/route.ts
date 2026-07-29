import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"
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
        event: { select: { title: true, attendanceType: true, sessionGroupId: true, sessionDate: true } },
        location: { select: { name: true } }
      },
      orderBy: [{ user: { name: "asc" } }, { actualTime: "asc" }]
    })

    // ── Build session-paired rows (same logic as Excel) ───────────────────
    interface ReportRow {
      employeeName: string
      employeeId: string
      department: string
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
            processedPairs.add(`${r.userId}:${r.event.sessionGroupId}:${day}:OUT`)
          }
        }

        rows.push({
          employeeName: r.user.name,
          employeeId: r.user.employeeId,
          department: r.user.department ?? "—",
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
        const pairKey = r.event.sessionGroupId
          ? `${r.userId}:${r.event.sessionGroupId}:${day}:OUT`
          : null
        if (pairKey && processedPairs.has(pairKey)) continue

        rows.push({
          employeeName: r.user.name,
          employeeId: r.user.employeeId,
          department: r.user.department ?? "—",
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

    // ── Build PDF ─────────────────────────────────────────────────────────
    const tz = searchParams.get("tz") || "UTC"
    
    const formatTime = (d: Date | null) =>
      d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }) : "—"

    const formatDate = (d: Date) =>
      new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: tz })

    const chunks: Buffer[] = []

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 40, bottom: 40, left: 36, right: 36 },
        autoFirstPage: true,
        bufferPages: true,
      })

      doc.on("data", (chunk: Buffer) => chunks.push(chunk))
      doc.on("end", resolve)
      doc.on("error", reject)

      const W = doc.page.width - 72 // usable width
      const BLUE = "#1E40AF"
      const GRAY = "#64748B"
      const LIGHT_GRAY = "#F1F5F9"
      const RED = "#DC2626"
      const PURPLE = "#7C3AED"

      // ── Cover / Header ────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(BLUE)

      doc.fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text("Attendix", 36, 20)

      doc.font("Helvetica")
        .fontSize(13)
        .text("Attendance Report", 36, 48)

      doc.font("Helvetica")
        .fontSize(9)
        .text(`${orgName}  ·  ${formatDate(from)} — ${formatDate(to)}  ·  Generated: ${new Date().toLocaleString()}`, 36, 70)

      doc.moveDown(2)
      doc.fillColor("black")

      // ── Summary stats block ───────────────────────────────────────────
      const statsY = 105
      const statsItems = [
        { label: "Total Employees", value: new Set(rows.map(r => r.employeeId)).size.toString() },
        { label: "Sessions", value: rows.length.toString() },
        { label: "Total Worked", value: formatMinutes(rows.reduce((s, r) => s + r.workedMinutes, 0)) },
        { label: "Total Late", value: formatMinutes(rows.reduce((s, r) => s + r.lateMinutes, 0)) },
        { label: "Total OT", value: formatMinutes(rows.reduce((s, r) => s + r.overtimeMinutes, 0)) },
      ]

      const boxW = W / statsItems.length - 6
      statsItems.forEach((item, i) => {
        const x = 36 + i * (boxW + 6)
        doc.rect(x, statsY, boxW, 44).fillAndStroke(LIGHT_GRAY, "#E2E8F0")
        doc.fillColor(BLUE).font("Helvetica-Bold").fontSize(14)
          .text(item.value, x + 6, statsY + 6, { width: boxW - 12, align: "center" })
        doc.fillColor(GRAY).font("Helvetica").fontSize(7)
          .text(item.label, x + 6, statsY + 24, { width: boxW - 12, align: "center" })
      })

      // ── Table ──────────────────────────────────────────────────────────
      const tableTop = statsY + 60
      const cols = [
        { label: "Employee", width: 90 },
        { label: "ID", width: 55 },
        { label: "Dept", width: 60 },
        { label: "Date", width: 60 },
        { label: "Session", width: 95 },
        { label: "Location", width: 72 },
        { label: "In", width: 38 },
        { label: "Out", width: 38 },
        { label: "Worked", width: 46 },
        { label: "Late", width: 38 },
        { label: "Overtime", width: 46 },
        { label: "Status", width: 52 },
      ]

      const rowHeight = 18
      const headerHeight = 20

      const drawTableHeader = (y: number) => {
        let x = 36
        doc.rect(36, y, W, headerHeight).fill(BLUE)
        cols.forEach(col => {
          doc.fillColor("white").font("Helvetica-Bold").fontSize(7)
            .text(col.label, x + 3, y + 6, { width: col.width - 6, align: "left" })
          x += col.width
        })
        return y + headerHeight
      }

      const drawTableRow = (row: ReportRow, y: number, idx: number) => {
        const bg = idx % 2 === 0 ? "white" : LIGHT_GRAY
        doc.rect(36, y, W, rowHeight).fill(bg)

        let x = 36
        const cells = [
          row.employeeName,
          row.employeeId,
          row.department,
          formatDate(row.date),
          row.sessionTitle,
          row.location,
          formatTime(row.checkIn),
          formatTime(row.checkOut),
          row.workedMinutes > 0 ? formatMinutes(row.workedMinutes) : "—",
          row.lateMinutes > 0 ? `${row.lateMinutes}m` : "—",
          row.overtimeMinutes > 0 ? `${row.overtimeMinutes}m` : "—",
          row.status.replace("_", " "),
        ]

        cells.forEach((cell, ci) => {
          const col = cols[ci]
          let color = "black"
          if (ci === 9 && row.lateMinutes > 0) color = RED
          else if (ci === 10 && row.overtimeMinutes > 0) color = PURPLE
          else if (ci === 11) {
            if (row.status === "LATE") color = RED
            else if (row.status === "OVERTIME") color = PURPLE
          }

          doc.fillColor(color).font("Helvetica").fontSize(7)
            .text(cell, x + 3, y + 5, { width: col.width - 6, ellipsis: true, lineBreak: false })
          x += col.width
        })

        // Divider line
        doc.moveTo(36, y + rowHeight).lineTo(36 + W, y + rowHeight).strokeColor("#E2E8F0").lineWidth(0.5).stroke()
      }

      let currentY = drawTableHeader(tableTop)

      rows.forEach((row, i) => {
        // Add new page if near bottom
        if (currentY + rowHeight > doc.page.height - 60) {
          doc.addPage()
          // Repeat header
          doc.rect(0, 0, doc.page.width, 30).fill(BLUE)
          doc.fillColor("white").font("Helvetica-Bold").fontSize(11)
            .text("Attendix — Attendance Report (continued)", 36, 10)
          doc.fillColor("black")
          currentY = drawTableHeader(42)
        }
        drawTableRow(row, currentY, i)
        currentY += rowHeight
      })

      if (rows.length === 0) {
        doc.fillColor(GRAY).font("Helvetica").fontSize(11)
          .text("No attendance records found for the selected period.", 36, currentY + 20, { align: "center", width: W })
      }

      // ── Page numbers ──────────────────────────────────────────────────
      const pageCount = doc.bufferedPageRange().count
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i)
        doc.fillColor(GRAY).font("Helvetica").fontSize(8)
          .text(`Page ${i + 1} of ${pageCount}`, 36, doc.page.height - 25, { width: W, align: "right" })
      }

      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendance_report.pdf"`,
        "Cache-Control": "no-store",
      }
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return new NextResponse("Internal server error generating PDF report", { status: 500 })
  }
}
