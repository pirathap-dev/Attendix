import { Suspense } from "react"
import AttendanceClient from "./attendance-client"

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
          <div className="text-muted-foreground text-lg animate-pulse">Loading attendance page…</div>
        </div>
      }
    >
      <AttendanceClient />
    </Suspense>
  )
}
