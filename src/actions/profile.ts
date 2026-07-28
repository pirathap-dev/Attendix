"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcryptjs from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: String(session.user.id) } })
  if (!user) throw new Error("User not found")

  const passwordsMatch = await bcryptjs.compare(currentPassword, user.passwordHash)
  if (!passwordsMatch) throw new Error("Current password is incorrect")

  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters")

  const hashedPassword = await bcryptjs.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashedPassword }
  })

  await prisma.auditLog.create({
    data: {
      action: "CHANGE_PASSWORD",
      userId: user.id,
      details: JSON.stringify({ changedAt: new Date().toISOString() })
    }
  })

  revalidatePath("/dashboard/settings")
}

export async function updateProfile(data: { name?: string; email?: string; phone?: string; department?: string; position?: string }) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: String(session.user.id) },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
    }
  })

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard")
}
