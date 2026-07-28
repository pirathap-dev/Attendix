"use server"

import { z } from "zod"
import bcryptjs from "bcryptjs"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  employeeId: z.string().min(2, "Employee ID is required"),
  department: z.string().min(2, "Department is required"),
  position: z.string().min(2, "Position is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export async function registerEmployee(formData: z.infer<typeof registerSchema>) {
  try {
    const validatedData = registerSchema.parse(formData)
    
    // Check if employee ID already exists
    const existingUser = await prisma.user.findUnique({
      where: { employeeId: validatedData.employeeId }
    })
    
    if (existingUser) {
      return { success: false, error: "Employee ID already exists" }
    }
    
    // Hash password
    const salt = await bcryptjs.genSalt(10)
    const passwordHash = await bcryptjs.hash(validatedData.password, salt)
    
    // Create user with PENDING status
    await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        employeeId: validatedData.employeeId,
        department: validatedData.department,
        position: validatedData.position,
        passwordHash,
        status: "PENDING",
        role: "EMPLOYEE"
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error("Registration error:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to register. Please try again." }
  }
}

import { signOut } from "@/auth"

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
