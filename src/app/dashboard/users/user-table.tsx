"use client"

import { useState } from "react"
import { updateUserStatus, updateUserRole } from "@/actions/users"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Shield, UserCheck, UserX, RefreshCw } from "lucide-react"

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const
const ROLE_OPTIONS = ["EMPLOYEE", "SUPERVISOR", "ADMIN"] as const
type UserStatus = (typeof STATUS_OPTIONS)[number]
type UserRole = (typeof ROLE_OPTIONS)[number]

const statusStyles: Record<UserStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  REJECTED: "bg-gray-100 text-gray-600 border-gray-200",
}

interface UserTableProps {
  initialUsers: any[]
}

type ManageTarget = {
  user: any
  type: "status" | "role"
} | null

export default function UserTable({ initialUsers }: UserTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [manageTarget, setManageTarget] = useState<ManageTarget>(null)

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    setLoadingId(userId)
    try {
      await updateUserStatus(userId, status as any)
      setUsers(users.map((u) => (u.id === userId ? { ...u, status } : u)))
      toast.success(`Status updated to ${status}`)
      setManageTarget(null)
    } catch {
      toast.error("Failed to update status")
    } finally {
      setLoadingId(null)
    }
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setLoadingId(userId)
    try {
      await updateUserRole(userId, role as any)
      setUsers(users.map((u) => (u.id === userId ? { ...u, role } : u)))
      toast.success(`Role updated to ${role}`)
      setManageTarget(null)
    } catch {
      toast.error("Failed to update role")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      {/* Manage Dialog */}
      <Dialog open={!!manageTarget} onOpenChange={(open) => !open && setManageTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          {manageTarget?.type === "status" && (
            <>
              <DialogHeader>
                <DialogTitle>Change Status</DialogTitle>
                <DialogDescription>
                  Select a new status for <strong>{manageTarget.user.name}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    variant={manageTarget.user.status === s ? "default" : "outline"}
                    className="w-full justify-start"
                    disabled={manageTarget.user.status === s || loadingId === manageTarget.user.id}
                    onClick={() => handleStatusChange(manageTarget.user.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </>
          )}
          {manageTarget?.type === "role" && (
            <>
              <DialogHeader>
                <DialogTitle>Change Role</DialogTitle>
                <DialogDescription>
                  Select a new role for <strong>{manageTarget.user.name}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2">
                {ROLE_OPTIONS.map((r) => (
                  <Button
                    key={r}
                    variant={manageTarget.user.role === r ? "default" : "outline"}
                    className="w-full justify-start"
                    disabled={manageTarget.user.role === r || loadingId === manageTarget.user.id}
                    onClick={() => handleRoleChange(manageTarget.user.id, r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTarget(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className={loadingId === user.id ? "opacity-50 pointer-events-none" : ""}>
                <TableCell className="font-mono text-xs font-medium">{user.employeeId}</TableCell>
                <TableCell className="font-medium">
                  <div>
                    <div>{user.name}</div>
                    {user.position && (
                      <div className="text-xs text-muted-foreground">{user.position}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.department ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {user.role === "SUPERVISOR" && <Shield className="h-3.5 w-3.5 text-blue-500" />}
                    {user.role === "ADMIN" && <Shield className="h-3.5 w-3.5 text-purple-500" />}
                    <span className="text-sm">{user.role}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusStyles[user.status as UserStatus] ?? ""} variant="outline">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Quick approve for pending */}
                    {user.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleStatusChange(user.id, "ACTIVE")}
                        disabled={loadingId === user.id}
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    )}
                    {/* Quick suspend for active */}
                    {user.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleStatusChange(user.id, "SUSPENDED")}
                        disabled={loadingId === user.id}
                      >
                        <UserX className="h-3.5 w-3.5 mr-1" />
                        Suspend
                      </Button>
                    )}
                    {/* Reactivate for suspended */}
                    {user.status === "SUSPENDED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleStatusChange(user.id, "ACTIVE")}
                        disabled={loadingId === user.id}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Reactivate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setManageTarget({ user, type: "status" })}
                      disabled={loadingId === user.id}
                    >
                      Status
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setManageTarget({ user, type: "role" })}
                      disabled={loadingId === user.id}
                    >
                      Role
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
