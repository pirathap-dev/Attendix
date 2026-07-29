import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEmployeesForFilter } from "@/actions/attendance"
import ReportsClient from "./reports-client"

export default async function ReportsPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const employees = await getEmployeesForFilter()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground">
          Preview, filter, and export attendance data for payroll and compliance.
        </p>
      </div>

      <ReportsClient employees={employees} />
    </div>
  )
}
