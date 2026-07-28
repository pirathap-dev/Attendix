import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/attendance"]

// The proxy function replaces the old "middleware" in Next.js 16+
export default auth(function proxy(req) {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Always allow API auth routes
  if (isApiAuthRoute) return null

  // Allow public routes
  if (isPublicRoute) {
    // If already logged in and visiting login/register, redirect to dashboard
    if (
      isLoggedIn &&
      (nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register"))
    ) {
      return Response.redirect(new URL("/dashboard", nextUrl))
    }
    return null
  }

  // Require login for all other routes
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(
      nextUrl.pathname + (nextUrl.search || "")
    )
    return Response.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    )
  }

  // Role-based route protection
  const role = req.auth?.user?.role

  if (nextUrl.pathname.startsWith("/dashboard/users") && role !== "ADMIN") {
    return Response.redirect(new URL("/dashboard", nextUrl))
  }

  if (nextUrl.pathname.startsWith("/dashboard/locations") && role !== "ADMIN") {
    return Response.redirect(new URL("/dashboard", nextUrl))
  }

  if (
    nextUrl.pathname.startsWith("/dashboard/events") &&
    role !== "ADMIN" &&
    role !== "SUPERVISOR"
  ) {
    return Response.redirect(new URL("/dashboard", nextUrl))
  }

  return null
})

export const config = {
  matcher: [
    // Skip internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
