/**
 * Shared attendance calculation utilities.
 * Used by: recordAttendance action, getAttendanceReportData, Excel export, PDF export.
 * Single source of truth — keeps numbers consistent across all views.
 */

export interface SessionPair {
  date: Date
  sessionTitle: string
  locationName: string
  checkIn: Date | null
  checkOut: Date | null
  expectedCheckIn: Date | null
  expectedCheckOut: Date | null
  checkInStatus: string | null
  checkOutStatus: string | null
  lateMinutes: number
  overtimeMinutes: number
  workingMinutes: number
}

/** Format minutes as "Xh Ym" */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m"
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Format working hours float (stored as hours) as "Xh Ym" */
export function formatWorkingHours(hours: number | null | undefined): string {
  if (!hours || hours <= 0) return "0m"
  return formatMinutes(Math.round(hours * 60))
}

/**
 * Calculate status, lateMinutes, overtimeMinutes for a single scan.
 * @param actualTime   When the employee actually scanned
 * @param expectedTime The expected check-in or check-out time (full DateTime)
 * @param type         "CHECK_IN" or "CHECK_OUT"
 */
export function calculateScanStatus(
  actualTime: Date,
  expectedTime: Date,
  type: "CHECK_IN" | "CHECK_OUT"
): {
  status: "ON_TIME" | "EARLY" | "LATE" | "OVERTIME"
  lateMinutes: number
  overtimeMinutes: number
} {
  const diffMinutes = Math.round(
    (actualTime.getTime() - expectedTime.getTime()) / 60000
  )

  if (type === "CHECK_IN") {
    if (diffMinutes > 5) {
      return { status: "LATE", lateMinutes: diffMinutes, overtimeMinutes: 0 }
    } else if (diffMinutes < -5) {
      return { status: "EARLY", lateMinutes: 0, overtimeMinutes: 0 }
    }
    return { status: "ON_TIME", lateMinutes: 0, overtimeMinutes: 0 }
  } else {
    // CHECK_OUT
    if (diffMinutes > 5) {
      return { status: "OVERTIME", lateMinutes: 0, overtimeMinutes: diffMinutes }
    } else if (diffMinutes < -5) {
      return { status: "EARLY", lateMinutes: 0, overtimeMinutes: 0 }
    }
    return { status: "ON_TIME", lateMinutes: 0, overtimeMinutes: 0 }
  }
}

/**
 * Calculate working hours in decimal hours from two timestamps.
 */
export function calculateWorkingHours(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime()
  return Math.max(0, ms / (1000 * 60 * 60))
}

/**
 * Build the expected DateTime for a session scan.
 * Combines the session date with the expected HH:MM from the event.
 */
export function buildExpectedDateTime(sessionDate: Date, eventExpectedTime: Date): Date {
  const result = new Date(sessionDate)
  result.setUTCHours(
    eventExpectedTime.getUTCHours(),
    eventExpectedTime.getUTCMinutes(),
    0,
    0
  )
  return result
}

/**
 * Determine the overall session status for display in reports.
 * Returns a human-readable status string.
 */
export function getSessionStatus(
  checkIn: Date | null,
  checkOut: Date | null
): "Complete" | "Check-In Only" | "No Record" {
  if (checkIn && checkOut) return "Complete"
  if (checkIn) return "Check-In Only"
  return "No Record"
}
