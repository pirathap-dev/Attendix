import { PrismaClient } from "@prisma/client"
import bcryptjs from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create organization settings
  const existingSettings = await prisma.organizationSettings.findFirst()
  if (!existingSettings) {
    await prisma.organizationSettings.create({
      data: {
        name: "Attendix Organization",
        timezone: "UTC",
      },
    })
    console.log("✅ Organization settings created")
  }

  // Create initial admin account
  const existingAdmin = await prisma.user.findUnique({
    where: { employeeId: "ADMIN-001" },
  })

  if (!existingAdmin) {
    const passwordHash = await bcryptjs.hash("Admin@12345", 10)

    await prisma.user.create({
      data: {
        name: "Organization Admin",
        employeeId: "ADMIN-001",
        email: "admin@attendix.com",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        department: "Administration",
        position: "System Administrator",
      },
    })

    console.log("✅ Admin account created")
    console.log("")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("  INITIAL ADMIN CREDENTIALS")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("  Employee ID : ADMIN-001")
    console.log("  Password    : Admin@12345")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("  ⚠️  Change this password immediately after first login!")
    console.log("")
  } else {
    console.log("ℹ️  Admin account already exists, skipping.")
  }

  console.log("🎉 Seed complete!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
