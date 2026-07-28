import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-development-only"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const event = await prisma.attendanceEvent.findUnique({
      where: { id }
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Token expires in 30 seconds — prevents screenshot reuse
    const token = jwt.sign(
      {
        eventId: event.id,
        locationId: event.locationId,
      },
      JWT_SECRET,
      { expiresIn: "30s" }
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Token generation error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
