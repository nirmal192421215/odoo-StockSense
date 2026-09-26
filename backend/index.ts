/**
 * StockSense Backend Architecture Gateway
 *
 * Houses all server-side logic:
 * - engine: Core double-entry stock transactions, ledger recording, and availability rules
 * - db: Prisma client instance and database connection management
 * - validators: Zod input validation schemas for picking mutations and settings
 * - services: Authentication, serialization, HTTP helpers, and decimal math
 */

export * as Engine from "./engine";
export * as DB from "./db";
export * as Validators from "./validators";
export * as Services from "./services";
