# IventIA — Event Management SaaS

## Architecture

- **Monorepo** with Turborepo + pnpm workspaces
- **Backend**: Node.js + Express + TypeScript + Prisma (PostgreSQL)
- **Frontend Admin**: React 18 + Vite + Ant Design + React Query + Zustand
- **Database**: PostgreSQL 15
- **Cache/Jobs**: Redis + BullMQ
- **Hosting**: Microsoft Azure

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker Desktop

### 1. Start database and Redis
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Set up environment
```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values
```

### 4. Run migrations and seed
```bash
cd packages/prisma
pnpm db:migrate
pnpm db:seed
```

### 5. Start development servers
```bash
pnpm dev
```

- Admin UI: http://localhost:5173
- API: http://localhost:3001
- API Health: http://localhost:3001/health

### Default login
- Email: `admin@exposaantafe.com.mx`
- Password: `Admin1234!`

## Project Structure

```
apps/
  admin/      — IventIA Core admin frontend (React)
  portal/     — Exhibitor portal (React) [Phase 5]
  api/        — REST API (Express + TypeScript)
packages/
  prisma/     — Database schema, migrations, seed
  shared/     — Shared types, constants, validators
```

## Modules Built (MVP)

- [x] Authentication (JWT)
- [x] Role-based + privilege-based authorization
- [x] Catalog: Resources (Consumables, Equipment, Spaces, Furniture, Services)
- [x] Catalog: Departments
- [x] Catalog: Price Lists with Early/Normal/Late pricing
- [x] Catalog: Clients (Physical & Moral persons)
- [x] Catalog: Users & Privileges
- [x] Events (full CRUD + status machine + phases)
- [x] Stands per event
- [x] Service Orders (full workflow: Quoted → Confirmed → In Payment → Paid → Invoiced)
- [x] Payments (multi-payment per order)
- [x] Credit Notes
- [x] Accounting Dashboard
- [x] Operations Dashboard
- [x] Calendar view (monthly)

## Roadmap

- [ ] Phase 5: Exhibitor Portal
- [ ] Document uploads (Azure Blob Storage)
- [ ] Email/WhatsApp notifications (SendGrid + Twilio)
- [ ] PDF/Excel report generation
- [ ] Azure infrastructure deployment (Bicep)
