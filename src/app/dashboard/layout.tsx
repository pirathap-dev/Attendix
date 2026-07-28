import { auth } from "@/auth"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const user = session?.user

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar role={user?.role as string} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={{ name: user?.name, role: user?.role as string, employeeId: user?.employeeId as string }} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
