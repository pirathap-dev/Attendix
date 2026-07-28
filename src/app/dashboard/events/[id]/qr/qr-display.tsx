"use client"

import { useEffect, useState } from "react"
import QRCode from "react-qr-code"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function QRDisplay({ eventId, appUrl }: { eventId: string, appUrl: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const fetchToken = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/qr-token`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setToken(data.token)
      setError(false)
    } catch (err) {
      console.error(err)
      setError(true)
    }
  }

  useEffect(() => {
    fetchToken()
    // Refresh token every 25 seconds (since it expires in 30s)
    const interval = setInterval(fetchToken, 25000)
    return () => clearInterval(interval)
  }, [eventId])

  if (error) {
    return (
      <Card className="w-96 h-96 flex items-center justify-center p-6">
        <div className="text-destructive font-semibold">Failed to generate QR Code. Please check connection.</div>
      </Card>
    )
  }

  if (!token) {
    return (
      <Card className="w-96 h-96 flex items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  // The QR code contains the attendance URL with the signed token
  const attendanceUrl = `${appUrl}/attendance?token=${token}`

  return (
    <Card className="w-96 h-96 flex items-center justify-center p-6 bg-white shadow-xl border-4 border-primary/20">
      <CardContent className="p-0">
        <QRCode 
          value={attendanceUrl}
          size={320}
          level="H"
        />
      </CardContent>
    </Card>
  )
}
