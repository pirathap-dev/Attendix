<div align="center">
  <img src="public/logo.png" alt="Attendix Logo" width="120" />
  <p><strong>A Modern, Geo-Fenced QR Attendance System Built for Enterprise</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </p>
</div>

<br />

**Attendix** is a full-stack, enterprise-grade attendance management solution designed to streamline employee tracking. It eliminates manual time logging by combining **Dynamic QR Code Scanning** with **GPS Geofencing**, ensuring that employees can only mark their attendance when they are physically present at the authorized workplace.

---

## ✨ Key Features

- 📍 **GPS Geofencing Authentication** — Validates employee coordinates against predefined workplace boundaries (radius-based) before accepting a check-in.
- 📱 **Dynamic QR Code Check-Ins** — Time-sensitive QR codes generated for each session to prevent spoofing or buddy-punching.
- ⏳ **Paired Work Sessions** — Intelligently links `CHECK_IN` and `CHECK_OUT` events to calculate accurate daily working hours.
- 📊 **Comprehensive Analytics Dashboard** — Employees can track their hours, late arrivals, and overtime at a glance.
- 📑 **Admin Reporting & Exporting** — Filter and preview attendance records. Export data seamlessly to **Excel (.xlsx)** or **PDF**.
- 🔒 **Role-Based Access Control (RBAC)** — Secure NextAuth integration distinguishing between `ADMIN` and `EMPLOYEE` permissions.
- 🎨 **Beautiful & Responsive UI** — Built with Tailwind CSS and Shadcn UI, featuring dark mode support and a polished, professional aesthetic.

---

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server Actions) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (End-to-end type safety) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) managed by [Prisma ORM](https://www.prisma.io/) |
| **Authentication** | [NextAuth.js (Auth.js)](https://authjs.dev/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/) |
| **Maps & Location** | Geolocation API & Coordinate Math (Haversine Formula) |
| **Exporting** | `exceljs` (Spreadsheets), `pdfkit` (PDF Reports) |

---

## 🏗️ Architecture & Flow

1. **Event Creation**: Admins create a **Work Session** linked to a specific Location (with Latitude/Longitude/Radius).
2. **QR Generation**: The system generates a cryptographic QR Token. 
3. **Employee Scan**: Employee scans the QR code using their smartphone.
4. **Validation**: 
   - Decrypts the QR token.
   - Pings device GPS.
   - Calculates distance to the designated Location.
   - *Fails* if outside radius; *Success* if inside radius.
5. **Data Processing**: Computes `ON_TIME`, `LATE`, or `OVERTIME` status. Records the time and links the session.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL Database (Local or Cloud like Supabase/Neon)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pirathap-dev/Attendix.git
   cd Attendix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/attendix"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key"

   # App Settings
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Initialize the Database**
   Push the schema to your database and run the seed script to create the default Admin account.
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📂 Project Structure

```
src/
├── actions/       # Next.js Server Actions (Auth, Attendance, Events)
├── app/           # App Router Pages & API Routes
├── components/    # Reusable UI Components (Shadcn, Forms, Maps)
├── lib/           # Utility functions (Prisma client, Calculations, Utils)
└── ...
```

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <i>Developed with precision and passion.</i>
</div>
