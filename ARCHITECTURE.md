# StockSense — System Architecture & Layer Alignment

> **A clear architectural separation between Frontend (presentation, UX, design system) and Backend (double-entry stock engine, database, immutable ledger, and transaction guarantees).**

---

## 🏛️ High-Level System Architecture

```mermaid
flowchart TB
    subgraph FRONTEND ["Frontend Layer (Presentation & Client UX)"]
        UI["UI Design System (`components/ui.tsx`)"]
        Pages["Next.js Pages (`app/(app)/*` & `app/(auth)/*`)"]
        Nav["Sidebar & Nav (`components/sidebar.tsx`)"]
        Search["Quick SKU Finder (`components/quick-search.tsx`)"]
        ClientAPI["Client HTTP Adapter (`lib/client.ts`)"]
        Export["CSV Export Engine"]
    end

    subgraph API_GATEWAY ["API & Routing Layer"]
        Proxy["Next.js Middleware (RBAC Gate)"]
        Routes["RESTful Route Handlers (`app/api/*`)"]
        ZodVal["Zod Schema Validation (`backend/validators`)"]
    end

    subgraph BACKEND ["Backend Layer (Domain Engine & Business Logic)"]
        Engine["Double-Entry Stock Engine (`backend/engine`)"]
        Avail["Availability & Reserve Engine"]
        ValidateTx["Atomic Picking Validator (`validatePicking.ts`)"]
        Seq["Sequence Generator (`WH/IN`, `WH/OUT`, `WH/INT`)"]
        Alerts["Low-Stock Alert Trigger"]
    end

    subgraph PERSISTENCE ["Data & Persistence Layer"]
        PrismaClient["Prisma Client (`backend/db`)"]
        DB[(PostgreSQL Database)]
        Ledger[("Immutable StockLedger Table")]
        Quants[("Quant Balances Table")]
        Pickings[("Pickings & Moves Tables")]
    end

    Pages --> ClientAPI
    Search --> ClientAPI
    Export --> ClientAPI
    ClientAPI --> Proxy
    Proxy --> Routes
    Routes --> ZodVal
    ZodVal --> Engine
    Engine --> ValidateTx
    ValidateTx --> Avail
    ValidateTx --> Seq
    ValidateTx --> Alerts
    ValidateTx --> PrismaClient
    PrismaClient --> DB
    DB --> Ledger
    DB --> Quants
    DB --> Pickings
```

---

## 📂 Repository Directory Alignment

The codebase is organized into clear functional layers:

```
odoo/
├── frontend/                     # 🎨 FRONTEND ARCHITECTURE GATEWAY
│   ├── components/               # UI components, tables, search, navigation
│   └── index.ts                  # Client types, adapters, and UI exports
│
├── backend/                      # ⚙️ BACKEND ARCHITECTURE GATEWAY
│   ├── engine/                   # Core double-entry stock transactions
│   │   ├── validatePicking.ts    # Single-transaction validation & ledger commit
│   │   ├── availability.ts       # Stock reservation & negative balance prevention
│   │   ├── sequence.ts           # Automatic document sequence numbering
│   │   ├── alerts.ts             # Low-stock recalculation
│   │   └── rules.ts              # ERP location movement validation
│   ├── db/                       # Database client wrapper
│   │   └── index.ts              # Prisma singleton
│   ├── validators/               # Input validation
│   │   └── index.ts              # Zod schemas for pickings and master data
│   ├── services/                 # Business services
│   │   └── index.ts              # Auth, serialization, HTTP utilities
│   └── index.ts                  # Unified backend export
│
├── app/                          # 🌐 FULL-STACK APPLICATION RUNTIME (Next.js)
│   ├── (app)/                    # Authenticated workspace routes
│   │   ├── dashboard/            # Executive KPI dashboard & low-stock banner
│   │   ├── operations/           # Receipts, Deliveries, Transfers, Adjustments,
│   │   │                         # Kanban board, and Move History
│   │   ├── products/             # Product catalogue & location quants
│   │   ├── settings/             # Warehouse, location, and partner master data
│   │   └── profile/              # Operator profile & audit trail info
│   ├── (auth)/                   # Authentication screens
│   │   ├── login/                # Two-panel login with demo credentials
│   │   ├── signup/               # Operator self-service registration
│   │   └── reset/                # OTP recovery flow
│   └── api/                      # REST API endpoint handlers
│       ├── pickings/             # Draft, confirm, pick, pack, validate, cancel
│       ├── products/             # CRUD and location quant breakdown
│       ├── ledger/               # Append-only double-entry audit query
│       ├── master/               # Master data entities
│       └── auth/                 # NextAuth session handlers
│
├── prisma/                       # 🗄️ DATABASE & ORM DEFINITIONS
│   ├── schema.prisma             # Entity models (StockLedger, Quant, Picking, etc.)
│   ├── migrations/               # Versioned SQL migrations
│   └── seed.ts                   # Idempotent benchmark seed script
│
├── components/                   # Reusable visual UI elements & design tokens
├── lib/                          # Underlying core library implementation
└── scripts/                      # Developer smoke tests & CLI scripts
```

---

## 🔄 The Life of a Stock Transaction (Frontend → Backend)

To illustrate the clean separation between frontend interaction and backend processing, consider the path of a **Receipt Validation**:

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Warehouse Operator
    participant UI as Frontend (`/operations/receipts/[id]`)
    participant API as API Handler (`/api/pickings/[id]/validate`)
    participant Engine as Backend Engine (`validatePicking`)
    participant DB as PostgreSQL (`prisma.$transaction`)
    participant Ledger as Immutable StockLedger

    Operator->>UI: Clicks "Validate"
    UI->>API: POST /api/pickings/:id/validate (Session Cookie)
    API->>API: Verify NextAuth JWT (Staff / Manager)
    API->>Engine: validatePicking(pickingId, userId)
    
    activate Engine
    Engine->>DB: Begin Serializable Transaction
    Engine->>DB: Check Source & Dest Location Legality
    Engine->>DB: Verify Source Quant Availability (No Negative Balances)
    Engine->>DB: Decrement Source Quant & Increment Dest Quant
    Engine->>Ledger: Insert Immutable Move Rows (Audit Trail)
    Engine->>DB: Advance Sequence (e.g. WH/IN/00001)
    Engine->>DB: Transition State: ready → done
    Engine->>DB: Recalculate Product Alerts (low_stock / out_of_stock)
    DB->>Engine: Commit Transaction
    deactivate Engine
    
    Engine->>API: Return Serialized Picking Document
    API->>UI: 200 OK (Done State, Ledger Updated)
    UI->>Operator: Real-Time UI Update & Green Badge
```

---

## 🛡️ Architectural Guarantees

1. **Zero Phantom Quantities**:
   - Stock counts are never stored as arbitrary modifiable fields.
   - Company on-hand is calculated strictly as:
     $$\text{On-Hand} = \sum_{\text{location} \in \{\text{internal}, \text{production}\}} \text{Quant}(\text{product}, \text{location})$$

2. **Immutable Audit Trail**:
   - The `StockLedger` table has no `UPDATE` or `DELETE` API endpoints.
   - Any physical discrepancy (breakage, theft, loss) is resolved by generating a formal **Inventory Adjustment document** that moves stock to/from the virtual `inventory_loss` location.

3. **Atomic State Machine**:
   - Picking status transitions (`draft` → `waiting` → `ready` → `done` or `canceled`) cannot skip validation checks.
   - Overselling or moving unavailable stock throws an `InsufficientStockError`, returning a structured 400 response with available vs requested quantities.
