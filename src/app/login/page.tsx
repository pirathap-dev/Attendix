"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { LogIn } from "lucide-react"

const loginSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeId: "", password: ""
    }
  })

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    try {
      const res = await signIn("credentials", {
        employeeId: data.employeeId,
        password: data.password,
        redirect: false,
      })

      if (res?.error) {
        toast("Login failed", {
          description: "Invalid credentials or account is pending/suspended.",
        })
      } else {
        toast("Success", {
          description: "Logged in successfully.",
        })
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      toast("Error", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription>
            Enter your Employee ID and password to access Attendix
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" {...form.register("employeeId")} placeholder="EMP-001" />
              {form.formState.errors.employeeId && <p className="text-sm text-destructive">{form.formState.errors.employeeId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center flex-col gap-2 border-t pt-4">
          <p className="text-sm text-muted-foreground text-center">
            Don't have an account? <Link href="/register" className="text-primary hover:underline">Register here</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
