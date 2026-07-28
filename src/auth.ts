import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcryptjs from "bcryptjs"
import { prisma } from "@/lib/prisma"
import authConfig from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        employeeId: { label: "Employee ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.employeeId || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { employeeId: credentials.employeeId as string }
        })
        
        if (!user || user.status !== "ACTIVE") return null
        
        const passwordsMatch = await bcryptjs.compare(
          credentials.password as string, 
          user.passwordHash
        )
        
        if (passwordsMatch) {
          return {
            id: user.id,
            name: user.name,
            employeeId: user.employeeId,
            role: user.role,
            status: user.status
          } as any
        }
        
        return null
      }
    })
  ]
})
