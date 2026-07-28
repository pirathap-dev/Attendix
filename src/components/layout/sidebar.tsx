"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  MapPin,
  CalendarClock,
  History,
  Settings,
  BarChart3,
  Building2,
  Menu,
  X,
} from "lucide-react"

interface SidebarProps {
  role?: string
}

const allRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    roles: ["ADMIN", "SUPERVISOR", "EMPLOYEE"],
  },
  {
    label: "My Attendance",
    icon: History,
    href: "/dashboard/attendance",
    roles: ["EMPLOYEE", "SUPERVISOR", "ADMIN"],
  },
  {
    label: "Attendance Events",
    icon: CalendarClock,
    href: "/dashboard/events",
    roles: ["SUPERVISOR", "ADMIN"],
    dividerBefore: true,
  },
  {
    label: "User Management",
    icon: Users,
    href: "/dashboard/users",
    roles: ["ADMIN"],
    dividerBefore: true,
  },
  {
    label: "Locations",
    icon: MapPin,
    href: "/dashboard/locations",
    roles: ["ADMIN"],
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/dashboard/reports",
    roles: ["ADMIN"],
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    roles: ["ADMIN"],
  },
]

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const filteredRoutes = allRoutes.filter((route) =>
    route.roles.includes(role || "EMPLOYEE")
  )

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border shrink-0">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow shadow-primary/30">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight text-primary">Attendix</span>
        {/* Close button on mobile */}
        <button
          className="ml-auto md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {filteredRoutes.map((route) => {
            const isActive =
              route.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(route.href)

            return (
              <li key={route.href}>
                {route.dividerBefore && (
                  <div className="my-2 border-t border-border" />
                )}
                <Link
                  href={route.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <route.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {route.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom branding */}
      <div className="px-4 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Attendix Platform v1.0
        </p>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button — shown in header area on small screens */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden flex items-center justify-center h-9 w-9 rounded-lg bg-background border border-border shadow-sm text-foreground"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col h-full w-64 bg-white dark:bg-slate-900 border-r border-border shadow-xl transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex flex-col h-full w-64 bg-white dark:bg-slate-900 border-r border-border shadow-sm shrink-0">
        {navContent}
      </aside>
    </>
  )
}
