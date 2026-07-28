"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { recordAttendance } from "@/actions/attendance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function AttendanceClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"IDLE" | "LOCATING" | "SUBMITTING" | "SUCCESS" | "ERROR">("IDLE")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("ERROR")
      setMessage("Invalid URL — QR code token is missing. Please scan the QR code again.")
    }
  }, [token])

  const submitWithPosition = async (position: GeolocationPosition) => {
    setStatus("SUBMITTING")
    try {
      const result = await recordAttendance(
        token!,
        position.coords.latitude,
        position.coords.longitude
      )
      if (result?.error) {
        setStatus("ERROR")
        setMessage(result.error)
      } else {
        setStatus("SUCCESS")
        setMessage(result?.message || "Attendance recorded successfully!")
        toast.success("Attendance Marked", { description: result?.message })
      }
    } catch {
      setStatus("ERROR")
      setMessage("An unexpected error occurred while communicating with the server.")
    }
  }

  const handleMarkAttendance = () => {
    if (!token) return

    setStatus("LOCATING")

    if (!navigator.geolocation) {
      setStatus("ERROR")
      setMessage("Geolocation is not supported by your browser. Please use a modern mobile browser.")
      return
    }

    // Stage 1: Fast network/WiFi location (works indoors, no GPS needed)
    navigator.geolocation.getCurrentPosition(
      submitWithPosition,
      () => {
        // Stage 2: Fallback to full GPS with longer timeout
        navigator.geolocation.getCurrentPosition(
          submitWithPosition,
          (error) => {
            setStatus("ERROR")
            switch (error.code) {
              case error.PERMISSION_DENIED:
                setMessage("Location permission denied. Please allow location access in your browser settings and try again.")
                break
              case error.POSITION_UNAVAILABLE:
                setMessage("Your device location is currently unavailable. Please check that Location Services are enabled and try again.")
                break
              case error.TIMEOUT:
                setMessage("Could not determine your location in time. Please move to an area with better GPS signal (near a window or outdoors) and try again.")
                break
              default:
                setMessage("An unknown location error occurred. Please try again.")
            }
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
        )
      },
      // Fast first attempt: use network/WiFi, short timeout, allow slightly cached position
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
      <Card className="w-full max-w-md text-center border-t-4 border-t-primary shadow-xl shadow-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Mark Attendance</CardTitle>
          <CardDescription>
            Verify your location to record today's attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 pb-8">

          {status === "IDLE" && (
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center ring-4 ring-primary/5">
                <MapPin className="w-9 h-9 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium">Location Verification Required</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your GPS coordinates will be compared against the designated work location. 
                  You must be within the allowed radius to successfully clock in/out.
                </p>
              </div>
              <Button size="lg" className="w-full text-base h-12 shadow-lg shadow-primary/20" onClick={handleMarkAttendance}>
                <MapPin className="mr-2 h-5 w-5" />
                Verify Location & Mark Attendance
              </Button>
              <p className="text-xs text-muted-foreground">
                Not logged in?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Log in first
                </Link>
              </p>
            </div>
          )}

          {(status === "LOCATING" || status === "SUBMITTING") && (
            <div className="flex flex-col items-center gap-5 py-8">
              <Loader2 className="w-14 h-14 text-primary animate-spin" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {status === "LOCATING" ? "Acquiring GPS…" : "Submitting attendance…"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status === "LOCATING"
                    ? "Please hold still for a moment."
                    : "Verifying token and location…"}
                </p>
              </div>
            </div>
          )}

          {status === "SUCCESS" && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center ring-4 ring-green-100">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-green-700">Attendance Recorded!</h3>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center w-full h-9 px-4 border border-border bg-background hover:bg-muted rounded-lg text-sm font-medium transition-colors mt-2"
              >
                Return to Dashboard
              </Link>
            </div>
          )}

          {status === "ERROR" && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center ring-4 ring-red-100">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-red-700">Verification Failed</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
              </div>
              <Button
                className="w-full mt-2"
                onClick={() => setStatus("IDLE")}
                disabled={!token}
              >
                Try Again
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
