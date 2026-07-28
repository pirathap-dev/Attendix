"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { AttendanceStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-development-only"

// Helper to calculate distance in meters between two coordinates
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in m
}

export async function recordAttendance(token: string, userLat: number, userLon: number) {
  try {
    const session = await auth()
    if (!session?.user) return { error: "Unauthenticated" }

    // 1. Verify Token
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (e) {
      return { error: "Invalid or expired QR code token. Please scan again." }
    }

    const eventId = decoded.eventId

    // 2. Fetch Event & Location
    const event = await prisma.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { location: true }
    })

    if (!event) return { error: "Attendance event not found." }

    // 3. Verify Duplicate
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId: String(session.user.id),
        eventId: event.id,
        createdAt: { gte: startOfDay }
      }
    })

    if (existingRecord) {
      return { error: "You have already marked attendance for this event today." }
    }

    // 4. Verify GPS Location
    const distance = getDistanceFromLatLonInM(
      userLat, userLon,
      event.location.latitude, event.location.longitude
    )

    if (distance > event.location.allowedRadius) {
      return { error: `You are too far from the work location. You are ${Math.round(distance)}m away (Max allowed: ${event.location.allowedRadius}m).` }
    }

    // 5. Calculate Status, Late, Overtime
    // IMPORTANT: event.expectedTime has the date from when the event was created.
    // We only care about the TIME portion (HH:MM). Rebuild it using today's date.
    const now = new Date()
    const expected = new Date(event.expectedTime)
    const todayExpected = new Date(now)
    todayExpected.setHours(expected.getUTCHours(), expected.getUTCMinutes(), 0, 0)

    let status: AttendanceStatus = "ON_TIME"
    let lateMinutes = 0
    let overtimeMinutes = 0

    // diffMinutes > 0 means employee arrived AFTER expected time (late for check-in)
    // diffMinutes < 0 means employee arrived BEFORE expected time (early)
    const diffMinutes = Math.round((now.getTime() - todayExpected.getTime()) / 60000)

    if (event.attendanceType === "CHECK_IN") {
      if (diffMinutes > 5) {       // more than 5 min after expected → LATE
        status = "LATE"
        lateMinutes = diffMinutes
      } else if (diffMinutes < -5) { // more than 5 min before expected → EARLY
        status = "EARLY"
      }
    } else { // CHECK_OUT
      if (diffMinutes > 5) {       // stayed more than 5 min past expected → OVERTIME
        status = "OVERTIME"
        overtimeMinutes = diffMinutes
      } else if (diffMinutes < -5) { // left more than 5 min before expected → EARLY departure
        status = "EARLY"
      }
    }

    // Capture metadata
    const headersList = await headers()
    const userAgent = headersList.get("user-agent") || "Unknown"
    const ipAddress = headersList.get("x-forwarded-for") || "Unknown"
    
    // Parse simple device/browser info from UA (Basic)
    const browser = userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Other"
    const device = userAgent.includes("Mobile") ? "Mobile" : "Desktop"

    // 6. Record Attendance
    await prisma.attendanceRecord.create({
      data: {
        userId: String(session.user.id),
        eventId: event.id,
        locationId: event.locationId,
        expectedTime: event.expectedTime,
        actualTime: now,
        status,
        lateMinutes: lateMinutes > 0 ? lateMinutes : 0,
        overtimeMinutes: overtimeMinutes > 0 ? overtimeMinutes : 0,
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
    return { success: true, message: `Attendance marked successfully as ${status.replace("_", " ")}.` }
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

