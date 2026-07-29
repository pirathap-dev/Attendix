"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface AttendanceFilterClientProps {
  currentPeriod: string
}

export default function AttendanceFilterClient({ currentPeriod }: AttendanceFilterClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const setPeriod = (period: string) => {
    router.push(`${pathname}?period=${period}`)
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        variant={currentPeriod === "month" ? "default" : "outline"}
        size="sm"
        onClick={() => setPeriod("month")}
      >
        This Month
      </Button>
      <Button
        variant={currentPeriod === "30days" ? "default" : "outline"}
        size="sm"
        onClick={() => setPeriod("30days")}
      >
        Last 30 Days
      </Button>
    </div>
  )
}
