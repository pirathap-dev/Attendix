"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { LocationStatus } from "@prisma/client"

export async function getLocations() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  return await prisma.location.findMany({
    orderBy: { createdAt: "desc" }
  })
}

export async function createLocation(data: {
  name: string
  description?: string
  latitude: number
  longitude: number
  allowedRadius: number
  department?: string
}) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.location.create({
    data: {
      name: data.name,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      allowedRadius: data.allowedRadius,
      department: data.department
    }
  })

  revalidatePath("/dashboard/locations")
  return { success: true }
}

export async function updateLocationStatus(id: string, status: LocationStatus) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.location.update({
    where: { id },
    data: { status }
  })

  revalidatePath("/dashboard/locations")
}

export async function deleteLocation(id: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.location.delete({
    where: { id }
  })

  revalidatePath("/dashboard/locations")
}
