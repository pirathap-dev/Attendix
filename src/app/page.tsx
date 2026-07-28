import { redirect } from "next/navigation"
import { auth } from "@/auth"
import Link from "next/link"

export default async function RootPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">Attendix</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-8 py-20 max-w-5xl mx-auto w-full gap-8">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-300 text-sm font-medium mb-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Enterprise Attendance Management
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter leading-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Workforce Attendance,<br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Reinvented.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
          GPS-verified, QR-powered attendance tracking for schools, factories, hospitals, and enterprises. 
          Real-time dashboards, automated reports, and bulletproof security — all in one platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transform"
          >
            Register as Employee
          </Link>
          <Link
            href="/login"
            className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 transform"
          >
            Log in →
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {["QR-Based Attendance", "GPS Verification", "Dynamic QR Codes", "Role-Based Access", "Audit Logs", "Export Reports"].map((f) => (
            <span key={f} className="bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full">
              {f}
            </span>
          ))}
        </div>
      </main>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto w-full px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: "🔐",
            title: "Tamper-Proof QR Codes",
            desc: "Rotating JWT tokens expire every 30 seconds. Screenshots and replays are useless.",
          },
          {
            icon: "📍",
            title: "GPS Geofencing",
            desc: "Employees can only check in within the allowed radius of the designated work location.",
          },
          {
            icon: "📊",
            title: "Instant Analytics",
            desc: "Real-time admin dashboards with late arrivals, overtime tracking, and department comparisons.",
          },
        ].map((feat) => (
          <div
            key={feat.title}
            className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 hover:border-blue-500/30 hover:bg-slate-800/60 transition-all"
          >
            <span className="text-3xl mb-3 block">{feat.icon}</span>
            <h3 className="text-white font-bold text-lg mb-2">{feat.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 text-center py-6 text-slate-500 text-sm">
        © {new Date().getFullYear()} Attendix. Enterprise Workforce Management Platform.
      </footer>
    </div>
  )
}
