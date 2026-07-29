"use client"

import { useEffect, useState } from "react"

export function LocalTime({ date, type = "time" }: { date: Date | string, type?: "time" | "date" | "datetime" }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className="opacity-0">Loading...</span>
  }

  const d = new Date(date)

  if (type === "date") {
    return <span>{d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
  }

  if (type === "datetime") {
    return <span>{d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
  }

  return (
    <span>
      {d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  )
}
