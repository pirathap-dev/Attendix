import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function MyAttendancePage() {
  const session = await auth()
  if (!session?.user) return null

  const records = await prisma.attendanceRecord.findMany({
    where: { userId: String(session.user.id) },
    orderBy: { createdAt: "desc" },
    include: {
      event: { select: { title: true, attendanceType: true } },
      location: { select: { name: true } },
    },
  })

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ON_TIME: "bg-green-100 text-green-800",
      LATE: "bg-red-100 text-red-800",
      EARLY: "bg-blue-100 text-blue-800",
      OVERTIME: "bg-purple-100 text-purple-800",
    }
    return (
      <Badge className={map[status] ?? ""} variant="outline">
        {status.replace("_", " ")}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Attendance History</h2>
        <p className="text-muted-foreground">View your daily logs, late arrivals, and overtime.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Log</CardTitle>
          <CardDescription>All your recorded attendance sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {new Date(record.actualTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{record.event.title}</TableCell>
                  <TableCell>{record.location.name}</TableCell>
                  <TableCell>
                    <Badge variant={record.event.attendanceType === "CHECK_IN" ? "default" : "secondary"}>
                      {record.event.attendanceType === "CHECK_IN" ? "In" : "Out"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {new Date(record.expectedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {new Date(record.actualTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>{statusBadge(record.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {record.lateMinutes > 0 && <span className="text-red-500 mr-2">{record.lateMinutes}m late</span>}
                    {record.overtimeMinutes > 0 && <span className="text-purple-500 mr-2">{record.overtimeMinutes}m OT</span>}
                    {Math.round(record.distance)}m away
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
