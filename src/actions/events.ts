"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { AttendanceType } from "@prisma/client"

export async function getEvents() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  return await prisma.attendanceEvent.findMany({
    orderBy: { sessionDate: "desc" },
    include: {
      location: true,
      createdBy: { select: { name: true } }
    }
  })
}

export async function createEvent(data: {
  title: string
  description?: string
  locationId: string
  attendanceType: AttendanceType
  expectedTime: Date         // Full DateTime with the correct session date + time
  sessionDate?: Date         // The intended date of the session
  sessionGroupId?: string    // Shared UUID for paired CHECK_IN / CHECK_OUT events
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    throw new Error("Unauthorized")
  }

  const event = await prisma.attendanceEvent.create({
    data: {
      title: data.title,
      description: data.description,
      locationId: data.locationId,
      attendanceType: data.attendanceType,
      expectedTime: data.expectedTime,
      sessionDate: data.sessionDate ?? data.expectedTime,
      sessionGroupId: data.sessionGroupId ?? null,
      createdById: String(session.user.id)
    }
  })

  revalidatePath("/dashboard/events")
  return { success: true, eventId: event.id }
}

export async function deleteEvent(id: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    throw new Error("Unauthorized")
  }

  await prisma.attendanceEvent.delete({
    where: { id }
  })

  revalidatePath("/dashboard/events")
}
