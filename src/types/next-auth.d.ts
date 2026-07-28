import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      employeeId: string
      role: string
      status: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    employeeId: string
    role: string
    status: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    employeeId: string
    role: string
    status: string
  }
}
