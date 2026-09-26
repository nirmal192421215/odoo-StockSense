# StockSense

> **Inventory the way ERP does it — documents, locations, and an immutable ledger.**

StockSense is a full-stack warehouse management system that replicates the core domain model of Odoo Stock, built from scratch as a custom Next.js application.

---

## The Problem

Excel sheets and paper registers don't tell you *where* your stock is, *why* a quantity changed, or *who* touched it. Traditional spreadsheet-based inventory leads to:

- Silent quantity edits with no audit trail
- No per-location visibility (is it at the main store or production?)
- No shortage protection — anyone can deliver stock that doesn't exist
- No document trail linking deliveries to receipts

## Our Solution

StockSense enforces the correct inventory model:

- **Documents first** — a `Receipt`, `Delivery`, `Transfer`, or `Adjustment` must be validated before stock moves. No direct quantity edits.
- **Per-location quants** — `StockQuant(product, location) = qty`. The question is never "how many do we have?" but "how many at which location?"
- **Immutable ledger** — every validated movement creates an append-only `StockLedger` entry. History cannot be altered.
- **Shortage protection** — validate is blocked when source qty < demand. Attempts surface a precise error: `Insufficient quantity for STL-001 at WH1/Production Rack (have 77, need 999)`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 (App Router)                │
├──────────────┬──────────────────────────────────────────────┤
│  UI (Client) │  API Routes (Server)  │  Stock Engine (lib/) │
│  components/ │  app/api/...          │  lib/stock/          │
│  app/(app)/  │  Route Handlers       │  validatePicking.ts  │
│  app/(auth)/ │  Zod validation       │  confirmPicking.ts   │
└──────────────┴──────────────────────────────────────────────┘
                          │
                    Prisma ORM
                          │
                  PostgreSQL 16
                          │
          ┌───────────────┼───────────────┐
     StockQuant      StockMove      StockLedger
   (live qty)     (immutable)     (append-only)
```

### Domain Model

```
Product ──► StockQuant (productId, locationId, qty)
              ▲
Picking ──► PickingLine ──► StockMove  ──► StockQuant Δ
                               │
                          StockLedger  (audit trail)
```

### Document States

```
draft → [confirm] → ready | waiting → [validate] → done
                    waiting → [recheck] → ready
draft | waiting | ready → [cancel] → canceled
done  → (cancel blocked — create a reverse document)
```

---

## Features

| Feature | Detail |
|---|---|
| Auth | Credentials login, JWT session, OTP password reset |
| Roles | `inventory_manager` (full access) · `warehouse_staff` (operate, no delete) |
| Receipts | Vendor → Internal; Confirm + Validate in 2 clicks |
| Deliveries | Pick → Pack → Validate; shortage protection on each step |
| Transfers | Internal location-to-location movements |
| Adjustments | Counted qty vs system qty; delta posted via `inventory_loss` |
| Dashboard | 6 live KPI cards; 5-way filter; recent activity table |
| Products | SKU search, category filter, qty-per-location, opening stock |
| Ledger | Full move history with product/location/type/date filters |
| Kanban | Visual column board: Draft / Waiting / Ready / Done |
| Print slip | CSS `@media print` delivery note |
| Low-stock banner | Alert cache refreshed on every Validate |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Server components, route handlers, no extra server |
| Language | **TypeScript 5** | Type-safe domain model |
| Styling | **Tailwind CSS 4** | Utility-first + custom design tokens |
| Auth | **NextAuth.js 4** (Credentials + JWT) | Cookie session, role on token |
| ORM | **Prisma 6** | Type-safe queries, migrations, transactions |
| Database | **PostgreSQL 16** | ACID + `SELECT FOR UPDATE` for quant locking |
| Validation | **Zod 4** | Schema validation on every mutation |
| Passwords | **bcryptjs** | Secure password hashing |

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- PostgreSQL 16 (local or Docker)

### 1. Clone and install

```bash
git clone https://github.com/yourteam/stocksense
cd stocksense
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit DATABASE_URL and NEXTAUTH_SECRET
```

`.env` example:
```
DATABASE_URL=postgresql://stocksense:stocksense@localhost:5432/stocksense
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
AUTH_DEMO_OTP=123456
```

### 3. Start database

**Option A — Local PostgreSQL:**
```bash
# Create DB and user (PostgreSQL must be running)
createuser -s stocksense
createdb -U stocksense stocksense
psql -d stocksense -c "ALTER USER stocksense WITH PASSWORD 'stocksense';"
```

**Option B — Docker:**
```bash
npm run db:up
```

### 4. Migrate and seed

```bash
npm run db:migrate   # Apply schema migrations
npm run db:seed      # Create demo users, warehouses, products
```

### 5. Run

```bash
npm run dev
# Open http://localhost:3000
```

### 6. (Optional) Smoke test the engine

```bash
npm run stock:smoke
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Inventory Manager | `manager@stocksense.dev` | `StockSense!1` |
| Warehouse Staff | `staff@stocksense.dev` | `StockSense!1` |
| Demo OTP | any email | `123456` |

---

## Live Jury Demo — The Steel Story

This path demonstrates every core feature in ~3 minutes:

| Step | Action | Expected outcome |
|---|---|---|
| 1 | **Receipt** — 100 kg Steel from Steel Vendor → WH1/Main Store | Quant: +100 at Main Store |
| 2 | **Transfer** — 100 kg Main Store → Production Rack | 0 at Main Store, 100 at Production |
| 3 | **Delivery** — 20 kg Production → Demo Customer (pick → pack → validate) | 80 at Production |
| 4 | **Adjustment** — counted 77 at Production (reason: "damaged") | Delta −3 posted |
| 5 | **Ledger** — filter by STL-001 | 4 rows: receipt, transfer, delivery, adjustment |
| 6 | **Delivery** — try qty 999 | Error: `Insufficient quantity for STL-001 at WH1/Production Rack (have 77, need 999)` |
| 7 | **Staff login** | No delete buttons; Settings is read-only |

---

## Database Scripts

```bash
npm run db:up       # Start Postgres via Docker Compose
npm run db:migrate  # Run migrations (prisma migrate dev)
npm run db:seed     # Seed demo data (idempotent)
npm run db:reset    # Reset and reseed (local only)
npm run stock:smoke # End-to-end engine assertions
```

---

## Project Structure

```
app/
  (auth)/              # Login, signup, OTP reset
  (app)/               # Authenticated shell (sidebar + main)
    dashboard/         # KPI dashboard
    products/          # Product list and form
    operations/        # Receipts, deliveries, transfers, adjustments
      history/         # Move ledger
      kanban/          # Visual board
    settings/          # Warehouses and locations (manager only)
    profile/           # Name edit
  api/                 # Route handlers (NextAuth, products, pickings, …)
components/            # Shared UI (sidebar, picking-form, ui primitives)
lib/
  auth.ts              # NextAuth options + role guards
  db.ts                # Prisma singleton
  stock/               # Engine: validate, confirm, cancel, create
  validators/          # Zod schemas
prisma/
  schema.prisma        # 13 models, 6 enums
  seed.ts              # Idempotent demo data
scripts/
  stock-smoke.ts       # Steel story + oversell assertions
```

---

## Library Credits

- [Next.js](https://nextjs.org) — framework
- [React](https://react.dev) — UI
- [TypeScript](https://www.typescriptlang.org) — types
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Prisma](https://prisma.io) — ORM
- [NextAuth.js](https://next-auth.js.org) — authentication
- [Zod](https://zod.dev) — validation
- [PostgreSQL](https://postgresql.org) — database
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — password hashing

---

## What We Don't Build (Intentional Scope)

- Odoo XML-RPC addon (this is a standalone app)
- Barcode hardware integration
- ML / demand forecasting
- Native mobile app
- Multi-currency, lots/serials, reservations table
- Kanban drag-to-done (would bypass validate)

---

*StockSense — Hackathon Submission 2026*
