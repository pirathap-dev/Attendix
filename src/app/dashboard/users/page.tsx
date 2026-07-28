import { getUsers } from "@/actions/users"
import UserTable from "./user-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage employees, approve registrations, and assign roles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            A list of all users in the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable initialUsers={users} />
        </CardContent>
      </Card>
    </div>
  )
}
