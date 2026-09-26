# 📦 StockSense — Enterprise Inventory & Warehouse Engine

[![Production](https://img.shields.io/badge/Production-Live%20on%20Vercel-success?style=for-the-badge&logo=vercel)](https://odoo-omega.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

> **Documents drive stock. The ledger is the audit trail.**  
> StockSense replaces manual registers, Excel sheets, and scattered tracking with a centralized, real-time, double-entry inventory management system built to Odoo ERP standards.

---

## 🌐 Live Application & Demo Credentials

🚀 **Live Deployment URL:** **[https://odoo-omega.vercel.app](https://odoo-omega.vercel.app)**  
*(Repository: [github.com/nirmal192421215/odoo-StockSense](https://github.com/nirmal192421215/odoo-StockSense))*

| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| **Inventory Manager** | `manager@stocksense.dev` | `StockSense!1` | Full administrative control (Products, Warehouses, Stock Adjustments, Reorder thresholds) |
| **Warehouse Staff** | `staff@stocksense.dev` | `StockSense!1` | Floor operations (Pick, Pack, Validate receipts & deliveries, view move history) |
| **Password Reset OTP** | *(Any email)* | `123456` | Automated OTP reset flow |

⚡ **Keyboard Shortcut:** Press **`Cmd + K`** (or `Ctrl + K`) anywhere to open the instant Spotlight SKU finder.

---

## 🎯 The Problem & Our Core Architecture

Spreadsheets and naive CRUD apps store stock as arbitrary editable numbers. This leads to **phantom stock**, untraceable theft, race conditions during high-volume operations, and zero audit integrity.

### The StockSense Guarantees:
1. **Zero Phantom Inventory**: Stock is never an editable field. On-hand quantity is mathematically computed across internal locations (`StockQuant(product, location) = qty`).
2. **Immutable Double-Entry Ledger**: Every physical movement appends a permanent record to `StockLedger` (From Location ➔ To Location). History cannot be modified or deleted.
3. **Atomic Concurrency Protection**: High-volume picking runs inside atomic PostgreSQL transactions using row-level locking (`SELECT ... FOR UPDATE`), preventing overselling and race conditions.
4. **Strict ERP Operations State Machine**: Documents transition strictly through `Draft ➔ Waiting / Ready ➔ Done` (or `Canceled`).

```
Product ──► StockQuant (productId, locationId, qty)
              ▲
Picking ──► PickingLine ──► StockMove  ──► StockQuant Δ
                                │
                          StockLedger  (Immutable Audit Trail)
```

---

## 🏆 Key Features

- **Automated Document Workflows**:
  - **Receipts**: Inbound deliveries from vendors with warehouse-prefixed sequence numbers (`WH1/IN/00001`).
  - **Internal Transfers**: Relocate goods between aisles, bays, or warehouse annexes (`WH1/INT/00001`).
  - **Deliveries**: 3-stage validation pipeline (`Pick ➔ Pack ➔ Validate`) with printable CSS delivery slips.
  - **Inventory Adjustments**: Physical inventory reconciliation via virtual `Virtual/Inventory Loss` with clear discrepancy accounting.
- **Interactive 2D Warehouse Digital Twin (`/operations/map`)**:
  - Live top-down visual floor plan of physical bays and racks.
  - Color-coded capacity heatmaps and click-to-transfer rack drawers.
- **Operations Kanban Board (`/operations/kanban`)**:
  - Visual 5-column pipeline (`Draft`, `Waiting`, `Ready`, `Done`, `Canceled`) with one-click toggling between Tabular and Kanban views.
- **Move History & Audit Ledger (`/operations/history`)**:
  - Full movement audit trail with green (`+` Inbound) and red (`-` Outbound) row accents, multi-parameter filtering, and **1-click CSV Export**.
- **Spotlight SKU Quick-Search (`⌘K`)**:
  - Global command palette mounted via React Portals for instant product lookups across all screens.

---

## 🎬 3-Minute Live Jury Walkthrough — "The Steel Story"

Demonstrates full mathematical integrity, oversell protection, and role-based access in 3 minutes:

| Step | Operation | Action | Verification |
|---|---|---|---|
| **1** | **Receipt** | Receive 100 kg Steel (`STL-001`) from *Steel Vendor* ➔ `WH1/Main Store` | Stock updates from 0 to **100 kg** at Main Store. |
| **2** | **Transfer** | Transfer 100 kg Steel from `Main Store` ➔ `Production Rack` | Main Store shows 0 kg; Production Rack shows **100 kg**. |
| **3** | **Oversell Block** | Attempt customer delivery of **999 kg** Steel | System halts with error: *"Insufficient quantity for STL-001 at WH1/Production Rack (have 100, need 999)"*. |
| **4** | **Delivery** | Deliver 20 kg Steel to *Demo Customer* (`Pick ➔ Pack ➔ Validate`) | Production drops to **80 kg**; Delivery note print slip available. |
| **5** | **Adjustment** | Perform count audit: physical count = 77 kg (damaged) | Discrepancy of **−3 kg** formally posted to `Virtual/Inventory Loss`. |
| **6** | **Ledger Audit** | Open `/operations/history` and filter by `STL-001` | Exact 4-step immutable paper trail: Receipt ➔ Transfer ➔ Delivery ➔ Adjustment. |
| **7** | **RBAC Gate** | Log in as `staff@stocksense.dev` | Master settings and delete actions are hidden; staff role badge displayed. |

---

## 💻 Tech Stack & Engineering Decisions

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (Turbopack, App Router) | Zero-latency server components and serverless API route handlers |
| **Language** | TypeScript 5 | Strict static typing across domain rules, sequences, and database transactions |
| **Database** | PostgreSQL (Neon Serverless) | ACID transactions, connection pooling, and row-level locking (`FOR UPDATE`) |
| **ORM** | Prisma 6 | Single source of truth schema with compile-time type safety |
| **Styling** | Vanilla CSS + Tailwind CSS | Custom design system matching modern enterprise ERP standards |
| **Auth** | NextAuth.js (Credentials + JWT) | Secure session cookies, role guards, and OTP reset engine |
| **Validation** | Zod | Runtime input verification at all API boundaries |

---

## 🛠️ Local Development & Setup

### 1. Clone & Install
```bash
git clone https://github.com/nirmal192421215/odoo-StockSense.git
cd odoo-StockSense
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://stocksense:stocksense@localhost:5432/stocksense"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="stocksense-local-dev-secret-change-in-prod-32ch"
AUTH_DEMO_OTP="123456"
```

### 3. Initialize Database & Seed
```bash
npm run db:reset    # Applies migrations and seeds 10 industrial catalogue items
npm run stock:smoke # Executes automated end-to-end engine smoke tests
```

### 4. Start Development Server
```bash
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 📁 Repository Structure

```
├── app/
│   ├── (auth)/            # Login, Signup, OTP password recovery
│   ├── (app)/             # Authenticated workspace shell
│   │   ├── dashboard/     # Real-time KPI analytics & alert banners
│   │   ├── operations/    # Receipts, Deliveries, Transfers, Adjustments, Map, Kanban
│   │   ├── products/      # Catalog list, details, and location quant breakdown
│   │   └── settings/      # Warehouse, Location, Partner, Category configuration
│   └── api/               # Serverless API routes (pickings, ledger, map, master)
├── components/            # UI components (warehouse-map, quick-search, picking-table)
├── lib/
│   ├── stock/             # Core stock engine (validate, confirm, sequence, quant)
│   ├── auth.ts            # NextAuth role-based access guards
│   └── db.ts              # Prisma singleton client
├── prisma/
│   ├── schema.prisma      # 13 relational models and 6 enums
│   └── seed.ts            # Idempotent 10-product seed script
└── scripts/
    └── stock-smoke.ts     # Automated integrity test suite
```

---

*StockSense — Built for the Hackathon 2026 Submission.*
