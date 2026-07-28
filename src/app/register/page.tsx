"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { registerEmployee } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { UserPlus, CheckCircle2 } from "lucide-react"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  employeeId: z.string().min(2, "Employee ID is required"),
  department: z.string().min(2, "Department is required"),
  position: z.string().min(2, "Position is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "", email: "", phone: "", employeeId: "",
      department: "", position: "", password: "", confirmPassword: ""
    }
  })

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true)
    try {
      const result = await registerEmployee(data)
      if (result.success) {
        setIsSuccess(true)
      } else {
        toast.error("Registration failed", { description: result.error || "Something went wrong." })
      }
    } catch {
      toast.error("Error", { description: "An unexpected error occurred." })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
        <Card className="w-full max-w-md text-center border-t-4 border-t-green-500 shadow-xl">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">Registration Submitted!</CardTitle>
            <CardDescription>Your account is awaiting administrator approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-6">
              An organization administrator will review and approve your registration shortly. You will be able to log in once your account is activated.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg text-sm font-medium transition-colors"
            >
              Go to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 py-12">
      <Card className="w-full max-w-xl shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Employee Registration</CardTitle>
              <CardDescription>Enter your information to join the platform</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...form.register("name")} placeholder="John Doe" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input id="employeeId" {...form.register("employeeId")} placeholder="EMP-001" />
                {form.formState.errors.employeeId && <p className="text-xs text-destructive">{form.formState.errors.employeeId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...form.register("email")} placeholder="john@example.com" />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...form.register("phone")} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department *</Label>
                <Input id="department" {...form.register("department")} placeholder="Finance" />
                {form.formState.errors.department && <p className="text-xs text-destructive">{form.formState.errors.department.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="position">Position *</Label>
                <Input id="position" {...form.register("position")} placeholder="Accountant" />
                {form.formState.errors.position && <p className="text-xs text-destructive">{form.formState.errors.position.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" {...form.register("password")} placeholder="Min. 6 characters" />
                {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
                {form.formState.errors.confirmPassword && <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full mt-6 h-10" disabled={isLoading}>
              {isLoading ? "Registering…" : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
