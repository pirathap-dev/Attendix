import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, MapPin, Building } from "lucide-react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user

  let totalEmployees = 0;
  let presentToday = 0;
  let activeLocations = 0;
  let totalDepartments = 0;
  let daysPresentThisMonth = 0;
  let lateArrivals = 0;

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
      where: {
        createdAt: { gte: today }
      }
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}</h2>
        <p className="text-muted-foreground">
          Here is what's happening with your attendance today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <CardTitle className="text-sm font-medium">Days Present (This Month)</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysPresentThisMonth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{lateArrivals}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              [Chart Component Placeholder]
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Checked In</p>
                  <p className="text-sm text-muted-foreground">Today at 08:55 AM</p>
                </div>
                <div className="ml-auto font-medium text-green-600">ON TIME</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
