import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { User, Shield, Building, Phone, Mail, Calendar, BadgeCheck } from "lucide-react"
import ChangePasswordForm from "./change-password-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: String(session.user.id) },
    select: {
      name: true,
      email: true,
      role: true,
      status: true,
      employeeId: true,
      department: true,
      position: true,
      phone: true,
      joiningDate: true,
    }
  })

  if (!user) redirect('/login')

  const profileFields = [
    { icon: User, label: "Full Name", value: user.name },
    { icon: Mail, label: "Email", value: user.email ?? "Not set" },
    { icon: BadgeCheck, label: "Employee ID", value: user.employeeId, mono: true },
    { icon: Shield, label: "Role", value: user.role, badge: true },
    { icon: Building, label: "Department", value: user.department ?? "Not assigned" },
    { icon: User, label: "Position", value: user.position ?? "Not set" },
    { icon: Phone, label: "Phone", value: user.phone ?? "Not set" },
    { icon: Calendar, label: "Joining Date", value: user.joiningDate ? new Date(user.joiningDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not set" },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          View your profile information and manage your account security.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            My Profile
          </CardTitle>
          <CardDescription>Your personal information and role details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profileFields.map(({ icon: Icon, label, value, mono, badge }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
                  {badge ? (
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
                      {value}
                    </span>
                  ) : (
                    <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  )
}
