"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  MapPin,
  CalendarClock,
  History,
  Settings,
  BarChart3,
  QrCode,
  Building2,
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

  const filteredRoutes = allRoutes.filter((route) =>
    route.roles.includes(role || "EMPLOYEE")
  )

  return (
    <aside className="flex flex-col h-full w-64 bg-white dark:bg-slate-900 border-r border-border shadow-sm shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border shrink-0">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow shadow-primary/30">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight text-primary">Attendix</span>
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
    </aside>
  )
}
