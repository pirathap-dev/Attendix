import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import QRDisplay from "./qr-display"

export default async function QRPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    redirect("/dashboard")
  }

  const { id } = await params

  const event = await prisma.attendanceEvent.findUnique({
    where: { id },
    include: { location: true },
  })

  if (!event) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Event not found.</p>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 text-center p-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>
        <p className="text-xl text-muted-foreground">
          {event.location.name} &mdash;{" "}
          <span className="font-semibold">
            {event.attendanceType === "CHECK_IN" ? "Check In" : "Check Out"}
          </span>
        </p>
        <p className="text-muted-foreground">
          Expected at{" "}
          {new Date(event.expectedTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <QRDisplay eventId={event.id} appUrl={appUrl} />

      <p className="text-sm text-muted-foreground animate-pulse mt-2">
        🔄 QR code refreshes every 25 seconds to prevent fraud.
      </p>
    </div>
  )
}
