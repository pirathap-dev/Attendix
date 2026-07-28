"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { LogOut, User as UserIcon, ChevronDown, Settings } from "lucide-react"
import { logoutAction } from "@/actions/auth"

interface HeaderProps {
  user?: {
    name?: string | null
    role?: string
    employeeId?: string
  }
}

const roleLabels: Record<string, string> = {
  ADMIN: "Organization Admin",
  SUPERVISOR: "Supervisor",
  EMPLOYEE: "Employee",
}

export default function Header({ user }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <header className="h-16 border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10">
      <div />

      {/* Profile dropdown */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-haspopup="true"
          aria-expanded={open}
        >
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
          </div>
          {/* User info */}
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-sm font-semibold text-foreground">{user?.name}</span>
            <span className="text-xs text-muted-foreground mt-0.5">
              {roleLabels[user?.role ?? ""] ?? user?.role}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground hidden sm:block transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-popover border border-border shadow-lg ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
            role="menu"
          >
            {/* Header info */}
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">ID: {user?.employeeId}</p>
            </div>

            {/* Items */}
            <div className="py-1">
              <Link
                href="/dashboard/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                My Profile
              </Link>
              <Link
                href="/dashboard/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </Link>
            </div>

            <div className="border-t border-border py-1">
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false)
                  await logoutAction()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
