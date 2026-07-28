"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { recordAttendance } from "@/actions/attendance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, CheckCircle2, XCircle, Navigation, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function AttendanceClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"IDLE" | "REQUESTING_PERM" | "LOCATING" | "SUBMITTING" | "SUCCESS" | "ERROR">("IDLE")
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

    if (!navigator.geolocation) {
      setStatus("ERROR")
      setMessage("Geolocation is not supported by your browser. Please use a modern mobile browser such as Chrome or Safari.")
      return
    }

    // Show permission request state before the browser prompt fires
    setStatus("REQUESTING_PERM")

    // Stage 1: Fast network/WiFi location (works indoors)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("LOCATING")
        submitWithPosition(pos)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("ERROR")
          setMessage("PERMISSION_DENIED")
          return
        }
        // Stage 2: GPS fallback with longer timeout
        setStatus("LOCATING")
        navigator.geolocation.getCurrentPosition(
          submitWithPosition,
          (error) => {
            setStatus("ERROR")
            switch (error.code) {
              case error.PERMISSION_DENIED:
                setMessage("PERMISSION_DENIED")
                break
              case error.POSITION_UNAVAILABLE:
                setMessage("Your device location is currently unavailable. Please ensure Location Services are enabled in your device Settings and try again.")
                break
              case error.TIMEOUT:
                setMessage("Could not determine your location in time. Please move closer to a window or go outdoors for a better GPS signal, then try again.")
                break
              default:
                setMessage("An unknown location error occurred. Please try again.")
            }
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
        )
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
      <Card className="w-full max-w-md text-center border-t-4 border-t-primary shadow-xl shadow-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Mark Attendance</CardTitle>
          <CardDescription>
            Verify your location to record today&apos;s attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 pb-8">

          {/* IDLE — show location instructions prominently before clicking */}
          {status === "IDLE" && (
            <div className="space-y-5">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center ring-4 ring-primary/5">
                <MapPin className="w-9 h-9 text-primary" />
              </div>
              
              {/* ⭐ Clear instruction to enable location */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Before you tap the button below:
                </div>
                <ol className="text-sm text-amber-700 space-y-1 pl-5 list-decimal">
                  <li>Make sure <strong>Location / GPS</strong> is turned ON in your device Settings.</li>
                  <li>When the browser asks for location permission, tap <strong>&quot;Allow&quot;</strong>.</li>
                  <li>Stay within the designated work area radius.</li>
                </ol>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Your GPS coordinates will be compared against the designated work location.</p>
              </div>
              <Button size="lg" className="w-full text-base h-12 shadow-lg shadow-primary/20" onClick={handleMarkAttendance}>
                <Navigation className="mr-2 h-5 w-5" />
                Enable Location &amp; Mark Attendance
              </Button>
            </div>
          )}

          {/* REQUESTING_PERM — waiting for browser dialog */}
          {status === "REQUESTING_PERM" && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center ring-4 ring-amber-100 animate-pulse">
                <MapPin className="w-9 h-9 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Waiting for location permission…</p>
                <p className="text-sm text-muted-foreground">
                  A permission dialog should have appeared. Please tap <strong>Allow</strong> to continue.
                </p>
              </div>
            </div>
          )}

          {/* LOCATING / SUBMITTING */}
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

          {/* SUCCESS */}
          {status === "SUCCESS" && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center ring-4 ring-green-100">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-700">You&apos;re clocked in!</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{message}</p>
              </div>
              <div className="w-full space-y-2 pt-2">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center w-full h-11 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/dashboard/attendance"
                  className="flex items-center justify-center w-full h-11 px-4 border border-border bg-background hover:bg-muted rounded-lg text-sm font-medium transition-colors"
                >
                  View My Attendance
                </Link>
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === "ERROR" && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center ring-4 ring-red-100">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              
              {/* Special UI for permission denied */}
              {message === "PERMISSION_DENIED" ? (
                <div className="w-full space-y-3 text-left">
                  <h3 className="text-lg font-bold text-red-700 text-center">Location Access Denied</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    The browser was denied access to your location. Follow these steps to fix it:
                  </p>
                  <div className="rounded-lg bg-slate-50 border border-border p-4 text-sm space-y-2 text-foreground">
                    <p className="font-semibold">📱 On Android (Chrome):</p>
                    <p className="text-muted-foreground pl-2">Settings → Site Settings → Location → find this site → Allow</p>
                    <p className="font-semibold mt-2">🍎 On iPhone (Safari):</p>
                    <p className="text-muted-foreground pl-2">Settings → Safari → Location → Allow</p>
                    <p className="font-semibold mt-2">💻 On Desktop Chrome:</p>
                    <p className="text-muted-foreground pl-2">Click the 🔒 lock icon in the address bar → Location → Allow</p>
                  </div>
                  <Button className="w-full mt-2" onClick={() => { setStatus("IDLE"); setMessage("") }}>
                    I&apos;ve enabled location — Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-red-700">Verification Failed</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{message}</p>
                  </div>
                  <Button
                    className="w-full mt-2"
                    onClick={() => { setStatus("IDLE"); setMessage("") }}
                    disabled={!token}
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
