"use client"

import { useEffect, useState } from "react"

export function LocalTime({ date }: { date: Date | string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className="opacity-0">00:00 AM</span>
  }

  return (
    <span>
      {new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  )
}
