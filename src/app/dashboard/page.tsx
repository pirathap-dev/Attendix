import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, MapPin, Building, CheckCircle2, AlertCircle, Timer } from "lucide-react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { LocalTime } from "@/components/local-time"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user

  let totalEmployees = 0
  let presentToday = 0
  let activeLocations = 0
  let totalDepartments = 0
  let daysPresentThisMonth = 0
  let lateArrivals = 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  if (user.role === 'ADMIN') {
    totalEmployees = await prisma.user.count()
    activeLocations = await prisma.location.count({ where: { status: 'ACTIVE' } })
    const departments = await prisma.user.findMany({
      select: { department: true },
      distinct: ['department']
    })
    totalDepartments = departments.filter(d => d.department).length
    presentToday = await prisma.attendanceRecord.count({
      where: { createdAt: { gte: today } }
    })
  } else {
    daysPresentThisMonth = await prisma.attendanceRecord.count({
      where: {
        userId: String(user.id),
        createdAt: { gte: firstDayOfMonth }
      }
    })
    lateArrivals = await prisma.attendanceRecord.count({
      where: {
        userId: String(user.id),
        createdAt: { gte: firstDayOfMonth },
        status: 'LATE'
      }
    })
  }

  // Fetch recent records for the current user (or all records for admin)
  const recentRecords = await prisma.attendanceRecord.findMany({
    where: user.role === 'ADMIN' ? {} : { userId: String(user.id) },
    orderBy: { actualTime: "desc" },
    take: 6,
    include: {
      event: { select: { title: true, attendanceType: true } },
      user: { select: { name: true } },
    }
  })

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    ON_TIME: { label: "On Time", color: "text-green-600", icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
    LATE: { label: "Late", color: "text-red-600", icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
    EARLY: { label: "Early", color: "text-blue-600", icon: <Timer className="h-4 w-4 text-blue-500" /> },
    OVERTIME: { label: "Overtime", color: "text-purple-600", icon: <Timer className="h-4 w-4 text-purple-500" /> },
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {user.name}</h2>
        <p className="text-muted-foreground">
          Here is what&apos;s happening with your attendance today.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {user.role === 'ADMIN' ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEmployees}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{presentToday}</div>
                <p className="text-xs text-muted-foreground">Checked in today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeLocations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDepartments}</div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Days Present</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysPresentThisMonth}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{lateArrivals}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Activity — real data */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {user.role === 'ADMIN' ? "Latest attendance records across all employees" : "Your latest attendance records"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 opacity-30" />
              <p>No attendance records yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRecords.map((record) => {
                const cfg = statusConfig[record.status] ?? { label: record.status, color: "text-foreground", icon: null }
                return (
                  <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="shrink-0">{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.role === 'ADMIN' && <span className="text-muted-foreground">{record.user.name} · </span>}
                        {record.event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.event.attendanceType === "CHECK_IN" ? "Check-In" : "Check-Out"} at{" "}
                        <LocalTime date={record.actualTime} />
                        {" · "}
                        {new Date(record.actualTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge
                        variant="outline"
                        className={cfg.color + " text-xs font-semibold"}
                      >
                        {cfg.label}
                      </Badge>
                      {record.lateMinutes > 0 && (
                        <p className="text-xs text-red-500 mt-0.5">+{record.lateMinutes}m</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
