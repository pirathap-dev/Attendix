"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { AttendanceStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import {
  calculateScanStatus,
  calculateWorkingHours,
  buildExpectedDateTime,
} from "@/lib/attendance-calculations"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-development-only"

// Helper to calculate distance in meters between two coordinates
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function recordAttendance(token: string, userLat: number, userLon: number) {
  try {
    const session = await auth()
    if (!session?.user) return { error: "Unauthenticated" }

    // 1. Verify Token
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      return { error: "Invalid or expired QR code token. Please scan again." }
    }

    const eventId = decoded.eventId

    // 2. Fetch Event & Location
    const event = await prisma.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { location: true }
    })

    if (!event) return { error: "Attendance event not found." }

    // 3. Determine the session date — use sessionDate if present, otherwise fall back to expectedTime date
    const sessionDate = event.sessionDate ?? event.expectedTime

    // Build start/end of session day in UTC for duplicate detection
    const dayStart = new Date(sessionDate)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    // 4. Verify Duplicate — scoped to the session's date, not "today"
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId: String(session.user.id),
        eventId: event.id,
        createdAt: { gte: dayStart, lt: dayEnd }
      }
    })

    if (existingRecord) {
      return { error: "You have already marked attendance for this event." }
    }

    // 5. Verify GPS Location
    const distance = getDistanceFromLatLonInM(
      userLat, userLon,
      event.location.latitude, event.location.longitude
    )

    if (distance > event.location.allowedRadius) {
      return {
        error: `You are too far from the work location. You are ${Math.round(distance)}m away (Max allowed: ${event.location.allowedRadius}m).`
      }
    }

    // 6. Build the correct expected DateTime using the session's date + expected HH:MM
    const now = new Date()
    const expectedDateTime = buildExpectedDateTime(sessionDate, event.expectedTime)

    // 7. Calculate status, lateMinutes, overtimeMinutes
    const { status, lateMinutes, overtimeMinutes } = calculateScanStatus(
      now,
      expectedDateTime,
      event.attendanceType
    )

    // 8. For CHECK_OUT: find the corresponding CHECK_IN record and compute working hours
    let workingHours: number | undefined = undefined
    let checkInRecordId: string | undefined = undefined

    if (event.attendanceType === "CHECK_OUT" && event.sessionGroupId) {
      // Find the paired CHECK_IN event
      const checkInEvent = await prisma.attendanceEvent.findFirst({
        where: {
          sessionGroupId: event.sessionGroupId,
          attendanceType: "CHECK_IN"
        }
      })

      if (checkInEvent) {
        // Find this user's check-in record for that event on the same session day
        const checkInRecord = await prisma.attendanceRecord.findFirst({
          where: {
            userId: String(session.user.id),
            eventId: checkInEvent.id,
            createdAt: { gte: dayStart, lt: dayEnd }
          }
        })

        if (checkInRecord) {
          checkInRecordId = checkInRecord.id
          workingHours = calculateWorkingHours(checkInRecord.actualTime, now)
        }
      }
    }

    // 9. Capture metadata
    const headersList = await headers()
    const userAgent = headersList.get("user-agent") || "Unknown"
    const ipAddress = headersList.get("x-forwarded-for") || "Unknown"
    const browser = userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Other"
    const device = userAgent.includes("Mobile") ? "Mobile" : "Desktop"

    // 10. Record Attendance
    await prisma.attendanceRecord.create({
      data: {
        userId: String(session.user.id),
        eventId: event.id,
        locationId: event.locationId,
        expectedTime: expectedDateTime,
        actualTime: now,
        status,
        lateMinutes: lateMinutes > 0 ? lateMinutes : 0,
        overtimeMinutes: overtimeMinutes > 0 ? overtimeMinutes : 0,
        workingHours: workingHours ?? null,
        checkInRecordId: checkInRecordId ?? null,
        latitude: userLat,
        longitude: userLon,
        distance,
        browser,
        device,
        ipAddress,
        verificationStatus: "VERIFIED"
      }
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/attendance")

    const typeLabel = event.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"
    return {
      success: true,
      message: `${typeLabel} recorded successfully as ${status.replace("_", " ")}.`
    }
  } catch (error) {
    console.error("Attendance Error:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getEventAttendance(eventId: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    throw new Error("Unauthorized")
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { eventId },
    include: {
      user: { select: { name: true, employeeId: true, department: true } },
    },
    orderBy: { actualTime: "asc" },
  })

  return records
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee: get own attendance stats and records (scoped to current user only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyAttendanceStats(from: Date, to: Date) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const userId = String(session.user.id)

  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId,
      actualTime: { gte: from, lte: to }
    },
    include: {
      event: { select: { title: true, attendanceType: true, sessionGroupId: true } },
      location: { select: { name: true } },
    },
    orderBy: { actualTime: "desc" }
  })

  // Aggregate totals
  let totalWorkedMinutes = 0
  let totalOvertimeMinutes = 0
  let totalLateMinutes = 0
  let completeSessions = 0
  let incompleteSessions = 0

  // Group by sessionGroupId to find complete vs incomplete sessions
  const checkOutRecords = records.filter(r => r.event.attendanceType === "CHECK_OUT" && r.workingHours !== null)
  const checkInOnlyRecords = records.filter(r => r.event.attendanceType === "CHECK_IN")

  for (const r of checkOutRecords) {
    totalWorkedMinutes += Math.round((r.workingHours ?? 0) * 60)
    totalOvertimeMinutes += r.overtimeMinutes
    completeSessions++
  }

  for (const r of checkInOnlyRecords) {
    totalLateMinutes += r.lateMinutes
    // Check if this check-in has a matching check-out
    const hasCheckOut = checkOutRecords.some(
      out => out.event.sessionGroupId && out.event.sessionGroupId === r.event.sessionGroupId
    )
    if (!hasCheckOut) incompleteSessions++
  }

  return {
    totalWorkedMinutes,
    totalOvertimeMinutes,
    totalLateMinutes,
    totalSessions: checkInOnlyRecords.length,
    completeSessions,
    incompleteSessions,
    records
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: get attendance report data for a date range (and optional employee filter)
// ─────────────────────────────────────────────────────────────────────────────

export interface AttendanceReportRow {
  recordId: string
  userId: string
  employeeName: string
  employeeId: string
  department: string | null
  position: string | null
  date: Date
  sessionTitle: string
  locationName: string
  attendanceType: string
  checkInTime: Date | null
  checkOutTime: Date | null
  expectedCheckIn: Date | null
  expectedCheckOut: Date | null
  actualTime: Date
  workingMinutes: number
  lateMinutes: number
  overtimeMinutes: number
  status: string
  isLate: boolean
  hasOvertime: boolean
}

export async function getAttendanceReportData(
  from: Date,
  to: Date,
  userId?: string
): Promise<AttendanceReportRow[]> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      ...(userId ? { userId } : {}),
      actualTime: { gte: from, lte: to }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          department: true,
          position: true,
        }
      },
      event: {
        select: {
          title: true,
          attendanceType: true,
          sessionGroupId: true,
          expectedTime: true,
          sessionDate: true,
        }
      },
      location: { select: { name: true } }
    },
    orderBy: [
      { user: { name: "asc" } },
      { actualTime: "asc" }
    ]
  })

  // Build a map of CHECK_OUT records to their paired CHECK_IN records via sessionGroupId + userId + date
  const checkInMap = new Map<string, (typeof records)[0]>()
  for (const r of records) {
    if (r.event.attendanceType === "CHECK_IN" && r.event.sessionGroupId) {
      const dayKey = new Date(r.actualTime).toISOString().slice(0, 10)
      const key = `${r.userId}:${r.event.sessionGroupId}:${dayKey}`
      checkInMap.set(key, r)
    }
  }

  const rows: AttendanceReportRow[] = []

  for (const r of records) {
    const dayKey = new Date(r.actualTime).toISOString().slice(0, 10)
    let checkInTime: Date | null = null
    let checkOutTime: Date | null = null
    let workingMinutes = 0

    if (r.event.attendanceType === "CHECK_IN") {
      checkInTime = r.actualTime
      // Find paired check-out
      if (r.event.sessionGroupId) {
        const pairedCheckOut = records.find(
          out =>
            out.event.attendanceType === "CHECK_OUT" &&
            out.event.sessionGroupId === r.event.sessionGroupId &&
            out.userId === r.userId &&
            new Date(out.actualTime).toISOString().slice(0, 10) === dayKey
        )
        if (pairedCheckOut) {
          checkOutTime = pairedCheckOut.actualTime
          workingMinutes = Math.round((pairedCheckOut.workingHours ?? 0) * 60)
        }
      }
    } else {
      // CHECK_OUT — get check-in from paired event
      checkOutTime = r.actualTime
      workingMinutes = Math.round((r.workingHours ?? 0) * 60)
      if (r.event.sessionGroupId) {
        const key = `${r.userId}:${r.event.sessionGroupId}:${dayKey}`
        const pairedIn = checkInMap.get(key)
        if (pairedIn) checkInTime = pairedIn.actualTime
      }
      // Skip if we already emitted a CHECK_IN row for this session (avoid duplicates)
      // Only include CHECK_OUT rows when there is no paired CHECK_IN in the result set
      // to avoid double rows. Actually we should skip CHECK_OUT rows that have a CHECK_IN pair.
      const hasPairedCheckIn = r.event.sessionGroupId &&
        records.some(
          ci =>
            ci.event.attendanceType === "CHECK_IN" &&
            ci.event.sessionGroupId === r.event.sessionGroupId &&
            ci.userId === r.userId &&
            new Date(ci.actualTime).toISOString().slice(0, 10) === dayKey
        )
      if (hasPairedCheckIn) continue // The CHECK_IN row already carries the full session data
    }

    rows.push({
      recordId: r.id,
      userId: r.userId,
      employeeName: r.user.name,
      employeeId: r.user.employeeId,
      department: r.user.department,
      position: r.user.position,
      date: r.event.sessionDate ?? r.actualTime,
      sessionTitle: r.event.title,
      locationName: r.location.name,
      attendanceType: r.event.attendanceType,
      checkInTime,
      checkOutTime,
      expectedCheckIn: r.event.attendanceType === "CHECK_IN" ? r.expectedTime : null,
      expectedCheckOut: r.event.attendanceType === "CHECK_OUT" ? r.expectedTime : null,
      actualTime: r.actualTime,
      workingMinutes,
      lateMinutes: r.lateMinutes,
      overtimeMinutes: checkOutTime ? (
        records.find(
          out =>
            out.event.attendanceType === "CHECK_OUT" &&
            out.event.sessionGroupId === r.event.sessionGroupId &&
            out.userId === r.userId &&
            new Date(out.actualTime).toISOString().slice(0, 10) === dayKey
        )?.overtimeMinutes ?? r.overtimeMinutes
      ) : r.overtimeMinutes,
      status: r.status,
      isLate: r.lateMinutes > 0,
      hasOvertime: r.overtimeMinutes > 0 || (
        records.find(
          out =>
            out.event.attendanceType === "CHECK_OUT" &&
            out.event.sessionGroupId === r.event.sessionGroupId &&
            out.userId === r.userId &&
            new Date(out.actualTime).toISOString().slice(0, 10) === dayKey
        )?.overtimeMinutes ?? 0
      ) > 0,
    })
  }

  return rows
}

export async function getEmployeesForFilter() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized")

  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, employeeId: true, department: true },
    orderBy: { name: "asc" }
  })
}
