import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

export default {
  providers: [
    Credentials({
      credentials: {
        employeeId: { label: "Employee ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // Authorize logic is mostly Edge compatible except bcrypt.
      // But we will override this in auth.ts where node environment is guaranteed, or we can just leave empty config for Edge middleware
      authorize: async () => null // Overridden in auth.ts
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.employeeId = user.employeeId
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.employeeId = token.employeeId as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  }
} satisfies NextAuthConfig
