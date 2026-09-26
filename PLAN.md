# StockSense — Full Implementation Plan

**Product thesis:** StockSense replaces Excel and paper registers with a single operational system: warehouse documents drive stock, stock is always per location, and the stock ledger is the audit trail.

**Pitch line:** We implemented inventory the way ERP does: documents, locations, and an immutable ledger—not a quantity field on the product.

**Judging lens:** problem understanding, technical implementation, feasibility, UI/UX, presentation. Real database, consistent UI, robust validation, intuitive navigation. Not a generic CRUD app — an inventory engine that behaves like Odoo Stock.

This file is the source of truth for implementation. If a feature is not here, we do not build it.

**Progress tracker:** see `STATUS.md`. Engine + APIs + auth were done first. Operational UI (dashboard, products, four operations, ledger, kanban, print, settings, profile) is in the tree. Next: fix Prisma CLI, migrate/seed, smoke test, README, deploy.

---

## 1. What we are building (and what we are not)

A custom full-stack app that copies **Odoo’s inventory model and visual language**, not an Odoo addon.

| In scope | Out of scope |
| --- | --- |
| Auth (signup, login, OTP reset) | Odoo addon / XML-RPC |
| Roles: manager vs warehouse staff | Barcode hardware |
| Documents with states; stock only on Validate | ML / forecasting |
| Per-location quants + append-only ledger | Native mobile app |
| Four operations + dashboard + settings | Multi-currency, lots/serials, reservations table |
| Kanban, shortage protection, printable slip | Drag-and-drop Kanban that mutates stock |
| Zod on every mutation | Extra features beyond the three extras |

**Stop rule:** if behind, drop Kanban / print / OTP email. Keep `validatePicking` + ledger + dashboard + four operations.

---

## 2. Stack (fixed)

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router) + TypeScript |
| UI | Tailwind; Odoo-like list/form (no component-kit dump) |
| Validation | Zod on server (and forms) |
| Auth | NextAuth.js Credentials + JWT/session cookie; role on session |
| ORM / DB | Prisma + PostgreSQL |
| Email (prod) | Resend (or nodemailer); skipped locally |
| Deploy | Vercel + Neon (or Supabase Postgres) |
| Local fallback | `docker-compose.yml` Postgres so the demo is not internet-dependent |

One repo, one deploy. All mutations in Route Handlers or server-only modules. Never trust client qty.

**Libraries to credit in README:** Next.js, React, TypeScript, Tailwind CSS, Prisma, NextAuth.js, Zod, PostgreSQL, bcryptjs (passwords), Resend (optional).

---

## 3. Domain model (technical moat)

Treat the database like Odoo `stock.location` / `stock.quant` / `stock.picking` / `stock.move`.

```mermaid
flowchart LR
  Product --> Quant
  Location --> Quant
  Picking --> Move
  Move --> Quant
  Move --> Ledger
```

```mermaid
stateDiagram-v2
  [*] --> draft: create
  draft --> waiting: confirm and stock short
  draft --> ready: confirm and stock ok
  waiting --> ready: stock becomes available / recheck
  ready --> done: validate
  draft --> canceled: cancel
  waiting --> canceled: cancel
  ready --> canceled: cancel
  done --> [*]
  canceled --> [*]
```

### Hard rules

1. The UI **never** writes `StockQuant` except through **Validate** (`validatePicking`).
2. Draft / waiting / ready documents change **nothing** on quants.
3. Cancel of **Done** is forbidden. Reverse with a new document (return receipt, reverse adjustment).
4. Product on-hand = `SUM(StockQuant.quantity)` where `Location.type = internal` (and `production` racks count as internal stock for the company if we type them `internal` — see locations).
5. Unique SKU. Qty > 0 on every line. Cannot validate empty lines. Cannot reduce a source quant below zero.
6. `StockMove` and `StockLedger` are insert-only. No update/delete from app code. Prisma: no `update` APIs exported for those models; optional DB grants later.
7. Quantities are `Decimal` (Prisma `Decimal`, 4 dp), never `Float`.

### Document states (PS-required)

`draft → waiting → ready → done | canceled`

| Action | Result |
| --- | --- |
| Create | `draft` |
| Confirm | Receipts/adjustments → `ready`. Deliveries/internals → `ready` if every line has source qty ≥ demand, else `waiting`. |
| Recheck (waiting) | Same availability test; manager/staff can click Confirm again after a receipt lands. |
| Pick / pack (deliveries only) | Flags on the picking; state stays `ready`. Validate blocked until both flags true. |
| Validate | `done`; apply quants + ledger |
| Cancel | Only if state ≠ `done` |

**Receipt shortcut (documented):** receipts may Confirm+Validate in two clicks from draft (source is unlimited supplier location). Still no silent quant write before Validate.

---

## 4. Prisma schema (field-level)

Enums: `Role`, `LocationType`, `PickingType`, `PickingState`, `PartnerType`, `AlertKind`.

### User

- `id`, `name`, `email` unique, `passwordHash`
- `role`: `inventory_manager` | `warehouse_staff`
- `createdAt`

### PasswordResetOtp

- `id`, `email`, `codeHash`, `expiresAt`, `consumedAt` nullable, `createdAt`
- Index on `email`

Demo: if `DEMO_OTP=123456` (local), accept that code without email. Prod: 6-digit random, 10 min TTL, hashed in DB.

### Warehouse

- `id`, `name`, `code` unique (e.g. `WH1`, `WH2`), `active`

### Location

- `id`, `name`, `completeName` (e.g. `WH1/Main Store`)
- `type`: `internal` | `supplier` | `customer` | `inventory_loss` | `production`
- `warehouseId` nullable (virtual locations: Partners/Vendors, Customers, Inventory Loss have no warehouse)
- Seed at least: **Main Store** (internal, WH1), **Production Rack** (internal or `production` but **counted in on-hand** — implement `production` as a location type that **is included** in company on-hand, same as internal), **WH2** stock loc, plus one `supplier`, one `customer`, one `inventory_loss`.

**On-hand rule (precise):** sum quants on locations where `type IN ('internal', 'production')`.

### Category, Uom

- Category: `name` unique
- Uom: `name`, `symbol` (kg, units)

### Partner

- `name`, `type`: `vendor` | `customer` | `both`
- Used on receipts (vendor) and deliveries (customer)

### Product

- `name`, `sku` unique, `categoryId`, `uomId`
- `minQty` Decimal (reorder rule)
- `active`
- **No `quantity` column.** On-hand is always computed from quants.

### StockQuant

- `productId`, `locationId`, `quantity` Decimal
- `@@unique([productId, locationId])`
- Default 0; rows may exist at 0 after full depletion (keep the row for simpler upsert)

### Picking

- `id`
- `name` — human ref, unique, generated: `IN/00001`, `OUT/00001`, `INT/00001`, `ADJ/00001` (sequence table or `max+1` in transaction)
- `type`: `receipt` | `delivery` | `internal` | `adjustment`
- `state`: `draft` | `waiting` | `ready` | `done` | `canceled`
- `warehouseId`
- `partnerId` nullable (required for receipt/delivery)
- `sourceLocationId` / `destLocationId` — document-level defaults; lines may override for internals
- `scheduledAt`, `validatedAt`, `validatedById`
- `picked` Boolean default false (deliveries)
- `packed` Boolean default false (deliveries)
- `reason` String nullable (**required** on adjustment validate)
- `notes`
- `createdById`, `createdAt`, `updatedAt`

### PickingLine

- `pickingId`, `productId`, `qty` Decimal
- `sourceLocationId`, `destLocationId`
- For **adjustment**: `qty` = **counted** on-hand at dest (the internal loc). Engine computes `delta = counted - systemQty`. If delta = 0, reject validate (“no difference”). Positive delta: loss loc → internal. Negative: internal → loss (qty = abs(delta)).

### StockMove (immutable executed line)

- `pickingId`, `productId`, `qty`, `sourceLocationId`, `destLocationId`
- `createdAt`
- One move per validated line (adjustments: one move for the delta)

### StockLedger (append-only audit)

- `occurredAt`
- `productId`, `fromLocationId`, `toLocationId`, `qty`
- `pickingId`, `pickingName` (denormalized ref for UI)
- `type` (copy picking type)
- `userId`, `reason` (adjustment / notes)
- Index: `(productId, occurredAt)`, `(fromLocationId)`, `(toLocationId)`, `(type)`

### Alert (stored cache, refreshed on validate)

- `productId` unique
- `kind`: `low_stock` | `out_of_stock`
- `onHand` (internal+production sum), `minQty`
- Delete row when on-hand > minQty
- Dashboard reads this table; product list can join or recompute. **Source of truth is still quants**; alerts are a cache.

### Sequence

- `PickingSequence`: `prefix` unique (`IN`, `OUT`, `INT`, `ADJ`), `nextNumber` Int  
  Increment inside the same transaction as picking create.

---

## 5. Stock engine

All stock writes go through `lib/stock/validatePicking.ts`. Confirm lives in `lib/stock/confirmPicking.ts` (state only). Cancel in `lib/stock/cancelPicking.ts` (state only).

### `confirmPicking(id)`

- Lock picking. Must be `draft` or `waiting`.
- Must have ≥ 1 line.
- Receipt / adjustment → `ready`.
- Delivery / internal → if all source quants ≥ line qty then `ready`, else `waiting`.
- Does not touch quants.

### `setPick` / `setPack` (delivery only)

- Must be `ready`. Sets `picked` / `packed`. No stock change.

### `validatePicking(id)` — single Postgres transaction

Use `prisma.$transaction` with isolation `Serializable` **or** `SELECT … FOR UPDATE` on picking and all related quants (`$queryRaw` or Prisma `find` then update with version — **prefer `FOR UPDATE`** on `StockQuant` rows + picking row).

1. Lock picking. Assert `state === 'ready'`. If delivery, assert `picked && packed`.
2. If adjustment, assert `reason` non-empty.
3. For each line: qty > 0, product exists, locations legal for type (table below).
4. Delivery / internal / outbound adjustment: source quant ≥ qty (create quant 0 if missing, then fail if still short).
5. Insert `StockMove` + `StockLedger`.
6. Decrement source quant, increment dest quant (upsert).
7. `state = done`, `validatedAt`, `validatedBy`.
8. Recompute alerts for every product on the picking.

**Legal locations**

| Type | Source | Dest |
| --- | --- | --- |
| Receipt | `supplier` | `internal` or `production` |
| Delivery | `internal` or `production` | `customer` |
| Internal | `internal` or `production` | other `internal` or `production`, same or different warehouse, **not equal** |
| Adjustment increase | `inventory_loss` | counted location |
| Adjustment decrease | counted location | `inventory_loss` |

### Opening stock on product create

If manager supplies initial qty + location: **do not** upsert quant. Create an `adjustment` picking (reason `Opening balance`), one line, auto-confirm + `validatePicking`. Ledger shows the opening.

### Error messages (show these verbatim in UI)

- `Cannot validate an empty document.`
- `Insufficient quantity for {sku} at {location} (have {have}, need {need}).`
- `Done documents cannot be canceled. Create a reverse document.`
- `SKU already exists.`
- `Quantity must be greater than zero.`
- `Adjustment requires a reason.`
- `Delivery must be picked and packed before validate.`
- `Staff cannot delete products or warehouses.`
- `Locations are not valid for this operation type.`

---

## 6. API map (App Router)

Session required except signup/login/forgot.

Prefix: `/api/...`

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/signup` | Creates `warehouse_staff` by default; seed creates manager. Optional: first user manager. **Decision: signup = staff; manager only via seed** so demo roles stay clear. |
| — | `/api/auth/[...nextauth]` | NextAuth |
| POST | `/api/auth/forgot` | Issue OTP |
| POST | `/api/auth/reset` | OTP + new password |
| GET | `/api/me` | Profile |
| PATCH | `/api/me` | Name |
| GET/POST | `/api/categories`, `/api/uoms`, `/api/partners` | Manager write; staff read |
| GET/POST | `/api/warehouses`, `/api/locations` | Settings; manager write |
| GET/POST | `/api/products` | List: `?q=` SKU/name, category |
| GET/PATCH/DELETE | `/api/products/[id]` | DELETE manager only |
| GET | `/api/products/[id]/quants` | Qty per location |
| GET | `/api/pickings?type=&state=&warehouseId=&locationId=&categoryId=` | |
| POST | `/api/pickings` | Body includes type + lines |
| GET/PATCH | `/api/pickings/[id]` | PATCH lines only in draft |
| POST | `/api/pickings/[id]/confirm` | |
| POST | `/api/pickings/[id]/pick` `/pack` | Delivery |
| POST | `/api/pickings/[id]/validate` | Engine |
| POST | `/api/pickings/[id]/cancel` | Manager for extra safety; staff may cancel own draft — **Decision: both roles can cancel non-done; only manager can cancel waiting/ready** (staff: draft only) |
| GET | `/api/ledger?productId=&locationId=&type=&from=&to=` | |
| GET | `/api/dashboard?warehouseId=&...` | KPI JSON |
| GET | `/api/alerts` | Low/out list |

CSRF: same-origin cookies + NextAuth; mutations require session.

---

## 7. Auth, roles, OTP

- NextAuth Credentials: email + password, bcrypt.
- Session callback attaches `id`, `role`, `name`.
- Middleware: unauthenticated → `/login`. Authenticated hitting `/login` → `/dashboard`.
- After login → dashboard (PS).
- **Manager:** master data, settings, delete product/warehouse, cancel waiting/ready.
- **Staff:** operate pickings; cannot delete products/warehouses; cannot open Settings write UI (read-only or hidden write).
- OTP: `forgot` stores hashed code, 10 min. Local `AUTH_DEMO_OTP=123456` always works for any email that exists. Prod sends email, demo OTP disabled unless env set.

Demo users (seed):

- `manager@stocksense.dev` / `StockSense!1` — manager
- `staff@stocksense.dev` / `StockSense!1` — staff

---

## 8. Feature map

### Must-have (PS)

- Auth: signup, login, session, OTP reset. After login → dashboard.
- Dashboard KPIs: total products with stock > 0, low stock, out of stock, pending receipts (`draft|waiting|ready` + type receipt), pending deliveries, scheduled internals. Live filters: document type, status, warehouse/location, category (filters apply to activity list + KPIs where they still make sense).
- Products: CRUD, SKU search, category, UoM, optional opening stock, **qty per location**, `minQty`.
- Receipts, deliveries (Pick → Pack → Validate), internals, adjustments.
- Move history / ledger with filters.
- Settings: warehouses + locations (Main Store, Production Rack, WH2).
- Profile + logout in left sidebar.

### Three extras only

1. **Operations Kanban** — columns Draft / Waiting / Ready / Done / Canceled. Cards link to form. No drag-to-done (would bypass validate).
2. **Shortage protection + low-stock banner** — validate cannot oversell; dashboard + product list badge when on-hand ≤ `minQty`.
3. **Printable picking slip** — `/operations/deliveries/[id]/print` with `print:` CSS (company, ref, customer, lines, source loc, qty). Browser print.

---

## 9. UX (PS mockup + Odoo visual language)

**Sidebar:** Dashboard, Products, Operations (Receipts, Deliveries, Transfers, Adjustments, Move History), Kanban (or under Operations), Settings, Profile, Logout.

**Pattern:** list (status pills, smart search) → form (header: reference, partner, warehouse, status; body: line table).

**Status colors:** Draft `#6B7280`, Waiting `#D97706`, Ready `#2563EB`, Done `#16A34A`, Canceled `#DC2626`.

**Chrome:** Odoo-like purple primary `#714B67`, light gray canvas `#F8F9FA`, white cards, 1px borders, compact tables, sticky form statusbar (Confirm / Validate / Cancel / Print).

**Empty states:** illustration/text + primary CTA (“Create receipt”).

**Responsive:** desktop-first for jury laptops; sidebar collapse on small screens.

**Role UX:** staff does not see Delete on products; Settings is view-only or hidden writes.

---

## 10. Seed data (screens never empty + live Steel story)

Seed **setup** so lists are not blank, but **Steel on-hand stays 0** so the live demo still starts at zero.

| Entity | Seed |
| --- | --- |
| Users | manager + staff |
| Warehouses | WH1, WH2 |
| Locations | Main Store, Production Rack, WH2/Stock, Vendors, Customers, Inventory Loss |
| UoM | kg, Units |
| Categories | Metals, Consumables |
| Partners | Steel Vendor, Demo Customer |
| Products | **Steel STL-001** kg min 20, **Gloves GLV-001** Units min 10 with **opening 50 at Main Store** (so dashboard/product list not empty) |
| Optional extra | 1 done receipt on Gloves so ledger has history before the live story |

**Live jury path (Steel only):** Receipt 100 kg (vendor → Main Store) → Transfer 100 Main Store → Production Rack → Deliver 20 (Production → customer) → Adjust −3 damaged at Production.

**End state:** Steel **77 kg at Production**, **0 at Main Store**; ledger ≥ 4 Steel rows; company Steel on-hand 77.

**Robustness:** new delivery qty 999 → error string above.

---

## 11. 3-minute pitch

| Time | Beat |
| --- | --- |
| 15s | Problem: Excel, no location truth, no audit |
| 10s | Dashboard KPIs |
| 40s | Receive 100 kg Steel — stock +100, ledger row |
| 30s | Transfer Main Store → Production — total same, locations change |
| 30s | Delivery 20 — pick/pack/validate, stock −20 |
| 20s | Adjustment 3 kg damaged — reason in ledger |
| 15s | Filters + low stock (raise min or show Gloves) |
| 10s | Close: every movement is in the ledger; stock is never edited by hand |

Backup: 3-minute screen recording if Wi-Fi dies.

Show **staff login** for 10s if time: no delete product.

---

## 12. Build order (do not invert)

Demo by hour 4 = phases 1–4 working (engine + auth shell + products + one receipt).

| Phase | Work | Branch |
| --- | --- | --- |
| 1 | Schema + seed + `validatePicking` + ledger; `npm run stock:smoke` | `stock-engine` |
| 2 | Auth + app shell + role gate | `auth` |
| 3 | Products list/form + location qty | `ui-ops` |
| 4 | Receipts E2E | `ui-ops` |
| 5 | Deliveries pick/pack + insufficient qty | `ui-ops` |
| 6 | Internal transfer | `ui-ops` |
| 7 | Adjustment | `ui-ops` |
| 8 | Dashboard KPIs + filters | `ui-ops` |
| 9 | Kanban + alerts banner + print slip | extras |
| 10 | OTP reset | `auth` |
| 11 | Deploy, README, pitch recording | main |

**Smoke script (`scripts/stock-smoke.ts`):** create receipt 100 Steel, validate, assert quant 100; transfer 100; deliver 20; adjust −3; assert 77; attempt oversell; assert throw. Run in CI/local after seed.

---

## 13. Repo layout

```
app/
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  (auth)/reset/page.tsx
  (app)/layout.tsx              # sidebar
  (app)/dashboard/page.tsx
  (app)/products/page.tsx
  (app)/products/[id]/page.tsx
  (app)/operations/receipts/...
  (app)/operations/deliveries/[id]/print/page.tsx
  (app)/operations/transfers/...
  (app)/operations/adjustments/...
  (app)/operations/history/page.tsx
  (app)/operations/kanban/page.tsx
  (app)/settings/page.tsx
  (app)/profile/page.tsx
  api/auth/[...nextauth]/route.ts
  api/.../route.ts
components/
  sidebar.tsx
  status-pill.tsx
  picking-form.tsx
  line-table.tsx
lib/
  auth.ts
  db.ts
  stock/validatePicking.ts
  stock/confirmPicking.ts
  stock/cancelPicking.ts
  stock/availability.ts
  stock/alerts.ts
  stock/errors.ts
  validators/*.ts
prisma/schema.prisma
prisma/seed.ts
scripts/stock-smoke.ts
docker-compose.yml
.env.example
PLAN.md
README.md
```

---

## 14. Env and scripts

`.env.example`:

```
DATABASE_URL=postgresql://stocksense:stocksense@localhost:5432/stocksense
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
AUTH_DEMO_OTP=123456
RESEND_API_KEY=
EMAIL_FROM=StockSense <noreply@localhost>
```

`docker-compose.yml`: Postgres 16, port 5432, volume.

package.json scripts:

- `db:up` — docker compose up -d
- `db:migrate` — prisma migrate dev
- `db:seed` — prisma db seed
- `db:reset` — migrate reset + seed (local only)
- `stock:smoke` — engine assertions

---

## 15. Testing and quality

- **Must:** `stock-smoke` covers Steel math + oversell.
- **Nice:** a few Vitest unit tests on availability helper.
- No e2e required for jury if smoke + live demo work.
- Prisma format + `tsc --noEmit` before deploy.

---

## 16. Deploy

- Neon Postgres + Vercel.
- Set env vars; `prisma migrate deploy` on build (`postinstall` or Vercel build command: `prisma generate && prisma migrate deploy && next build`).
- Seed once against prod (or a “Reset demo” manager action **out of scope** unless time — prefer documented seed on Neon SQL).
- Local Docker path documented first in README (offline demo).

---

## 17. Submission hygiene

- Branches from hour 0: `auth`, `stock-engine`, `ui-ops`.
- README: problem, architecture mermaid, how to run, demo credentials, library credits, demo OTP note.
- No copied template dumped as the product.

### Jury walk-up checklist

- [ ] Login works; two roles visibly different
- [ ] Steel story completes without errors
- [ ] Product form shows qty **per location**, not one number
- [ ] Ledger matches the four steps
- [ ] Dashboard numbers match the database after refresh
- [ ] Delivery qty 999 shows a clear validation error
- [ ] Print slip (if extra shipped)
- [ ] Backup recording on a phone/laptop

---

## 18. Decisions locked (no bikeshedding)

1. Not an Odoo module.
2. Signup creates **staff** only; manager is seeded.
3. `production` locations **count** toward on-hand.
4. Adjustments use **counted qty**; engine posts the delta vs `inventory_loss`.
5. Deliveries require pick **and** pack before validate.
6. Kanban does not drag across Done.
7. Alerts are a cache refreshed on validate.
8. Opening stock = real adjustment document.
9. No lots, no barcode, no ML, no mobile app.

---

## 19. Immediate next step

Prisma CLI/migrate + seed against Docker Postgres, `npm run stock:smoke`, then a live Steel walkthrough in the UI. README and deploy last. Track checkboxes in `STATUS.md`.
