"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { UserStatus, Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function getUsers() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      department: true,
      position: true,
      role: true,
      status: true,
      joiningDate: true,
      createdAt: true
    }
  })
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status }
  })
  
  await prisma.auditLog.create({
    data: {
      action: "UPDATE_USER_STATUS",
      userId: String(session.user.id),
      details: JSON.stringify({ targetUserId: userId, newStatus: status })
    }
  })

  revalidatePath("/dashboard/users")
}

export async function updateUserRole(userId: string, role: Role) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role }
  })
  
  await prisma.auditLog.create({
    data: {
      action: "UPDATE_USER_ROLE",
      userId: String(session.user.id),
      details: JSON.stringify({ targetUserId: userId, newRole: role })
    }
  })

  revalidatePath("/dashboard/users")
}
