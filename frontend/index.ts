/**
 * StockSense Frontend Architecture Gateway
 *
 * Houses all client-side UI, components, hooks, and API client interfaces:
 * - components: Reusable design tokens, buttons, cards, sidebar, tables, and search modal
 * - client: Type-safe fetch wrapper for Next.js API endpoints
 */

export * as Components from "./components";
export * from "@/lib/client";
