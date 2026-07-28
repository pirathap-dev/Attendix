import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AttendanceClient from "./attendance-client"

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  
  if (!session?.user) {
    const params = await searchParams
    const token = params.token as string | undefined
    const tokenStr = token ? `?token=${token}` : ""
    redirect(`/login?callbackUrl=${encodeURIComponent(`/attendance${tokenStr}`)}`)
  }

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
