# Attendix — Implementation Walkthrough

## What Was Built

A fully production-ready, enterprise-grade **Attendance & Workforce Management Platform** across 6 phases.

---

## Admin Credentials (First Login)

| Field | Value |
|---|---|
| **Employee ID** | `ADMIN-001` |
| **Password** | `Admin@12345` |

> [!CAUTION]
> Change this password immediately after your first login!

---

## Application Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Login with Employee ID + Password |
| `/register` | Public | Employee self-registration |
| `/attendance?token=...` | Public (QR scan) | Mark attendance via QR |
| `/dashboard` | All roles | Role-aware dashboard |
| `/dashboard/attendance` | All roles | Personal attendance log |
| `/dashboard/events` | Admin, Supervisor | Create events & show QR codes |
| `/dashboard/locations` | Admin | Manage GPS work locations with map |
| `/dashboard/users` | Admin | Approve, suspend, promote users |
| `/dashboard/reports` | Admin | Export reports (CSV/PDF) |

---

## Key Features Implemented

### 🔐 Authentication
- Employee ID + Password login (NOT email)
- Auth.js (NextAuth v5 beta) with encrypted JWT sessions
- Role-Based Access Control (Admin, Supervisor, Employee)
- Route protection via `proxy.ts` (Next.js 16 convention)

### 👥 User Management
- Employee self-registration → **Pending Approval** status
- Admin approves / rejects / suspends / promotes to Supervisor
- Audit logging for all administrative actions

### 📍 Attendance Locations (Admin)
- Create work locations with an **interactive map picker** (click to pin)
- Configurable allowed radius (slider, 10m–1000m)
- Visual radius circle on the map

### 📅 Attendance Events (Supervisor/Admin)
- Create Check-In or Check-Out events
- Each event generates a **secure, rotating QR code**
- QR code refreshes every **25 seconds** (JWT expires at 30s)
- Screenshots cannot be reused

### 📱 Employee Attendance Flow
1. Scan QR code → opens `/attendance?token=...`
2. Browser requests GPS location
3. Server verifies: token validity, GPS radius, duplicate prevention
4. Calculates: **Early / On Time / Late / Overtime** status
5. Records: actual time, lat/lng, distance, browser, IP

### 📊 Dashboard
- Admin: Total employees, present today, active locations
- Employee: Personal daily attendance log with status badges

---

## Database Schema (Prisma)

Models: `User`, `Location`, `AttendanceEvent`, `AttendanceRecord`, `OrganizationSettings`, `AuditLog`

---

## Setup Instructions

### 1. Prerequisites
- Node.js 20+, PostgreSQL running

### 2. Environment
```bash
cp .env.example .env.local
# Edit .env.local with your DB credentials
```

### 3. Database Setup
```bash
npx prisma db push        # Create tables
npm run db:seed           # Create initial admin (ADMIN-001 / Admin@12345)
```

### 4. Run Locally
```bash
npm run dev               # http://localhost:3000
```

### 5. Docker Deployment
```bash
docker-compose up -d      # Starts PostgreSQL + App
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui v4 |
| Database | PostgreSQL + Prisma ORM v5 |
| Auth | Auth.js (NextAuth v5 beta) |
| QR Tokens | JWT (30s expiry) |
| Maps | Leaflet + OpenStreetMap |
| Toasts | Sonner |
| Deployment | Docker + Docker Compose |
