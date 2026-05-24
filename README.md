# Marketing Hub — Internal Team Task Management

A production-ready internal marketing team task management system built with Next.js 16, Prisma, and PostgreSQL.

## Features
- Role-based auth (Admin / Team Lead / Team Member)
- Task management: List view, Kanban board (drag & drop), Calendar view
- Campaign management with progress tracking
- Approval workflow (submit → approve / request revision)
- Executive dashboard with charts (Recharts)
- Team performance dashboard
- Notification system
- Daily reports
- Dark / Light mode toggle

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth v5 (credentials)
- **State**: Zustand + TanStack Query
- **Charts**: Recharts
- **Drag & Drop**: dnd-kit

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally

### 2. Install dependencies
```bash
cd "Project Management/marketing-hub"
npm install
```

### 3. Configure environment
Edit `.env.local`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/marketing_hub"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_SECRET="same-as-nextauth-secret"
```

### 4. Set up database
```bash
npm run db:migrate    # Create tables
npm run db:seed       # Load demo data
```

### 5. Start the app
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Demo Login Credentials
| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@company.com | admin123 |
| **Team Lead** | manager@company.com | manager123 |
| Content Writer | emma@company.com | member123 |
| Graphic Designer | marcus@company.com | member123 |
| SEO Specialist | priya@company.com | member123 |
| Social Media | jordan@company.com | member123 |
| Video Editor | tyler@company.com | member123 |
| Email Marketer | sophia@company.com | member123 |

## Database Commands
```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Run pending migrations
npm run db:push       # Push schema (dev, no migration file)
npm run db:seed       # Seed demo data
npm run db:studio     # Open Prisma Studio GUI
```

## Project Structure
```
src/
├── app/
│   ├── login/                 # Login page
│   ├── (dashboard)/           # Protected app shell
│   │   ├── dashboard/         # Executive dashboard
│   │   ├── tasks/             # Task management (list/kanban/calendar)
│   │   ├── campaigns/         # Campaign management
│   │   ├── team/              # Team directory & workload
│   │   ├── reports/           # Daily reports
│   │   ├── notifications/     # Notification center
│   │   ├── calendar/          # Calendar view
│   │   └── settings/          # Account settings
│   └── api/                   # REST API routes
├── components/
│   ├── dashboard/             # Metric cards, charts, activity feed
│   ├── tasks/                 # Task cards, kanban, forms, detail panel
│   ├── campaigns/             # Campaign cards & forms
│   ├── team/                  # Team member components
│   └── shared/                # Badges, avatars, page header
├── lib/                       # Auth config, DB client, utilities
├── store/                     # Zustand stores (UI, tasks)
├── types/                     # TypeScript type definitions
└── providers/                 # Session, Query, Theme providers
prisma/
├── schema.prisma              # Full database schema
└── seed.ts                    # Demo data
```

## User Roles & Permissions

| Feature | Admin | Team Lead | Team Member |
|---------|-------|-----------|-------------|
| Create tasks | ✅ | ✅ | ✅ |
| Assign tasks | ✅ | ✅ | ❌ |
| Delete tasks | ✅ | ✅ | ❌ |
| Create campaigns | ✅ | ✅ | ❌ |
| Delete campaigns | ✅ | ❌ | ❌ |
| Approve tasks | ✅ | ✅ | ❌ |
| Create users | ✅ | ❌ | ❌ |
| View all tasks | ✅ | ✅ | Own only |
| View all dashboards | ✅ | ✅ | Limited |
