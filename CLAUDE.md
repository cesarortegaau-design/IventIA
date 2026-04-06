# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Start all apps in dev mode (Turborepo orchestrates all three)
pnpm dev

# Build all apps
pnpm build

# Lint across monorepo
pnpm lint

# Database operations (run from packages/prisma or root)
pnpm db:migrate   # Run pending Prisma migrations
pnpm db:seed      # Seed default data (requires db:migrate)
pnpm db:studio    # Open Prisma Studio

# Run a single app
cd apps/api && pnpm dev       # API on :3001
cd apps/admin && pnpm dev     # Admin SPA on :5173
cd apps/portal && pnpm dev    # Portal SPA on :5174
```

Default dev credentials: `admin@exposaantafe.com.mx` / `Admin1234!`

## Architecture

**Monorepo:** Turborepo + pnpm workspaces
- `apps/api` — Express + TypeScript REST API
- `apps/admin` — React 18 + Vite + Ant Design 5 admin SPA
- `apps/portal` — React 18 + Vite exhibitor portal (Phase 5)
- `packages/prisma` — PostgreSQL schema via Prisma ORM, migrations, seeds
- `packages/shared` — Shared TypeScript types, Zod validators, permission constants

**Key infrastructure:** PostgreSQL 15, Redis (BullMQ jobs), Socket.io (real-time chat).

## API patterns

- All routes under `/api/v1/` require JWT auth via `authenticate` middleware
- Multi-tenancy: every query filters by `tenantId` extracted from JWT
- Services own business logic (`order.service.ts`, `pricing.service.ts`, `auth.service.ts`); controllers handle HTTP
- Centralized error handling via `AppError` class + `errorHandler.ts` middleware
- Atomic DB writes use `prisma.$transaction()`
- Status transitions tracked in `OrderStatusHistory`; EventSpace mutations are audit-logged to `AuditLog`

## Domain model essentials

**Event** — central entity with status machine `QUOTED → CONFIRMED → IN_EXECUTION → CLOSED` and three phases (SETUP, EVENT, TEARDOWN) with separate start/end times.

**EventSpace** — explicit resource allocation for an event+phase with a time range. This is the primary booking record. Changes are audit-logged.

**Order** — service contract for a client within an event. Line items reference Resources with dynamic pricing tiers (EARLY / NORMAL / LATE based on cutoff dates relative to order creation).

**Booking calendar** (`GET /bookings/calendar`) — merges EventSpaces (primary) and Orders with explicit `startDate`/`endDate` (secondary). Uses greedy interval scheduling to assign visual lanes and calculates overlap rank per resource for conflict visualization.

## Admin frontend patterns

- API layer in `apps/admin/src/api/*.ts` (axios clients)
- Server state via TanStack Query (`useQuery`, `useMutation`); auth state via Zustand
- Pages follow the pattern: query data → render Ant Design Table/Form/Modal
- Navigates with React Router; protected routes check JWT token in auth store
- PDF generation via `OrderPdf.tsx` (react-pdf)
